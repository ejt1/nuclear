import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { defaultCombatTargeting as Combat } from "@/Targeting/CombatTargeting";
import Specialization from "@/Enums/Specialization";
import common from "@/Core/Common";
import Settings from "@/Core/Settings";
import { PowerType } from "@/Enums/PowerType";
import { pvpHelpers } from "@/Data/PVPData";
import drTracker from "@/Core/DRTracker";

const auras = {
  moonkinForm: 24858,
  solarEclipse: 48517,
  lunarEclipse: 48518,
  incarnationChosenOfElune: 102560,
  furyOfElune: 202770,
  sunfire: 164815,
  moonfire: 164812,
  bearForm: 5487,
  catForm: 768,
  prowl: 5215,
  barkskin: 22812,
  renewal: 108238,
  tigerDash: 252216,
  dash: 1850,
  stampedingRoar: 106898,
  entanglingRoots: 339,
  massEntanglement: 102359,
  cyclone: 33786,
  solarBeam: 78675,
  hibernate: 2637,
  removeCorruption: 2782,
  soothe: 2908,
  regrowth: 8936,
  forceOfNature: 205636,
  frenziedRegeneration: 22842,
  faerieSwarm: 209749,
};

export class DruidBalancePvP extends Behavior {
  name = "Druid (Balance) PvP";
  context = BehaviorContext.Any;
  specialization = Specialization.Druid.Balance;

  static settings = [
    {
      header: "Defensive Settings",
      options: [
        { type: "slider", uid: "BarkskinHealth", text: "Barkskin health threshold (%)", min: 30, max: 80, default: 60 },
        { type: "slider", uid: "BearFormHealth", text: "Bear Form health threshold (%)", min: 20, max: 60, default: 35 },
        { type: "slider", uid: "RenewalHealth", text: "Renewal health threshold (%)", min: 20, max: 60, default: 40 },
        { type: "checkbox", uid: "UseDefensiveCooldowns", text: "Use defensive cooldowns", default: true }
      ]
    },
    {
      header: "Crowd Control Settings",
      options: [
        { type: "checkbox", uid: "UseCyclone", text: "Use Cyclone on enemy healers", default: true },
        { type: "checkbox", uid: "UseMassEntanglement", text: "Use Mass Entanglement + Solar Beam combo", default: true },
        { type: "slider", uid: "CycloneMaxDR", text: "Max Cyclone DR stacks", min: 0, max: 2, default: 1 }
      ]
    }
  ];

