import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { defaultHealTargeting as h } from "@/Targeting/HealTargeting";
import { DispelPriority } from "@/Data/Dispels";
import { WoWDispelType } from "@/Enums/Auras";
import { spellBlacklist } from "@/Data/PVPData";
import { pvpHelpers } from "@/Data/PVPData";
import drTracker from "@/Core/DRTracker";
import Settings from "@/Core/Settings";
import { PowerType } from "@/Enums/PowerType";

const auras = {
  painSuppression: 33206,
  powerOfTheDarkSide: 198068,
  shadowWordPain: 589,
  powerWordShield: 17,
  atonement: 194384,
  surgeOfLight: 114255,
  premonitionPiety: 428930,
  premonitionSolace: 428934,
  premonitionInsight: 428933,
  powerInfusion: 10060,
};

export class PriestDisciplinePvP extends Behavior {
  name = "Priest (Discipline) PVP";
  context = BehaviorContext.Any;
  specialization = Specialization.Priest.Discipline;

  // Define healTarget as a class property
  healTarget = null;

  static settings = [
    {
      header: "Enhanced PVP Features",
      options: [
        { type: "checkbox", uid: "UseAdvancedShadowWordDeath", text: "Use Advanced Shadow Word: Death (any enemy in range)", default: true },
        { type: "checkbox", uid: "UseFadeForReflectSpells", text: "Use Fade for pvpReflect spells", default: true },
        { type: "checkbox", uid: "UseSmartMindControl", text: "Use Smart Mind Control (enemy healer)", default: true },
        { type: "checkbox", uid: "UseMindControlDPS", text: "Mind Control enemy DPS with major cooldowns", default: false },
        { type: "checkbox", uid: "UseVoidTendrils", text: "Use Void Tendrils when 2+ enemies nearby", default: true },
        { type: "checkbox", uid: "UseAutoPowerInfusion", text: "Auto Power Infusion friends with major cooldowns", default: true }
      ]
    },
    {
      header: "Mind Control Conditions",
      options: [
        { type: "slider", uid: "MindControlHealthThreshold", text: "All friends must be above % health (healer MC)", min: 70, max: 95, default: 80 },
        { type: "slider", uid: "MindControlMaxDR", text: "Max Disorient DR on enemy healer", min: 0, max: 2, default: 1 },
        { type: "slider", uid: "MindControlDPSHealthThreshold", text: "All friends must be above % health (DPS MC)", min: 60, max: 90, default: 70 }
      ]
    },
    {
      header: "Power Infusion Settings",
      options: [
        { type: "slider", uid: "PowerInfusionMinDuration", text: "Minimum cooldown duration (seconds)", min: 3, max: 15, default: 5 },
        { type: "checkbox", uid: "PowerInfusionPrioritizeDPS", text: "Prioritize DPS classes over healers", default: true }
      ]
    }
  ];

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForNotWaitingForArenaToStart(),
        common.waitForNotSitting(),
        common.waitForNotMounted(),
        common.waitForCastOrChannel(),
        this.waitForNotJustCastPenitence(),

        spell.cast("Psychic Scream", on => this.psychicScreamTarget(), ret => this.psychicScreamTarget() !== undefined),

        // Healing rotation (doesn't need enemy target/facing)
        this.healRotation(),
        this.applyAtonement(),

