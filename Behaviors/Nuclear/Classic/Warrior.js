import { Behavior, BehaviorContext } from '../../../Core/Behavior';
import * as bt from '../../../Core/BehaviorTree';
import Common from '../../../Core/Common';
import Specialization from '../../../Core/Specialization';
import Spell from '../../../Core/Spell';

export class WarriorFuryBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Warrior.Fury;
  version = wow.GameVersion.Classic;

  build() {
    return new bt.Selector(
      Common.waitForCastOrChannel(),
    );
  }
}
