import {Behavior, BehaviorContext} from "../../../Core/Behavior";
import * as bt from '../../../Core/BehaviorTree';
import Specialization from '../../../Enums/Specialization';
import common from '../../../Core/Common';
import spell from "../../../Core/Spell";
import {me} from "../../../Core/ObjectManager";

export class DeathKnightFrostBehavior extends Behavior {
  context = BehaviorContext.Any; // PVP ?
  specialization = Specialization.Mage.Frost;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForTarget(),
        common.waitForCastOrChannel(),
        common.waitForFacing(),
        spell.cast("Fire Blast"),
        spell.cast("Frostbolt")
      )
    );
  }

}