  build() {
    return new bt.Selector(
      common.waitForNotWaitingForArenaToStart(),
      common.waitForNotSitting(),
      common.waitForNotMounted(),
      common.waitForCastOrChannel(),

      new bt.Decorator(
        req => !me.hasAura(auras.moonkinForm) && !me.hasAura(auras.bearForm) && !me.hasAura(auras.prowl),
        spell.cast("Moonkin Form")
      ),

      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(

          // Skip all combat actions if prowl is active
          new bt.Decorator(
            ret => me.hasAura(auras.prowl),
            new bt.Action(() => bt.Status.Success)
          ),

          // Defensive cooldowns
          this.defensiveCooldowns(),

          // Emergency healing
          spell.cast("Regrowth", on => this.findRegrowthTarget(), ret =>
            this.findRegrowthTarget() !== undefined
          ),

          // Stop casting and allow running away when in bear form and low health or low time to death
          new bt.Decorator(
            ret => me.hasAura(auras.bearForm) &&
                   (me.effectiveHealthPercent < 70 ||
                    (me.timeToDeath() !== undefined && me.timeToDeath() < 3)),
            new bt.Action(() => bt.Status.Success)
          ),

          // Spells that require target and/or facing
          common.waitForTarget(),

          // Faerie Swarm disarm on melee targets
          spell.cast("Faerie Swarm", on => this.findFaerieSwarmTarget(), ret =>
            this.findFaerieSwarmTarget() !== undefined
          ),

          // Cyclone enemy healers
          spell.cast("Cyclone", on => this.cycloneTarget(), ret =>
            this.cycloneTarget() !== undefined
          ),

          common.waitForFacing(),

          // Burst damage when conditions are met
          new bt.Decorator(
            ret => Combat.burstToggle && me.target,
            this.burstDamage()
          ),

          // Sustained damage rotation
          this.sustainedDamage()
        )
      )
    );
  }

  defensiveCooldowns() {
    return new bt.Selector(
      // Renewal for emergency healing
      spell.cast("Renewal", on => me, () =>
        Settings.UseDefensiveCooldowns &&
        me.effectiveHealthPercent <= Settings.RenewalHealth &&
        !spell.isOnCooldown("Renewal")
      ),

      // Bear Form for emergency defense
      spell.cast("Bear Form", () =>
        Settings.UseDefensiveCooldowns &&
        (me.effectiveHealthPercent <= Settings.BearFormHealth ||
         (me.timeToDeath() !== undefined && me.timeToDeath() < 3)) &&
        !me.hasAura(auras.bearForm)
      ),

      // Barkskin (can be used while stunned)
      spell.cast("Barkskin", on => me, () =>
        Settings.UseDefensiveCooldowns &&
        me.effectiveHealthPercent <= Settings.BarkskinHealth
      ),

      // Frenzied Regeneration when in Bear Form
      spell.cast("Frenzied Regeneration", () =>
        me.hasAura(auras.bearForm) &&
        me.effectiveHealthPercent < 80
      )
    );
  }

  // Burst Damage Rotation
  burstDamage() {
    return new bt.Selector(
      // Mass Entanglement + Solar Beam on enemy healer before burst
      spell.cast("Mass Entanglement", on => this.findMassEntanglementComboTarget(), ret =>
        this.findMassEntanglementComboTarget() !== undefined
      ),

      spell.cast("Solar Beam", on => this.findSolarBeamTarget(), ret =>
        this.findSolarBeamTarget() !== undefined
      ),

      // Major cooldowns
      spell.cast("Incarnation: Chosen of Elune", () =>
        !me.hasAura(auras.incarnationChosenOfElune)
      ),

      // Force of Nature for damage boost (use freely)
      spell.cast("Force of Nature", on => me.target, () => me.target),

      // Fury of Elune during incarnation
      spell.cast("Fury of Elune", () =>
        me.hasAura(auras.incarnationChosenOfElune)
      ),

      // Maintain DOTs on all targets for astral power generation
      this.maintainDots(),

      // Starsurge priority during incarnation
      spell.cast("Starsurge", on => me.target, () =>
        this.getAstralPower() >= 40
      ),

      // Generate Astral Power - prioritize Wrath
      spell.cast("Wrath", on => me.target)
    );
  }

  // Sustained Damage Rotation
  sustainedDamage() {
    return new bt.Selector(
      // Maintain DOTs on all targets for astral power generation
      this.maintainDots(),

      // Use Starfall to extend DOT duration by 3 seconds
      spell.cast("Starfall", on => me.target, () =>
        this.getAstralPower() >= 50
      ),

      // Use Fury of Elune off cooldown
      spell.cast("Fury of Elune", () => true),

      // Use Force of Nature for damage and astral power
      spell.cast("Force of Nature", on => me.target, () => me.target),

      // Use Starsurge when we have enough Astral Power
      spell.cast("Starsurge", on => me.target, () =>
        this.getAstralPower() >= 40
      ),

      // Default filler - prioritize Wrath over Starfire
      spell.cast("Wrath", on => me.target),

      // Starfire as last resort only
      spell.cast("Starfire", on => me.target)
    );
  }

  maintainDots() {
    return new bt.Selector(
      // Moonfire on all targets for astral power generation
      spell.cast("Moonfire", on => this.findMoonfireTarget(), ret =>
        this.findMoonfireTarget() !== undefined
      ),

      // Sunfire on kill target (spreads to nearby enemies within 8 yards)
      spell.cast("Sunfire", on => me.target, () =>
        me.target && (!me.target.hasAuraByMe(auras.sunfire) ||
        this.getDebuffRemainingTime(me.target, auras.sunfire) < 5000)
      )
    );
  }

  // Helper methods
  getAstralPower() {
    return me.powerByType(PowerType.LunarPower);
  }

  inEclipse() {
    return me.hasAura(auras.solarEclipse) || me.hasAura(auras.lunarEclipse);
  }

  inSolarEclipse() {
    return me.hasAura(auras.solarEclipse);
  }

  inLunarEclipse() {
    return me.hasAura(auras.lunarEclipse);
  }

  getDebuffRemainingTime(target, auraId) {
    if (!target) return 0;
    const debuff = target.getAuraByMe(auraId);
    return debuff ? debuff.remaining : 0;
  }


  // Targeting methods
  cycloneTarget() {
    // Get all enemy players within 30 yards and find the first valid healer target
    const nearbyEnemies = me.getPlayerEnemies(30);

    // Determine max DR based on current target's health
    const maxDR = (me.target && me.target.effectiveHealthPercent < 35) ? Settings.CycloneMaxDR + 1 : Settings.CycloneMaxDR;

    for (const unit of nearbyEnemies) {
      if (unit.isHealer() &&
          !unit.isCCd() &&
          unit.canCC() &&
          unit.getDR("disorient") <= maxDR &&
          unit !== me.target) { // Exclude current target
        return unit;
      }
    }

    return undefined;
  }

  findCycloneTarget() {
    if (spell.isOnCooldown("Cyclone")) return undefined;

    // Determine max DR based on current target's health
    const maxDR = (me.target && me.target.effectiveHealthPercent < 35) ? Settings.CycloneMaxDR + 1 : Settings.CycloneMaxDR;

    const enemies = me.getEnemies();
    for (const enemy of enemies) {
      if (enemy.isPlayer() &&
          enemy.isHealer() &&
          me.distanceTo(enemy) <= 30 &&
          me.withinLineOfSight(enemy) &&
          !enemy.isCCd() &&
          enemy.canCC() &&
          drTracker.getDRStacks(enemy.guid, "disorient") <= maxDR &&
          !pvpHelpers.hasImmunity(enemy) &&
          enemy !== me.target) { // Exclude current target
        return enemy;
      }
    }
    return undefined;
  }

  findMassEntanglementTarget() {
    if (spell.isOnCooldown("Mass Entanglement")) return undefined;

    const enemies = me.getEnemies();
    for (const enemy of enemies) {
      if (enemy.isPlayer() &&
          enemy.isHealer() &&
          me.distanceTo(enemy) <= 30 &&
          me.withinLineOfSight(enemy) &&
          !enemy.isCCd() &&
          enemy.canCC() &&
          !pvpHelpers.hasImmunity(enemy)) {
        return enemy;
      }
    }
    return undefined;
  }

  findMassEntanglementComboTarget() {
    if (spell.isOnCooldown("Mass Entanglement") || spell.isOnCooldown("Solar Beam")) return undefined;

    const enemies = me.getEnemies();
    for (const enemy of enemies) {
      if (enemy.isPlayer() &&
          enemy.isHealer() &&
          me.distanceTo(enemy) <= 30 &&
          me.withinLineOfSight(enemy) &&
          !enemy.isCCd() &&
          enemy.canCC() &&
          drTracker.getDRStacks(enemy.guid, "root") === 0 &&
          drTracker.getDRStacks(enemy.guid, "silence") === 0 &&
          !pvpHelpers.hasImmunity(enemy)) {
        return enemy;
      }
    }
    return undefined;
  }

  findSolarBeamTarget() {
    const enemies = me.getEnemies();
    for (const enemy of enemies) {
      if (enemy.isPlayer() &&
          enemy.isHealer() &&
          me.distanceTo(enemy) <= 40 &&
          me.withinLineOfSight(enemy) &&
          enemy.hasAura(auras.massEntanglement) &&
          drTracker.getDRStacks(enemy.guid, "silence") <= 1) {
        return enemy;
      }
    }
    return undefined;
  }

  findEnemyHealer() {
    const enemies = me.getEnemies();
    for (const enemy of enemies) {
      if (enemy.isPlayer() &&
          enemy.isHealer() &&
          me.distanceTo(enemy) <= 40 &&
          me.withinLineOfSight(enemy)) {
        return enemy;
      }
    }
    return undefined;
  }


  findRegrowthTarget() {
    // Emergency healing when healer is in trouble
    const friends = me.getFriends();
    for (const friend of friends) {
      if (friend.isPlayer() &&
          friend.isHealer() &&
          friend.effectiveHealthPercent < 40 &&
          me.distanceTo(friend) <= 40 &&
          me.withinLineOfSight(friend)) {
        return friend;
      }
    }
    return undefined;
  }

  findMoonfireTarget() {
    const enemies = me.getEnemies();

    // Prioritize current target if it doesn't have Moonfire
    if (me.target &&
        me.target.isPlayer() &&
        (!me.target.hasAuraByMe(auras.moonfire) ||
         this.getDebuffRemainingTime(me.target, auras.moonfire) < 6000) &&
        !pvpHelpers.hasImmunity(me.target)) {
      return me.target;
    }

    // Find any enemy without Moonfire
    for (const enemy of enemies) {
      if (enemy.isPlayer() &&
          me.distanceTo(enemy) <= 40 &&
          me.withinLineOfSight(enemy) &&
          (!enemy.hasAuraByMe(auras.moonfire) ||
           this.getDebuffRemainingTime(enemy, auras.moonfire) < 6000) &&
          !pvpHelpers.hasImmunity(enemy)) {
        return enemy;
      }
    }
    return undefined;
  }

  findFaerieSwarmTarget() {
    // Check if Faerie Swarm is known and not on cooldown
    if (!spell.isSpellKnown("Faerie Swarm") || spell.isOnCooldown("Faerie Swarm")) {
      return undefined;
    }

    // Check if someone in my group is below 70% health
    const groupNeedsHelp = this.hasGroupMemberBelowHealth(87);
    if (!groupNeedsHelp) {
      return undefined;
    }

    // Get all enemy players within 30 yards
    const enemies = me.getEnemies();
    for (const enemy of enemies) {
      if (enemy.isPlayer() &&
          enemy.isDisarmableMelee() &&
          me.distanceTo(enemy) <= 30 &&
          me.withinLineOfSight(enemy) &&
          enemy.getDR("disarm") === 0 &&
          !pvpHelpers.hasImmunity(enemy)) {
        return enemy;
      }
    }
    return undefined;
  }

  hasGroupMemberBelowHealth(threshold) {
    // Check if the player themselves is below threshold
    if (me.effectiveHealthPercent < threshold) {
      return true;
    }

    // Check group members
    const friends = me.getFriends();
    for (const friend of friends) {
      if (friend.isPlayer() &&
          friend.inMyGroup() &&
          friend.effectiveHealthPercent < threshold) {
        return true;
      }
    }
    return false;
  }
}

