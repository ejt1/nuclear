import {BehaviorContext, BehaviorType} from "./Core/Behavior";
import BehaviorBuilder from "./Core/BehaviorBuilder";
import objMgr, { me } from "./Core/ObjectManager";
import { flagsComponents } from "./Core/Util";
import Heal from "./Targeting/Heal";

export let availableBehaviors = [];  // Declare global variable for behaviors
export let rootBehavior = null; // Declare global variable for rootBehavior
export let currentBehaviorTypes = [];
export let HEAL = [];

class Nuclear extends wow.EventListener {
  async initialize() {
    this.builder = new BehaviorBuilder();
    await this.builder.initialize();
    HEAL = new Heal();  // Instantiate the Heal class
    this.rebuild();  // Ensure rootBehavior is set before calling HEAL.update()
  }

  tick() {
    if (!this.gameReady()) {
      return;
    }

    try {
      HEAL?.update();
      rootBehavior?.tick();
    } catch (e) {
      rootBehavior = null;
      console.error(`${e.message}`);
      console.error(`${e.stack}`);
    }
  }

  rebuild() {
    objMgr.tick();
    if (me) {
      console.info('Rebuilding behaviors');

      // Rebuild rootBehavior before updating Heal
      rootBehavior = this.builder.build(wow.SpecializationInfo.activeSpecializationId, BehaviorContext.Normal);
      availableBehaviors = this.builder.behaviors;
      HEAL?.reset();
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
    // XXX: figure out game state flags, 0x211 is "in game" mask for retail
    if (wow.GameUI.state != 0x211) {
      return false;
    }

    return me ? true : false;
  }
}

export default new Nuclear();
