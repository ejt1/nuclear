import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { MovementFlags } from "@/Enums/Flags";
import { DispelPriority } from "@/Data/Dispels";
import { WoWDispelType } from "@/Enums/Auras";
import { PowerType } from "@/Enums/PowerType";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";
import { defaultHealTargeting as heal } from "@/Targeting/HealTargeting";
import Settings from "@/Core/Settings";
import EvokerCommon from "@/Behaviors/Nuclear/Retail/Evoker/EvokerCommon";

const auras = {
  reversion: 366155,
  echo: 364343,
  essenceBurst: 369299,
  blessingOfTheBronze: 381748
};

export class EvokerPreservationBehavior extends Behavior {
  name = "PVP Preservation Evoker";
  context = BehaviorContext.Any;
  specialization = Specialization.Evoker.Preservation;
  version = wow.GameVersion.Retail;
  static settings = [
    {
      header: "Single Target Healing",
      options: [
        {
          type: "slider",
          uid: "PVPEvokerPreservationReversionPercent",
          text: "Reversion Percent",
          min: 0,
          max: 100,
          default: 70
        },
        {
          type: "slider",
          uid: "PVPEvokerPreservationLivingFlamePercent",
          text: "Living Flame Percent",
          min: 0,
          max: 100,
          default: 70
        },
        {type: "slider", uid: "PVPEvokerPreservationEchoPercent", text: "Echo Percent", min: 0, max: 100, default: 70},
        {
          type: "slider",
          uid: "PVPEvokerPreservationVerdantEmbracePercent",
          text: "Verdant Embrace Percent",
          min: 0,
          max: 100,
          default: 70
        },
        {type: "checkbox", uid: "PVPEvokerPreservationUseTimeDilation", text: "Use Time Dilation", default: true},
      ]
    },
    {
      header: "AoE Healing",
      options: [
        {
          type: "slider",
          uid: "PVPEvokerPreservationEmeraldCommunionCount",
          text: "Emerald Communion Minimum Targets",
          min: 1,
          max: 10,
          default: 2
        },
        {
          type: "slider",
          uid: "PVPEvokerPreservationEmeraldCommunionPercent",
          text: "Emerald Communion Health Percent",
          min: 0,
          max: 100,
          default: 50
        },
        {
          type: "slider",
          uid: "PVPEvokerPreservationRewindCount",
          text: "Rewind Minimum Targets",
          min: 1,
          max: 10,
          default: 5
        },
        {
          type: "slider",
          uid: "PVPEvokerPreservationRewindPercent",
          text: "Rewind Health Percent",
          min: 0,
          max: 100,
          default: 70
        },
        {
          type: "slider",
          uid: "PVPEvokerPreservationDreamBreathCount",
          text: "Dream Breath Minimum Targets",
          min: 1,
          max: 10,
          default: 3
        },
        {
          type: "slider",
          uid: "PVPEvokerPreservationDreamBreathPercent",
          text: "Dream Breath Health Percent",
          min: 0,
          max: 100,
          default: 85
        },
        {
          type: "slider",
          uid: "PVPEvokerPreservationEmeraldBlossomCount",
          text: "Emerald Blossom Minimum Targets",
          min: 1,
          max: 10,
          default: 3
        },
        {
          type: "slider",
          uid: "PVPEvokerPreservationEmeraldBlossomPercent",
          text: "Emerald Blossom Health Percent",
          min: 0,
          max: 100,
          default: 80
        },
        {
          type: "slider",
          uid: "PVPEvokerPreservationSpiritbloomCount",
          text: "Spiritbloom Minimum Targets",
          min: 1,
          max: 10,
          default: 3
        },
        {
          type: "slider",
          uid: "PVPEvokerPreservationSpiritbloomPercent",
          text: "Spiritbloom Health Percent",
          min: 0,
          max: 100,
          default: 80
        },
        {
          type: "slider",
          uid: "PVPEvokerPreservationTemporalAnomalyCount",
          text: "Temporal Anomaly Minimum Targets",
          min: 1,
          max: 10,
          default: 3
        },
      ]
    },
    {
      header: "General",
      options: [
        {
          type: "checkbox",
          uid: "PVPEvokerPreservationBlessingOfBronze",
          text: "Cast Blessing of the Bronze",
          default: true
        },
      ]
    },
    {
      header: "Defensives",
      options: [
        {type: "checkbox", uid: "PVPEvokerPreservationUseRenewingBlaze", text: "Use Renewing Blaze", default: true},
        {type: "checkbox", uid: "PVPEvokerPreservationUseObsidianScales", text: "Use Obsidian Scales", default: true},
      ]
    },
    {
      header: "Damage",
      options: [
        {type: "checkbox", uid: "PVPEvokerPreservationUseDeepBreath", text: "Use Deep Breath", default: true},
        {
          type: "slider",
          uid: "PVPEvokerPreservationDeepBreathMinTargets",
          text: "Deep Breath Minimum Targets",
          min: 1,
          max: 10,
          default: 3
        },
      ]
    }
  ];

