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

const auras = {
  reversion: 366155,
  echo: 364343,
  essenceBurst: 369299,
  blessingOfTheBronze: 381748
};

export class EvokerPreservationBehavior extends Behavior {
  name = "Preservation Evoker";
  context = BehaviorContext.Any;
  specialization = Specialization.Evoker.Preservation;
  version = wow.GameVersion.Retail;
  static settings = [
    {
      header: "Single Target Healing",
      options: [
        { type: "slider", uid: "EvokerPreservationReversionPercent", text: "Reversion Percent", min: 0, max: 100, default: 70 },
        { type: "slider", uid: "EvokerPreservationLivingFlamePercent", text: "Living Flame Percent", min: 0, max: 100, default: 70 },
        { type: "slider", uid: "EvokerPreservationEchoPercent", text: "Echo Percent", min: 0, max: 100, default: 70 },
        { type: "slider", uid: "EvokerPreservationVerdantEmbracePercent", text: "Verdant Embrace Percent", min: 0, max: 100, default: 70 },
      ]
    },
    {
      header: "AoE Healing",
      options: [
        { type: "slider", uid: "EvokerPreservationRewindCount", text: "Rewind Minimum Targets", min: 1, max: 10, default: 5 },
        { type: "slider", uid: "EvokerPreservationRewindPercent", text: "Rewind Health Percent", min: 0, max: 100, default: 70 },
        { type: "slider", uid: "EvokerPreservationDreamBreathCount", text: "Dream Breath Minimum Targets", min: 1, max: 10, default: 3 },
        { type: "slider", uid: "EvokerPreservationDreamBreathPercent", text: "Dream Breath Health Percent", min: 0, max: 100, default: 85 },
        { type: "slider", uid: "EvokerPreservationEmeraldBlossomCount", text: "Emerald Blossom Minimum Targets", min: 1, max: 10, default: 3 },
        { type: "slider", uid: "EvokerPreservationEmeraldBlossomPercent", text: "Emerald Blossom Health Percent", min: 0, max: 100, default: 80 },
        { type: "slider", uid: "EvokerPreservationSpiritbloomCount", text: "Spiritbloom Minimum Targets", min: 1, max: 10, default: 3 },
        { type: "slider", uid: "EvokerPreservationSpiritbloomPercent", text: "Spiritbloom Health Percent", min: 0, max: 100, default: 80 },
        { type: "slider", uid: "EvokerPreservationTemporalAnomalyCount", text: "Temporal Anomaly Minimum Targets", min: 1, max: 10, default: 3 },
      ]
    },
    {
      header: "General",
      options: [
        { type: "checkbox", uid: "EvokerPreservationBlessingOfBronze", text: "Cast Blessing of the Bronze", default: true },
      ]
    },
    {
      header: "Defensives",
      options: [
        { type: "checkbox", uid: "EvokerPreservationUseRenewingBlaze", text: "Use Renewing Blaze", default: true },
      ]
    },
    {
      header: "Damage",
      options: [
        { type: "checkbox", uid: "EvokerPreservationUseDeepBreath", text: "Use Deep Breath", default: true },
        { type: "slider", uid: "EvokerPreservationDeepBreathMinTargets", text: "Deep Breath Minimum Targets", min: 1, max: 10, default: 3 },
      ]
    }
  ];

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      new bt.Action(() => this.handleEmpoweredSpell()),
      common.waitForCastOrChannel(),
      spell.cast("Renewing Blaze", on => me,
        req => Settings.EvokerPreservationUseRenewingBlaze && combat.targets.filter(unit => unit.isTanking() && me.isWithinMeleeRange(unit)).length > 1),
      spell.interrupt("Quell"),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          spell.cast("Blessing of the Bronze", on => me, req => Settings.EvokerPreservationBlessingOfBronze && !me.inCombat() && !me.hasAura(auras.blessingOfTheBronze)),
          spell.cast("Rewind", on => me, req => heal.priorityList.filter(unit => unit.predictedHealthPercent < Settings.EvokerPreservationRewindPercent).length > Settings.EvokerPreservationRewindCount),
          this.castEmpowered("Dream Breath", 4),
          spell.cast("Emerald Blossom",
            on => this.findBestEmeraldBlossomTarget(),
            req => this.countUnitsNeedingEmeraldBlossom() >= Settings.EvokerPreservationEmeraldBlossomCount && spell.getTimeSinceLastCast("Emerald Blossom") > 2000
          ),
          spell.cast("Echo", on => heal.priorityList.find(unit => !unit.hasAura(auras.echo) && unit.predictedHealthPercent < Settings.EvokerPreservationEchoPercent)),
          spell.cast("Verdant Embrace", on => heal.priorityList.find(unit => unit.predictedHealthPercent < Settings.EvokerPreservationVerdantEmbracePercent)),
          spell.cast("Time Dilation", on => {
            const tank = heal.friends.Tanks[0];
            if (!tank) return null;

            const enemiesOnTank = combat.targets.filter(unit => unit.target && unit.target.guid.equals(tank.guid)).length;
            const dangerousSpellOnTank = combat.targets.some(unit =>
              unit.isCastingOrChanneling &&
              !unit.isInterruptible &&
              unit.spellInfo &&
              unit.spellInfo.spellTargetGuid &&
              unit.spellInfo.spellTargetGuid.equals(tank.guid)
            );

            return (enemiesOnTank >= 3 || dangerousSpellOnTank) ? tank : null;
          }),
          spell.cast("Living Flame", on => heal.priorityList.find(unit => unit.predictedHealthPercent < Settings.EvokerPreservationLivingFlamePercent)),
          spell.cast("Reversion", on => {
            const existingTarget = heal.priorityList.find(unit => !unit.hasAura(auras.reversion) && unit.predictedHealthPercent < Settings.EvokerPreservationReversionPercent);
            if (existingTarget) return existingTarget;

            if (spell.getCharges("Reversion") === 2) {
              const tankWithoutAura = heal.friends.Tanks.find(unit => !unit.hasAura(auras.reversion));
              if (tankWithoutAura) return tankWithoutAura;

              const healerWithoutAura = heal.friends.Healers.find(unit => !unit.hasAura(auras.reversion));
              if (healerWithoutAura) return healerWithoutAura;
            }

            return null;
          }),
          spell.cast("Temporal Anomaly", on => me, req => heal.friends.All.filter(unit => me.isFacing(unit, 30)).length >= Settings.EvokerPreservationTemporalAnomalyCount),
          spell.dispel("Naturalize", true, DispelPriority.Low, false, WoWDispelType.Magic, WoWDispelType.Poison),
          spell.interrupt("Tail Swipe"),
          spell.cast("Deep Breath",
            on => {
              const bestTarget = findBestDeepBreathTarget();
              return bestTarget.unit ? bestTarget.unit.position : null;
            },
            req => {
              if (!Settings.EvokerPreservationUseDeepBreath) return false;
              const bestTarget = findBestDeepBreathTarget();
              return combat.targets.length > 2 && bestTarget.count >= Settings.EvokerPreservationDeepBreathMinTargets;
            }
          ),
          this.castEmpowered("Fire Breath", 4),
          spell.cast("Disintegrate",
            on => combat.bestTarget,
            req => {
              const essenceBurst = me.getAura(auras.essenceBurst);
              return essenceBurst && (essenceBurst.stacks === 2 || essenceBurst.remaining < 2000);
            }
          ),
          spell.cast("Living Flame", on => combat.bestTarget),
          spell.cast("Azure Strike", on => combat.bestTarget, req => me.isMoving()),
        )
      )
    );
  }

  castEmpowered(spellNameOrId, desiredEmpowerLevel) {
    switch (spellNameOrId) {
      case "Fire Breath":
        return this.castEmpoweredFireBreath(desiredEmpowerLevel);
      case "Dream Breath":
        return this.castEmpoweredDreamBreath(desiredEmpowerLevel);
      case "Spiritbloom":
        return this.castEmpoweredSpiritbloom(desiredEmpowerLevel);
      default:
        return this.castEmpoweredDefault(spellNameOrId, desiredEmpowerLevel);
    }
  }

  castEmpoweredFireBreath(desiredEmpowerLevel) {
    return new bt.Sequence(
      spell.cast("Fire Breath", on => combat.bestTarget, req => {
        const enemiesInFront = combat.targets.filter(unit => me.isFacing(unit) && unit.distanceTo(me) <= 30).length;
        return enemiesInFront > 1;
      }),
      this.setDesiredEmpowerLevel(desiredEmpowerLevel)
    );
  }

  castEmpoweredDreamBreath(desiredEmpowerLevel) {
    return new bt.Sequence(
      spell.cast("Dream Breath", on => {
        const validTargets = heal.priorityList.filter(unit => me.isFacing(unit) && unit.distanceTo(me) <= 30);
        return validTargets.length > 0 ? validTargets[0] : null;
      }, req => {
        const validTargets = heal.priorityList.filter(unit =>
          me.isFacing(unit) &&
          unit.distanceTo(me) <= 30 &&
          unit.predictedHealthPercent < Settings.EvokerPreservationDreamBreathPercent
        );
        return validTargets.length >= Settings.EvokerPreservationDreamBreathCount;
      }),
      spell.cast("Tip the Scales", on => me),
      this.setDesiredEmpowerLevel(desiredEmpowerLevel)
    );
  }

  castEmpoweredSpiritbloom(desiredEmpowerLevel) {
    return new bt.Sequence(
      spell.cast("Spiritbloom", on => heal.priorityList[0], req => {
        const validTargets = heal.priorityList.filter(unit =>
          unit.distanceTo(me) <= 30 &&
          unit.predictedHealthPercent < Settings.EvokerPreservationSpiritbloomPercent
        );
        return validTargets.length >= Settings.EvokerPreservationSpiritbloomCount;
      }),
      this.setDesiredEmpowerLevel(desiredEmpowerLevel)
    );
  }

  castEmpoweredDefault(spellNameOrId, desiredEmpowerLevel) {
    return new bt.Sequence(
      spell.cast(spellNameOrId, on => combat.bestTarget),
      this.setDesiredEmpowerLevel(desiredEmpowerLevel)
    );
  }

  setDesiredEmpowerLevel(desiredEmpowerLevel) {
    return new bt.Action(() => {
      this._desiredEmpowerLevel = desiredEmpowerLevel;
      return bt.Status.Success;
    });
  }

  handleEmpoweredSpell() {
    if (this._desiredEmpowerLevel !== undefined && me.spellInfo.empowerLevel === this._desiredEmpowerLevel) {
      const currentSpellId = me.spellInfo.spellChannelId;
      const currentSpell = spell.getSpell(currentSpellId);
      if (currentSpell) {
        currentSpell.cast(me.targetUnit);
        this._desiredEmpowerLevel = undefined;
      }
      return bt.Status.Success;
    }
    return bt.Status.Failure;
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
      unit.predictedHealthPercent < Settings.EvokerPreservationEmeraldBlossomPercent
    ).length;
  }
}

const findBestDeepBreathTarget = () => {
  return combat.targets.reduce((best, mainUnit) => {
    const unitsInRange = combat.targets.filter(target =>
      target.distanceTo(mainUnit) <= target.distanceTo(me) &&
      me.isFacing(target, 30)
    ).length;

    return unitsInRange > best.count ? { unit: mainUnit, count: unitsInRange } : best;
  }, { unit: null, count: 0 });
};