        // Spells that require target and/or facing
        common.waitForTarget(),
        common.waitForFacing(),
        this.targetedDamageRotation()
      )
    );
  }

  waitForNotJustCastPenitence() {
    return new bt.Action(() => {
      let lastCastPenitence = spell.getTimeSinceLastCast("Ultimate Penitence");
      if (lastCastPenitence < 400) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
  }

  applyAtonement() {
    return new bt.Selector(
      spell.cast("Power Word: Shield", on => this.findFriendWithoutAtonement(), ret => this.findFriendWithoutAtonement() !== undefined),
      spell.cast("Renew", on => this.findFriendWithoutAtonement(), ret => this.findFriendWithoutAtonement() !== undefined)
    );
  }

  healRotation() {
    return new bt.Selector(
      new bt.Action(() => {
        this.healTarget = h.getPriorityPVPHealTarget();
        return bt.Status.Failure; // Proceed to next child
      }),
      spell.cast("Power Word: Life", on => this.healTarget, ret => this.healTarget?.effectiveHealthPercent < 50),
      spell.cast("Desperate Prayer", on => me, ret => me.effectiveHealthPercent < 40),
      spell.cast("Pain Suppression", on => this.healTarget, ret => this.shouldCastWithHealthAndNotPainSupp(this.healTarget, 34)),
      spell.cast("Void Shift", on => this.healTarget, ret => this.shouldCastWithHealthAndNotPainSupp(this.healTarget, 24)),
      spell.cast("Mass Dispel", on => this.findMassDispelTarget(), ret => this.findMassDispelTarget() !== undefined),
      spell.cast("Premonition", on => me, ret => this.shouldCastPremonition(this.healTarget)),
      spell.cast("Evangelism", on => me, ret => me.inCombat() && (
        (this.getAtonementCount() > 3 && this.minAtonementDuration() < 4000)
        || (this.healTarget && this.healTarget.hasAura(auras.atonement) && this.healTarget.effectiveHealthPercent < 40))
      ),
      this.noFacingSpellsImportant(),
      spell.cast("Power Word: Barrier", on => this.healTarget, ret => this.shouldCastWithHealthAndNotPainSupp(this.healTarget, 45)),
      spell.cast("Power Word: Shield", on => this.healTarget, ret => this.healTarget?.effectiveHealthPercent < 89 && !this.hasShield(this.healTarget)),
      spell.cast("Power Word: Radiance", on => this.healTarget, ret => this.shouldCastRadiance(this.healTarget, 2)),
      spell.cast("Flash Heal", on => this.healTarget, ret => this.healTarget?.effectiveHealthPercent < 85 && me.hasAura(auras.surgeOfLight)),
      spell.dispel("Purify", true, DispelPriority.High, true, WoWDispelType.Magic),
      spell.dispel("Dispel Magic", false, DispelPriority.High, true, WoWDispelType.Magic),
      spell.cast("Penance", on => this.healTarget, ret => this.healTarget?.effectiveHealthPercent < 69),
      spell.cast("Power Word: Radiance", on => this.healTarget, ret => this.shouldCastRadiance(this.healTarget, 1)),
      spell.cast("Penance", on => this.healTarget, ret => this.healTarget?.effectiveHealthPercent < 79),
      spell.cast("Flash Heal", on => this.healTarget, ret => this.healTarget?.effectiveHealthPercent < 55),
      spell.dispel("Purify", true, DispelPriority.Medium, true, WoWDispelType.Magic),
      spell.dispel("Dispel Magic", false, DispelPriority.Medium, true, WoWDispelType.Magic),
      this.noFacingSpells()
    );
  }

  noFacingSpellsImportant() {
    return new bt.Selector(
      spell.cast("Shadow Word: Death", on => this.findAdvancedShadowWordDeathTarget(), ret =>
        Settings.UseAdvancedShadowWordDeath === true && this.findAdvancedShadowWordDeathTarget() !== undefined
      ),
      spell.cast("Fade", () => Settings.UseFadeForReflectSpells === true && this.shouldUseFadeForReflectSpells()),
      spell.cast("Power Infusion", on => this.findPowerInfusionTarget(), ret =>
        Settings.UseAutoPowerInfusion === true && this.findPowerInfusionTarget() !== undefined
      ),
      spell.cast("Void Tendrils", () => Settings.UseVoidTendrils === true && this.shouldUseVoidTendrils())
    );
  }

  noFacingSpells() {
    return new bt.Selector(
      spell.cast("Mind Control", on => this.findMindControlTarget(), ret =>
        Settings.UseSmartMindControl === true && this.findMindControlTarget() !== undefined
      ),
      spell.cast("Mind Control", on => this.findMindControlDPSTarget(), ret =>
        Settings.UseMindControlDPS === true && this.findMindControlDPSTarget() !== undefined
      ),
      spell.cast("Shadowfiend", on => me.targetUnit, ret => me.pctPowerByType(PowerType.Mana) < 90),
      spell.cast("Shadow Word: Pain", on => this.findShadowWordPainTarget(), ret => this.findShadowWordPainTarget() !== undefined)
    );
  }

  targetedDamageRotation() {
    return new bt.Selector(
      // Spells that require target and/or facing
      spell.cast("Mindgames", on => me.targetUnit, ret => me.targetUnit?.effectiveHealthPercent < 50),
      spell.cast("Penance", on => me.targetUnit, ret => me.hasAura(auras.powerOfTheDarkSide)),
      spell.cast("Shadowfiend", on => me.targetUnit, ret => me.pctPowerByType(PowerType.Mana) < 90),
      spell.cast("Mind Blast", on => me.targetUnit, ret => true),
      spell.cast("Smite", on => me.targetUnit, ret => me.pctPower > 30),
    );
  }

  findFriendWithoutAtonement() {
    const friends = me.getFriends();
    for (const friend of friends) {
      if (this.isNotDeadAndInLineOfSight(friend) && !this.hasAtonement(friend)) {
        return friend;
      }
    }
    return undefined;
  }

  findMassDispelTarget() {
    const enemies = me.getEnemies();
    for (const enemy of enemies) {
      if (enemy.hasAura("Ice Block") || enemy.hasAura("Divine Shield")) {
        return enemy;
      }
    }
    return undefined;
  }

  shouldCastPremonition(target) {
    if (!target) {
      return false;
    }
    if (me.hasAura(auras.premonitionInsight) || me.hasAura(auras.premonitionSolace) || me.hasAura(auras.premonitionPiety)) {
      return false;
    }
    return target.effectiveHealthPercent < 50 || target.timeToDeath() < 3;
  }

  hasAtonement(target) {
    return target?.hasAuraByMe(auras.atonement) || false;
  }

  hasShield(target) {
    return target?.hasAuraByMe(auras.powerWordShield) || false;
  }

  hasShadowWordPain(target) {
    return target?.hasAura(auras.shadowWordPain) || false;
  }

  shouldCastWithHealthAndNotPainSupp(target, health) {
    if (!target) {
      return false;
    }
    if (target.hasAura("Ice Block") || target.hasAura("Divine Shield")) {
      return false;
    }
    return (target.effectiveHealthPercent < health || target.timeToDeath() < 3) && !target.hasAuraByMe(auras.painSuppression);
  }

  shouldCastRadiance(target, charges) {
    if (!target) {
      return false;
    }
    return target.effectiveHealthPercent < 75 && spell.getCharges("Power Word: Radiance") === charges;
  }

  isNotDeadAndInLineOfSight(friend) {
    return friend && !friend.deadOrGhost && me.withinLineOfSight(friend);
  }

  getAtonementCount() {
    return h.friends.All.filter(friend => this.hasAtonement(friend)).length;
  }

  minAtonementDuration() {
    let minDuration = Infinity;
    for (const friend of h.friends.All) {
      if (this.hasAtonement(friend)) {
        const duration = friend.getAuraByMe(auras.atonement).remaining;
        if (duration < minDuration) {
          minDuration = duration;
        }
      }
    }
    return minDuration === Infinity ? 0 : minDuration;
  }

  findShadowWordPainTarget() {
    // Shadow Word: Pain doesn't require facing but needs LOS
    const enemies = me.getEnemies();

    // Prioritize current target if it doesn't have SW:P and isn't immune
    if (me.targetUnit &&
        me.targetUnit.isPlayer() &&
        !this.hasShadowWordPain(me.targetUnit) &&
        !pvpHelpers.hasImmunity(me.targetUnit) &&
        me.distanceTo(me.targetUnit) <= 40 &&
        me.withinLineOfSight(me.targetUnit)) {
      return me.targetUnit;
    }

    // Find any enemy without Shadow Word: Pain
    for (const enemy of enemies) {
      if (enemy.isPlayer() &&
          me.distanceTo(enemy) <= 40 &&
          me.withinLineOfSight(enemy) &&
          !this.hasShadowWordPain(enemy) &&
          !pvpHelpers.hasImmunity(enemy)) {
        return enemy;
      }
    }

    return undefined;
  }

  psychicScreamTarget() {
    // Psychic Scream (Fear) doesn't require facing but needs LOS
    const enemies = me.getEnemies();

    for (const unit of enemies) {
      if (unit.isPlayer() &&
          unit.isHealer() &&
          me.distanceTo(unit) <= 8 &&
          me.withinLineOfSight(unit) &&
          !unit.isCCd() &&
          unit.canCC() &&
          !pvpHelpers.hasImmunity(unit) &&
          drTracker.getDRStacks(unit.guid, "disorient") === 0) {
        return unit;
      }
    }

    return undefined;
  }

  // Enhanced PVP Methods

  findPowerInfusionTarget() {
    // Check cooldown first
    if (spell.isOnCooldown("Power Infusion")) {
      return undefined;
    }

    const friends = me.getFriends();
    let bestTarget = null;
    let bestPriority = 0;

    for (const friend of friends) {
      if (!friend.isPlayer() ||
          me.distanceTo(friend) > 40 ||
          !me.withinLineOfSight(friend) ||
          friend.hasAura(auras.powerInfusion)) { // Don't double-buff
        continue;
      }

      const majorCooldown = pvpHelpers.hasMajorDamageCooldown(friend, Settings.PowerInfusionMinDuration);
      if (!majorCooldown) {
        continue;
      }

      // Calculate priority based on class role and cooldown duration
      let priority = 0;

      // Higher priority for DPS classes (configurable)
      if (Settings.PowerInfusionPrioritizeDPS === true) {
        if (!friend.isHealer()) { // Consider non-healers as damage classes
          priority += 100;
        } else if (friend.isHealer()) {
          priority += 50; // Support healers too, but lower priority
        }
      } else {
        // Equal priority for all classes
        priority += 75; // All player classes get equal priority
      }

      // Bonus for longer duration cooldowns
      if (majorCooldown.remainingTime > 8) {
        priority += 50;
      } else if (majorCooldown.remainingTime > 5) {
        priority += 25;
      }

      // Bonus for low health (help them survive burst)
      if (friend.effectiveHealthPercent < 60) {
        priority += 30;
      }

      // Check if they have multiple major cooldowns (even better target)
      const allMajorCDs = this.countMajorCooldowns(friend);
      if (allMajorCDs > 1) {
        priority += 25 * (allMajorCDs - 1);
      }

      if (priority > bestPriority) {
        bestPriority = priority;
        bestTarget = friend;
      }
    }

    if (bestTarget) {
      const majorCooldown = pvpHelpers.hasMajorDamageCooldown(bestTarget, 3);
      console.log(`[Priest] Power Infusion on ${bestTarget.unsafeName} with ${majorCooldown.name} (${majorCooldown.remainingTime.toFixed(1)}s remaining)`);
    }

    return bestTarget;
  }

  countMajorCooldowns(unit) {
    let count = 0;
    // This is a simplified count - you could enhance this to check for specific buff combinations
    if (pvpHelpers.hasMajorDamageCooldown(unit, Settings.PowerInfusionMinDuration)) {
      count++;
      // You could add more specific checks here for different types of cooldowns
    }
    return count;
  }

  shouldUseFadeForReflectSpells() {
    // Check if Shadow Word: Death is available
    if (spell.isOnCooldown("Fade")) {
      return false;
    }
    const swdCooldown = spell.getCooldown("Shadow Word: Death");
    const swdReady = swdCooldown && swdCooldown.ready;

    // Check all enemies for incoming spells
    const enemies = me.getEnemies();
    for (const enemy of enemies) {
      if (enemy.isCastingOrChanneling &&
          enemy.isPlayer() &&
          me.distanceTo(enemy) <= 40 &&
          me.withinLineOfSight(enemy)) {
        const spellInfo = enemy.spellInfo;
        const target = spellInfo ? spellInfo.spellTargetGuid : null;
        if (enemy.spellInfo && target && target.equals(me.guid)) {
          const spellId = enemy.spellInfo.spellCastId;

          // Check if spell should be reflected using pvpReflect data
          if (pvpHelpers.shouldReflectSpell && pvpHelpers.shouldReflectSpell(spellId)) {
            const castRemains = enemy.spellInfo.castEnd - wow.frameTime;

            // Use Fade if less than 1s left on cast
            if (castRemains < 1000) {
              // If Shadow Word: Death is ready, only use Fade on reflect spells that are NOT blacklisted
              // (let SW:D handle the blacklist spells instead of wasting Fade)
              if (swdReady) {
                const isBlacklistedSpell = spellBlacklist[spellId];
                if (isBlacklistedSpell) {
                  console.log(`[Priest] Not using Fade for ${spellId} from ${enemy.unsafeName} - SW:D ready for blacklist spell`);
                  continue; // Skip this spell, let SW:D handle it
                }
              }

              console.log(`[Priest] Using Fade for reflect spell ${spellId} from ${enemy.unsafeName} (SW:D ready: ${swdReady})`);
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  shouldUseVoidTendrils() {
    // Check cooldown first
    if (spell.isOnCooldown("Void Tendrils")) {
      return false;
    }

    // Void Tendrils doesn't require facing but needs LOS
    const enemies = me.getEnemies();
    const eligibleEnemies = enemies.filter(enemy =>
      enemy.isPlayer() &&
      me.distanceTo(enemy) <= 8 &&
      me.withinLineOfSight(enemy) &&
      !pvpHelpers.hasImmunity(enemy)
    );

    if (eligibleEnemies.length >= 2) {
      console.log(`[Priest] Using Void Tendrils - ${eligibleEnemies.length} enemies within 8 yards`);
      return true;
    }
    return false;
  }

  findMindControlTarget() {
    // Check cooldown first
    if (spell.isOnCooldown("Mind Control")) {
      return undefined;
    }

    // Check if a friend has major CDs up
    const friendsWithCDs = this.getFriendsWithMajorCDs();
    if (friendsWithCDs.length === 0) {
      return undefined;
    }

    // Check if enemy team does not have major CDs
    const enemiesWithCDs = this.getEnemiesWithMajorCDs();
    if (enemiesWithCDs.length > 0) {
      return undefined;
    }

    // Check if all friendly players are above health threshold
    if (!this.allFriendsAboveHealthThreshold()) {
      return undefined;
    }

    // Mind Control doesn't require facing but needs LOS
    const enemies = me.getEnemies();
    for (const enemy of enemies) {
      if (enemy.isPlayer() &&
          enemy.isHealer() &&
          me.distanceTo(enemy) <= 30 &&
          me.withinLineOfSight(enemy) &&
          !enemy.isCCd() &&
          enemy.canCC() &&
          drTracker.getDRStacks(enemy.guid, "disorient") <= Settings.MindControlMaxDR &&
          !pvpHelpers.hasImmunity(enemy)) {

        console.log(`[Priest] Mind Control conditions met - targeting ${enemy.unsafeName}`);
        return enemy;
      }
    }
    return null;
  }

  findMindControlDPSTarget() {
    // Check if the setting is enabled first
    if (Settings.UseMindControlDPS !== true) {
      return undefined;
    }

    // Check cooldown first
    if (spell.isOnCooldown("Mind Control")) {
      return undefined;
    }

    // Check if all friendly players are above DPS threshold
    if (!this.allFriendsAboveDPSThreshold()) {
      return undefined;
    }

    // Mind Control enemy DPS with major cooldowns - doesn't require facing but needs LOS
    const enemies = me.getEnemies();
    for (const enemy of enemies) {
      if (enemy.isPlayer() &&
          !enemy.isHealer() && // Target non-healers (DPS/Tanks)
          me.distanceTo(enemy) <= 30 &&
          me.withinLineOfSight(enemy) &&
          !enemy.isCCd() &&
          enemy.canCC() &&
          drTracker.getDRStacks(enemy.guid, "disorient") <= Settings.MindControlMaxDR &&
          !pvpHelpers.hasImmunity(enemy)) {

        // Check if this enemy has major cooldowns active
        const majorCooldown = pvpHelpers.hasMajorDamageCooldown(enemy, 3);
        if (majorCooldown) {
          console.log(`[Priest] Mind Control DPS conditions met - targeting ${enemy.unsafeName} with major CD`);
          return enemy;
        }
      }
    }
    return null;
  }

  findAdvancedShadowWordDeathTarget() {
    // Check cooldown first
    if (spell.isOnCooldown("Shadow Word: Death")) {
      return undefined;
    }

    // Shadow Word: Death doesn't require facing but needs LOS
    const enemies = me.getEnemies();

    // First priority: Anyone casting spellBlacklist spells on us
    for (const enemy of enemies) {
      if (enemy.isCastingOrChanneling &&
          enemy.isPlayer() &&
          me.distanceTo(enemy) <= 46 &&
          me.withinLineOfSight(enemy) &&
          !pvpHelpers.hasImmunity(enemy)) {
        const spellInfo = enemy.spellInfo;
        const target = spellInfo ? spellInfo.spellTargetGuid : null;
        if (enemy.spellInfo && target && target.equals(me.guid)) {
          const onBlacklist = spellBlacklist[enemy.spellInfo.spellCastId];
          const castRemains = enemy.spellInfo.castEnd - wow.frameTime;
          if (onBlacklist && castRemains < 1000) {
            console.log(`[Priest] Shadow Word: Death interrupt on ${enemy.unsafeName} casting ${enemy.spellInfo.spellCastId}`);
            return enemy;
          }
        }
      }
    }

    // Second priority: Low health enemies (execute)
    for (const enemy of enemies) {
      if (enemy.isPlayer() &&
          enemy.effectiveHealthPercent < 20 &&
          me.distanceTo(enemy) <= 40 &&
          me.withinLineOfSight(enemy) &&
          !pvpHelpers.hasImmunity(enemy)) {
        return enemy;
      }
    }

    return null;
  }

  getFriendsWithMajorCDs() {
    // Major cooldowns detection with LOS check
    const friends = me.getFriends();
    const friendsWithCDs = [];

    for (const friend of friends) {
      if (friend.isPlayer() &&
          me.distanceTo(friend) <= 40 &&
          me.withinLineOfSight(friend)) {
        const majorCooldown = pvpHelpers.hasMajorDamageCooldown(friend, 3);
        if (majorCooldown) {
          friendsWithCDs.push(friend);
        }
      }
    }
    return friendsWithCDs;
  }

  getEnemiesWithMajorCDs() {
    // Major cooldowns detection with LOS check
    const enemies = me.getEnemies();
    const enemiesWithCDs = [];

    for (const enemy of enemies) {
      if (enemy.isPlayer() &&
          me.distanceTo(enemy) <= 40 &&
          me.withinLineOfSight(enemy)) {
        const majorCooldown = pvpHelpers.hasMajorDamageCooldown(enemy, 3);
        if (majorCooldown) {
          enemiesWithCDs.push(enemy);
        }
      }
    }
    return enemiesWithCDs;
  }

  allFriendsAboveHealthThreshold() {
    // Health checking with LOS requirement
    const friends = me.getFriends();
    for (const friend of friends) {
      if (friend.isPlayer() &&
          me.distanceTo(friend) <= 40 &&
          me.withinLineOfSight(friend) &&
          friend.effectiveHealthPercent < Settings.MindControlHealthThreshold) {
        return false;
      }
    }
    return true;
  }

  allFriendsAboveDPSThreshold() {
    // Health checking for DPS Mind Control with LOS requirement
    const friends = me.getFriends();
    for (const friend of friends) {
      if (friend.isPlayer() &&
          me.distanceTo(friend) <= 40 &&
          me.withinLineOfSight(friend) &&
          friend.effectiveHealthPercent < Settings.MindControlDPSHealthThreshold) {
        return false;
      }
    }
    return true;
  }
}

