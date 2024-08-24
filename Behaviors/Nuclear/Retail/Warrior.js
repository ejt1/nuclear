import { Behavior, BehaviorContext } from "../../../Core/Behavior";
import * as bt from '../../../Core/BehaviorTree';
import Specialization from '../../../Enums/Specialization';
import common from '../../../Core/Common';
import spell from "../../../Core/Spell";
import { me } from "../../../Core/ObjectManager";

export class WarriorFuryBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Warrior.Fury;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForTarget(),
        common.waitForCastOrChannel(),

        spell.cast("Battle Shout", on => me, req => !me.hasAuraByMe("Battle Shout")),
        spell.cast("Execute"),
        spell.cast("Rampage"),
        spell.cast("Raging Blow"),
        //spell.cast("Bloodbath"),
        spell.cast("Bloodthirst"),
        spell.cast("Whirlwind"),
      )
    );
  }
}
