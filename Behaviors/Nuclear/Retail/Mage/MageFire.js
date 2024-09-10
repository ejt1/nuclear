import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { PowerType } from "@/Enums/PowerType";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";

export class MageFireBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Mage.Fire;
  version = wow.GameVersion.Retail;
  name = "Basic Ass Fire"

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForNotMounted(),
        common.waitForTarget(),
        common.waitForCastOrChannel(),
        common.waitForFacing(),
        spell.cast("Blazing Barrier", req => combat.targets.find(unit => me.distanceTo(unit) < 8)),
        spell.cast("Fire Blast"),
        spell.cast("Fireball"),
      )
    );
  }
}
