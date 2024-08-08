import { Behavior, BehaviorContext } from '../../../Core/Behavior';
import * as bt from '../../../Core/BehaviorTree';
import Specialization from '../../../Core/Specialization';
import common from '../../../Core/Common';

export class WarriorFuryBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Druid.Restoration;
  flavor = wow.GameVersion.Classic;

  build() {
    return new bt.Selector(
      common.waitForCastOrChannel(),
    );
  }
}
