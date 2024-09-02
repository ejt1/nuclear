import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { PowerType } from "@/Enums/PowerType";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";

const auras = {
  boneshield: 195181
}

export class DeathKnightBloodBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.DeathKnight.Blood;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          common.waitForTarget(),
          common.waitForCastOrChannel(),
          common.waitForFacing(),
          spell.cast("Death's Caress", on => me.target, req => !me.isWithinMeleeRange(me.target) && me.getAuraStacks(auras.boneshield) < 5),
          spell.cast("Marrowrend", on => me.target, req => me.getAuraStacks(auras.boneshield) <= 5),
        )
      )
    );
  }
}
