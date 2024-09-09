import { BehaviorContext } from "./Core/Behavior";
import BehaviorBuilder from "./Core/BehaviorBuilder";
import objMgr, { me } from "./Core/ObjectManager";
import { flagsComponents } from "./Core/Util";
import { defaultHealTargeting } from "./Targeting/HealTargeting";
import { defaultCombatTargeting } from "./Targeting/CombatTargeting";
import commandListener from '@/Core/CommandListener'

export let availableBehaviors = [];

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
    if (this.error) { return; }

    try {
      defaultHealTargeting?.update();
      defaultCombatTargeting?.update();
      this.rootBehavior?.tick();
    } catch (e) {
      this.error = true;
      this.rootBehavior = null;
      console.error(`${e.message}`);
      console.error(`${e.stack}`);
    }
  }

  rebuild() {
    objMgr.tick();
    if (me) {
      console.info('Rebuilding behaviors');

      // Rebuild rootBehavior before updating Heal
      this.rootBehavior = this.builder.build(wow.SpecializationInfo.activeSpecializationId, BehaviorContext.Normal);
      availableBehaviors = this.builder.behaviors;
      defaultHealTargeting?.reset();
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