  build() {
    return new bt.Selector(
      common.waitForNotWaitingForArenaToStart(),
      common.waitForNotSitting(),
      common.waitForNotMounted(),
      new bt.Action(() => EvokerCommon.handleEmpoweredSpell()),
      common.waitForCastOrChannel(),
      spell.cast("Renewing Blaze", on => me, req => Settings.PVPEvokerPreservationUseRenewingBlaze && me.pctHealth < 50),
      spell.cast("Obsidian Scales", on => me, req => Settings.PVPEvokerPreservationUseObsidianScales && me.pctHealth < 40 && !me.hasAura("Renewing Blaze")),
      spell.interrupt("Quell", true),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          this.healRotation(),
          common.waitForTarget(),
          common.waitForFacing(),
          this.damageRotation(),
        )
      ),
    );
  }

  healRotation() {
    return new bt.Selector(
      spell.cast("Blessing of the Bronze", on => me, req => Settings.PVPEvokerPreservationBlessingOfBronze && !me.inCombat() && !me.hasAura(auras.blessingOfTheBronze)),
      spell.cast("Reversion", on => {
        const existingTarget = heal.priorityList.find(unit => !unit.hasAura(auras.reversion) && unit.predictedHealthPercent < Settings.PVPEvokerPreservationReversionPercent);
        if (existingTarget) return existingTarget;

        if (spell.getCharges("Reversion") === 2) {
          const tankWithoutAura = heal.friends.Tanks.find(unit => !unit.hasAura(auras.reversion));
          if (tankWithoutAura) return tankWithoutAura;

          const healerWithoutAura = heal.friends.Healers.find(unit => !unit.hasAura(auras.reversion));
          if (healerWithoutAura) return healerWithoutAura;
        }
        return null;
      }),
      spell.cast("Time Dilation", on => heal.getPriorityPVPHealTarget(), ret => heal.getPriorityPVPHealTarget() < 30),
      spell.cast("Echo", on => heal.getPriorityPVPHealTarget(), ret => heal.getPriorityPVPHealTarget() < Settings.PVPEvokerPreservationEchoPercent),
      spell.cast("Verdant Embrace", on => heal.getPriorityPVPHealTarget(), req => heal.getPriorityPVPHealTarget().predictedHealthPercent < Settings.PVPEvokerPreservationVerdantEmbracePercent),
      this.castEmpoweredPreservation("Dream Breath", heal.priorityList.length >= Settings.PVPEvokerPreservationDreamBreathCount ? 2 : 1),
      spell.dispel("Naturalize", true, DispelPriority.High, true, WoWDispelType.Magic, WoWDispelType.Poison),
      this.castEmpoweredPreservation("Spiritbloom", 1),
      spell.cast("Emerald Communion",
        on => me,
        req => me.pctPower < 80 && heal.priorityList.filter(unit => unit.predictedHealthPercent < Settings.PVPEvokerPreservationEmeraldCommunionPercent).length > Settings.PVPEvokerPreservationEmeraldCommunionCount),
      spell.cast("Rewind", on => me, req => heal.priorityList.filter(unit => unit.predictedHealthPercent < Settings.PVPEvokerPreservationRewindPercent).length > Settings.PVPEvokerPreservationRewindCount),
      spell.cast("Emerald Blossom",
        on => this.findBestEmeraldBlossomTarget(),
        req => this.countUnitsNeedingEmeraldBlossom() >= Settings.PVPEvokerPreservationEmeraldBlossomCount && spell.getTimeSinceLastCast("Emerald Blossom") > 2000
      ),
      spell.cast("Living Flame", on => heal.getPriorityPVPHealTarget(), ret => heal.getPriorityPVPHealTarget() < Settings.PVPEvokerPreservationLivingFlamePercent),
      spell.dispel("Naturalize", true, DispelPriority.Low, true, WoWDispelType.Magic, WoWDispelType.Poison),
    )
  }

  damageRotation() {
    return new bt.Selector(
      spell.interrupt("Tail Swipe", true),
      EvokerCommon.castEmpowered("Fire Breath", 3, on => me.target, req => !me.hasAura(auras.essenceBurst)),
      spell.cast("Disintegrate", on => me.target, req => me.hasAura(auras.essenceBurst)),
      spell.cast("Living Flame", on => me.target),
      spell.cast("Deep Breath",
        on => {
          const bestTarget = EvokerCommon.findBestDeepBreathTarget();
          return bestTarget.unit ? bestTarget.unit.position : null;
        },
        req => {
          if (!Settings.PVPEvokerPreservationUseDeepBreath) return false;
          const bestTarget = EvokerCommon.findBestDeepBreathTarget();
          return me.getPlayerEnemies(24).length > 2 && bestTarget.count >= Settings.PVPEvokerPreservationDeepBreathMinTargets;
        }
      ),
      spell.cast("Azure Strike", on => me.target, req => me.isMoving()),
    )
  }

  castEmpoweredPreservation(spellNameOrId, desiredEmpowerLevel) {
    switch (spellNameOrId) {
      case "Fire Breath":
        return this.castEmpoweredFireBreath(desiredEmpowerLevel);
      case "Dream Breath":
        return this.castEmpoweredDreamBreath(desiredEmpowerLevel);
      case "Spiritbloom":
        return this.castEmpoweredSpiritbloom(desiredEmpowerLevel);
      default:
        return EvokerCommon.castEmpowered(spellNameOrId, desiredEmpowerLevel, on => me.target, req => console.log('DEFAULTcastempowa') && true);
    }
  }


  castEmpoweredFireBreath(desiredEmpowerLevel) {
    return EvokerCommon.castEmpowered("Fire Breath", desiredEmpowerLevel, on => me.target, req => {
      const enemiesInFront = me.getPlayerEnemies(24).filter(unit => me.isFacing(unit) && unit.distanceTo(me) <= 30).length;
      return enemiesInFront > 1;
    });
  }

  castEmpoweredDreamBreath(desiredEmpowerLevel) {
    return new bt.Sequence(
      spell.cast("Tip the Scales", on => me, req => heal.getPriorityPVPHealTarget()?.predictedHealthPercent < Settings.PVPEvokerPreservationDreamBreathPercent),
      EvokerCommon.castEmpowered("Dream Breath", desiredEmpowerLevel,
        on => heal.getPriorityPVPHealTarget(),
        req => heal.getPriorityPVPHealTarget().predictedHealthPercent < Settings.PVPEvokerPreservationDreamBreathPercent),
    );
  }

  castEmpoweredSpiritbloom(desiredEmpowerLevel) {
    return EvokerCommon.castEmpowered("Spiritbloom", desiredEmpowerLevel,
      on => heal.getPriorityPVPHealTarget(),
      req => heal.getPriorityPVPHealTarget().predictedHealthPercent < Settings.PVPEvokerPreservationSpiritbloomPercent)
  }

  findBestEmeraldBlossomTarget() {
    return heal.priorityList.reduce((bestTarget, currentUnit) => {
      const currentCount = this.countUnitsNeedingEmeraldBlossom(currentUnit);
      const bestCount = bestTarget ? this.countUnitsNeedingEmeraldBlossom(bestTarget) : 0;
      return currentCount > bestCount ? currentUnit : bestTarget;
    }, null);
  }

  countUnitsNeedingEmeraldBlossom(center = me) {
    return heal.priorityList.filter(unit =>
      unit.distanceTo(center) <= 10 &&
      !unit.hasAura(auras.echo) &&
      unit.predictedHealthPercent < Settings.PVPEvokerPreservationEmeraldBlossomPercent
    ).length;
  }
}
