import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import common from '@/Core/Common';
import { me } from "@/Core/ObjectManager";
import spell from "@/Core/Spell";
import { PowerType } from "@/Enums/PowerType";
import Specialization from '@/Enums/Specialization';
import { defaultCombatTargeting as combat } from '@/Targeting/CombatTargeting';
import { defaultHealTargeting as heal } from '@/Targeting/HealTargeting';

export class EvokerAugmentationBehavior extends Behavior {
  name = "Augmentation Evoker";
  context = BehaviorContext.Any;
  specialization = Specialization.Evoker.Augmentation;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForNotMounted(),
        common.waitForTarget(),
        common.waitForCastOrChannel(),
        common.waitForFacing(),

        spell.cast("Fire Breath"),
        spell.cast("Upheaval"),
        spell.cast("Living Flame"),
      )
    );
  }
}
