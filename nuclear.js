import { BehaviorContext } from "./Core/Behavior";
import BehaviorBuilder from "./Core/BehaviorBuilder";
import objMgr, { me } from "./Core/ObjectManager";
import { flagsComponents } from "./Core/Util";

export let availableBehaviors = [];  // Declare global variable for behaviors


class Nuclear extends wow.EventListener {
  async initialize() {
    this.builder = new BehaviorBuilder();
    await this.builder.initialize();
    this.rebuild();
  }

  tick() {
    if (!this.gameReady()) {
      return;
    }

    try {
      this.rootBehavior?.tick();
    } catch (e) {
      this.rootBehavior = null;
      console.error(`${e.message}`);
      console.error(`${e.stack}`);
    }
  }

  rebuild() {
    objMgr.tick();
    if (me) {
      console.info('Rebuilding behaviors');

      this.rootBehavior = this.builder.build(wow.SpecializationInfo.activeSpecializationId, BehaviorContext.Normal);
      availableBehaviors = this.builder.behaviors;
    }
  }

  onEvent(event) {
    if (event.name == 'PLAYER_ENTERING_WORLD') {
      this.rebuild();
    }
  }

  gameReady() {
    if (wow.GameUI.state != this.previous_state) {
      console.debug(`state changed to ${flagsComponents(wow.GameUI.state, 16)}`);
      this.previous_state = wow.GameUI.state;
    }
    if (wow.GameUI.state != 0x211) {
      return false;
    }

    return me ? true : false;
  }
}

export default new Nuclear();
