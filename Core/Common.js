import * as bt from './BehaviorTree'
import objMgr, { me } from './ObjectManager'
import CGUnit from "../Extensions/CGUnit";

class Common {
  static waitForCastOrChannel() {
    return new bt.Selector(
      Common.waitForCast(),
      Common.waitForChannel(),
    );
  }

  static waitForCast() {
    return new bt.Action(() => {
      if (me.isCasting) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
  }

  static waitForChannel() {
    return new bt.Action(() => {
      if (me.isChanneling) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
  }

  static waitForTarget() {
    return new bt.Action(() => {
      if (!me.targetUnit || !Common.validTarget(me.targetUnit)) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
  }

  static waitForFacing() {
    return new bt.Action(() => {
      if (!me.targetUnit || !me.isFacing(me.targetUnit)) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
  }

  static validTarget(u) {
    if (!u|| u.deadOrGhost || !me.canAttack(u)) {
      return false;
    }

    return true;
  }
}

export default Common;
