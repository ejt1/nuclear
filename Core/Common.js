import * as bt from './BehaviorTree'
import objMgr from './ObjectManager'

class Common {
  waitForCastOrChannel() {
    return bt.Selector(
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

  waitForCchannel() {
    return new bt.Action(() => {
      const me = objMgr.me;
      if (me.isChanneling) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
  }
}

export default new Common();
