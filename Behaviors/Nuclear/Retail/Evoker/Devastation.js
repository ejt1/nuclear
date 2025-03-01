import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import Settings from "@/Core/Settings";
import EvokerCommon from "@/Behaviors/Nuclear/Retail/Evoker/EvokerCommon";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";
import { PowerType } from "@/Enums/PowerType";
import Specialization from "@/Enums/Specialization";

export class EvokerDevastationBehavior extends Behavior {
  name = "Devastation Evoker";
  context = BehaviorContext.Any;
  specialization = Specialization.Evoker.Devastation;
  version = wow.GameVersion.Retail;

  static settings = [
    {
      header: "Defensives",
      options: [
        { type: "checkbox", uid: "EvokerDevastationUseRenewingBlaze", text: "Use Renewing Blaze", default: true },
        { type: "checkbox", uid: "EvokerDevastationUseObsidianScales", text: "Use Obsidian Scales", default: true },
      ]
    },
    {
      header: "Damage",
      options: [
        { type: "checkbox", uid: "EvokerDevastationUseDeepBreath", text: "Use Deep Breath", default: true },
        { type: "slider", uid: "EvokerDevastationDeepBreathMinTargets", text: "Deep Breath Minimum Targets", min: 1, max: 10, default: 3 },
      ]
    }
  ];

  build() {
    return new bt.Selector(
      common.waitForNotSitting(),
      common.waitForNotMounted(),
      new bt.Action(() => EvokerCommon.handleEmpoweredSpell()),
      common.waitForCastOrChannel(),
      spell.cast("Renewing Blaze", on => me,
        req => Settings.EvokerDevastationUseRenewingBlaze &&
          (me.pctHealth < 50 || combat.targets.length > 2)
      ),
      spell.cast("Obsidian Scales", on => me,
        req => Settings.EvokerDevastationUseObsidianScales &&
          (me.pctHealth < 40 || combat.targets.length > 3) &&
          !me.hasAura("Renewing Blaze")
      ),
      spell.interrupt("Quell"),
      common.waitForTarget(),
      common.waitForFacing(),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          // Use Fire Breath at Empower Level 1
          EvokerCommon.castEmpowered("Fire Breath", 1, on => combat.bestTarget, ret => true),

          // Use Eternity Surge at the level relevant to the target count
          this.castEternitySurge(),

          // Use Deep Breath if fighting more than 1 target
          spell.cast("Deep Breath",
            on => {
              const bestTarget = EvokerCommon.findBestDeepBreathTarget();
              return bestTarget.unit ? bestTarget.unit.position : null;
            },
            req => {
              if (!Settings.EvokerDevastationUseDeepBreath) return false;
              const bestTarget = EvokerCommon.findBestDeepBreathTarget();
              return combat.targets.length > 2 && bestTarget.count >= Settings.EvokerDevastationDeepBreathMinTargets;
            }
          ),

          // Use Disintegrate as Essence spender (unless 4+ targets)
          spell.cast("Disintegrate", on => combat.bestTarget, req =>
            combat.targets.length < 4 && me.powerByType(PowerType.Essence) >= 3
          ),

          // Use Pyre instead of Disintegrate if fighting more than 4 targets
          spell.cast("Pyre", on => combat.bestTarget, req =>
            combat.targets.length >= 4 && me.powerByType(PowerType.Essence) >= 3
          ),

          // Use Living Flame (1-2 targets) if no Essence
          spell.cast("Living Flame", on => combat.bestTarget, req =>
            combat.targets.length <= 2 && me.powerByType(PowerType.Essence) < 3
          ),

          // Use Azure Strike (3+ targets) if no Essence
          spell.cast("Azure Strike", on => combat.bestTarget, req =>
            combat.targets.length >= 3 && me.powerByType(PowerType.Essence) < 3
          )
        )
      )
    );
  }

  castEternitySurge() {
    return new bt.Decorator(
      ret => combat.targets.length > 0,
      new bt.Sequence(
        EvokerCommon.castEmpowered("Eternity Surge", this.getEternitySurgeEmpowerLevel(), on => combat.bestTarget, ret => true)
      )
    );
  }

  getEternitySurgeEmpowerLevel() {
    const targetCount = combat.targets.length;
    if (targetCount >= 7) return 4;
    if (targetCount >= 5) return 3;
    if (targetCount >= 3) return 2;
    return 1;
  }
}
