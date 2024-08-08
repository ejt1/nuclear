import BehaviorBuilder from "./Core/BehaviorBuilder";
import objMgr from "./Core/ObjectManager";

class Nuclear {
  async initialize() {
    const builder = new BehaviorBuilder;
    await builder.initialize();
  }

  tick() {
    if (objMgr.me) {
      try {
        this.rootBehavior?.tick();
      } catch (e) {
        this.rootBehavior = null;
        console.error(`${e.message}`);
        console.error(`${e.stack}`);
      }
    }
  }
}

export default new Nuclear();
