import * as bt from './BehaviorTree'
import objMgr from './ObjectManager'

class Common {
  waitForCastOrChannel() {
    return new bt.Selector(
      this.waitForCast(),
      this.waitForChannel(),
    );
  }

  waitForCast() {
    return new bt.Action(() => {
      const me = objMgr.me;
      if (me.isCasting) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
  }

  waitForChannel() {
    return new bt.Action(() => {
      const me = objMgr.me;
      if (me.isChanneling) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
  }

  waitForTarget() {
    return new bt.Action(() => {
      const me = objMgr.me;
      if (!me.target || !this.validTarget(me.target)) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
  }

  validTarget(u) {
    const me = objMgr.me;
    if (!u) {
      return false;
    }
    if (!me.canAttack(u)) {
      return false;
    }
    return true;
  }
}

export default new Common();
