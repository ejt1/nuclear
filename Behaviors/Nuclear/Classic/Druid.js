import { Behavior, BehaviorContext } from '../../../Core/Behavior';
import * as bt from '../../../Core/BehaviorTree';
import Specialization from '../../../Core/Specialization';
import common from '../../../Core/Common';

export class DruidRestoBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Druid.Restoration;
  version = wow.GameVersion.Classic;

  build() {
    return new bt.Selector(
      common.waitForCastOrChannel(),
    );
  }
}
