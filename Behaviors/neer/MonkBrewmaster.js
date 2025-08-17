import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { MovementFlags } from "@/Enums/Flags";
import { DispelPriority } from "@/Data/Dispels";
import { WoWDispelType } from "@/Enums/Auras";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";
import { defaultHealTargeting as heal } from "@/Targeting/HealTargeting";
import Settings from "@/Core/Settings";
import { Classification } from "@/Enums/UnitEnums";

const auras = {
  rjw: 116847,
  freeVivify: 392883,
  healingSphere: 224863
}

export class MonkBrewmasterBehavior extends Behavior {
  name = "Monk [Brewmaster]";
  context = BehaviorContext.Any;
  specialization = Specialization.Monk.Brewmaster;
  static settings = [
    {
      header: "General",
      options: [
        { type: "checkbox", uid: "BrewmasterUseProvoke", text: "Use Provoke", default: false },
        { type: "checkbox", uid: "BrewmasterBlackOxBrewLogic", text: "Black Ox Brew Logic", default: false },
      ]
    },
    {
      header: "Defensives",
      options: [
        { type: "slider", uid: "BrewmasterCelestialInfusionPercent", text: "Celestial Infusion Percent", min: 0, max: 100, default: 80 },
        { type: "slider", uid: "BrewmasterFortfyingBrewPercent", text: "Fortifying Brew Percent", min: 0, max: 100, default: 50 },
        { type: "slider", uid: "BrewmasterExpelHarmPercent", text: "Expel Harm Percent", min: 0, max: 100, default: 60 },
        { type: "slider", uid: "BrewmasterExpelHarmSphereCount", text: "Expel Harm Sphere Count", min: 0, max: 10, default: 4 },
        { type: "checkbox", uid: "BrewmasterDiffuseMagicLogic", text: "Diffuse Magic Logic", default: false },
        { type: "checkbox", uid: "BrewmasterPurifyingBrewLogic", text: "Purifying Brew Logic", default: false },
      ]
    },
    {
      header: "Healing",
      options: [
        { type: "slider", uid: "BrewmasterVivifySelfPercent", text: "[Proc] Vivify Self Percent", min: 0, max: 100, default: 0 },
        { type: "slider", uid: "BrewmasterVivifyFriendPercent", text: "[Proc] Vivify Friend Percent", min: 0, max: 100, default: 0 },
      ]
    },
    {
      header: "Utility",
      options: [
      ]
    }
  ];

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForCastOrChannel(),
      this.interruptRotation(),
      this.tauntRotation(),
      this.defensiveRotation(),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          this.healingRotation(),
          common.waitForTarget(),
          this.mainTankingRotation(),
          this.damageRotation()
        )
      )
    );
  }

  interruptRotation() {
    return new bt.Selector(
      spell.interrupt("Spear Hand Strike")
    );
  }

  tauntRotation() {
    return new bt.Selector(
      spell.cast("Provoke", on => this.findTauntTarget(), req => Settings.BrewmasterUseProvoke)
    );
  }

  defensiveRotation() {
    return new bt.Selector(
      spell.cast("Diffuse Magic", on => me, req => this.hasEnemiesCastingOnMe() && Settings.BrewmasterDiffuseMagicLogic),
      spell.cast("Fortifying Brew", on => me, req => me.effectiveHealthPercent <= Settings.BrewmasterFortfyingBrewPercent && this.isInDanger()),
      spell.cast("Purifying Brew", on => me, req => this.shouldUsePurifyingBrew() && Settings.BrewmasterPurifyingBrewLogic),
      spell.cast("Black Ox Brew", on => me, req => this.shouldUseBlackOxBrew() && Settings.BrewmasterBlackOxBrewLogic)
    );
  }

  healingRotation() {
    return new bt.Selector(
      spell.cast("Vivify", on => {
        if (!me.hasAura(auras.freeVivify)) return undefined;
        
        if (me.effectiveHealthPercent < Settings.BrewmasterVivifySelfPercent) {
          return me;
        }
        
        const target = heal.priorityList[0];
        return target && target.effectiveHealthPercent < Settings.BrewmasterVivifyFriendPercent ? target : undefined;
      })
    );
  }

  // Spells that you need to use to keep up defensives or some shit
  mainTankingRotation() {
    return new bt.Selector(
      spell.cast("Celestial Infusion", on => me, req => me.effectiveHealthPercent <= Settings.BrewmasterCelestialInfusionPercent && this.isInDanger()),
      spell.cast("Expel Harm", on => me, req => this.shouldUseExpelHarm())
    );
  }

  damageRotation() {
    return new bt.Selector(
      common.ensureAutoAttack(),
      spell.cast("Weapons of Order", req => me.targetUnit?.classification == Classification.Boss),
      spell.cast("Rising Sun Kick", on => this.findMeleeTarget()),
      spell.cast("Rushing Jade Wind", on => me, req => {
        const rjw = me.getAura(auras.rjw)
        return (rjw == undefined || rjw.remaining < 1500) && (combat.targets.length > 1 || combat.getUnitsAroundUnit(me.targetUnit, 10).length > 1)
      }),
      spell.cast("Keg Smash"),
      spell.cast("Exploding Keg", req => !me.isMoving()),
      spell.cast("Touch of Death", on => combat.targets.find(unit => unit.health < me.health), { skipUsableCheck: true }),
      spell.cast("Blackout Kick", on => this.findMeleeTarget()),
      spell.cast("Tiger Palm", on => this.findMeleeTarget(), req => me.pctPower >= 40 || this.noKegIncoming())
    );
  }

  findTauntTarget() {
    return combat.targets.find(unit => unit.inCombat() && unit.target && !unit.isTanking());
  }

  isInDanger() {
    return combat.targets.find(unit => unit.isTanking());
  }

  hasEnemiesCastingOnMe() {
    const enemiesCasting = combat.targets.filter(enemy => {
      if (enemy.isCastingOrChanneling && enemy.spellInfo) {
        const target = enemy.spellInfo.spellTargetGuid;
        if (target && target.equals(me.guid)) {
          const castRemains = enemy.spellInfo.castEnd - wow.frameTime;
          return castRemains < 1500;
        }
      }
      return false;
    });
    return enemiesCasting.length > 1;
  }

    shouldUseExpelHarm() {
    const healthThreshold = me.effectiveHealthPercent <= Settings.BrewmasterExpelHarmPercent;
    const inDanger = this.isInDanger();
    const hasEnoughSpheres = me.getAura(auras.healingSphere)?.stacks >= Settings.BrewmasterExpelHarmSphereCount;
 
    return healthThreshold && inDanger && hasEnoughSpheres;
  }

  shouldUsePurifyingBrew() {
    const charges = spell.getCharges("Purifying Brew");
    const hasModerateStagger = me.hasAura("Moderate Stagger");
    const hasHeavyStagger = me.hasAura("Heavy Stagger");

    if (charges === 2) {
      return hasModerateStagger || hasHeavyStagger;
    } else if (charges === 1) {
      return hasHeavyStagger;
    }
    
    return false;
  }

  shouldUseBlackOxBrew() {
    const infusinCD = spell.getCooldown("Celestial Infusion").timeleft;
    const purifyCharges = spell.getCharges("Purifying Brew");
    const energy = me.pctPower;

    return infusinCD > 2000 && purifyCharges == 0 && energy < 90;
  }

  noKegIncoming() {
    const kegCharges = spell.getCharges("Keg Smash");
    const kegCD = spell.getCooldown("Keg Smash").timeleft;

    return kegCharges == 0 && kegCD > 2000;
  }

  findMeleeTarget() {
    return combat.targets.filter(unit => me.isWithinMeleeRange(unit)).sort((a, b) => a.health - b.health)[0];
  }
}
