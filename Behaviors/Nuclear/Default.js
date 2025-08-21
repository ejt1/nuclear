import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '../../Core/BehaviorTree';
import Specialization from '../../Enums/Specialization';
import common from '../../Core/Common';
import spell from "../../Core/Spell";

export class DefaultBehavior extends Behavior {
  name = "Nuclear Default";
  context = BehaviorContext.Any;
  specialization = Specialization.All;
  version = 1;

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForNotSitting(),
      common.waitForCastOrChannel(),
      common.waitForTarget(),
      common.waitForFacing(),
      spell.castOneButtonRotation()
    );
  }
}
