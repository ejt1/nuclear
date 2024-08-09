import { BehaviorContext } from "./Core/Behavior";
import BehaviorBuilder from "./Core/BehaviorBuilder";
import objMgr from "./Core/ObjectManager";
import { me } from './Core/ObjectManager';

class Nuclear {
  async initialize() {
    this.builder = new BehaviorBuilder;
    await this.builder.initialize();
    this.rebuild();
  }

  tick() {
    if (me) {
      try {
        this.rootBehavior?.tick();
      } catch (e) {
        this.rootBehavior = null;
        console.error(`${e.message}`);
        console.error(`${e.stack}`);
      }
    }
  }

  rebuild() {
    objMgr.tick();
    if (me) {
      console.info('Rebuilding behaviors');
      this.rootBehavior = this.builder.build(wow.SpecializationInfo.activeSpecializationId, BehaviorContext.Normal);
    }
  }
}

export default new Nuclear();
