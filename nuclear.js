import { BehaviorContext } from "./Core/Behavior";
import BehaviorBuilder from "./Core/BehaviorBuilder";
import objMgr, { me } from "./Core/ObjectManager";
import { flagsComponents } from "./Core/Util";
import colors from "./Enums/Colors";
import { defaultHealTargeting } from "./Targeting/HealTargeting";
import { defaultCombatTargeting } from "./Targeting/CombatTargeting";
import commandListener from '@/Core/CommandListener'
import { renderBehaviorTree } from "./Debug/BehaviorTreeDebug";
import settings from "@/Core/Settings";

export let availableBehaviors = [];

class Nuclear extends wow.EventListener {
  async initialize() {
    this.builder = new BehaviorBuilder();
    await this.builder.initialize();
    this.rebuild();
    this.isPaused = false;
  }

  tick() {
    if (!this.gameReady()) {
      return;
    }
    if (this.error) {
      const text = "ERROR\n".repeat(5);
      const displaySize = imgui.io.displaySize;
      const center = {x: displaySize.x / 2, y: displaySize.y / 2};
      const textSize = imgui.calcTextSize(text);
      const adjusted = {x: center.x - textSize.x / 2, y: center.y - textSize.y / 2};
      imgui.getBackgroundDrawList()?.addText(text, adjusted, colors.red);
      return;
    }

    if (settings.PauseKey && settings.PauseKey !== "None") {
      const keyEnum = imgui.Key[settings.PauseKey];
      if (keyEnum !== undefined && imgui.isKeyPressed(keyEnum, false)) {
        this.isPaused = !this.isPaused;
        console.info(`Rotation ${this.isPaused ? 'paused' : 'resumed'}`);
      }
    }

    // Draw pause indicator if paused
    if (this.isPaused) {
      const pauseText = "ROTATION PAUSED";
      const displaySize = imgui.io.displaySize;
      const center = {x: displaySize.x / 2, y: displaySize.y / 2};
      const textSize = imgui.calcTextSize(pauseText);
      const adjusted = {x: center.x - textSize.x / 2, y: center.y - textSize.y / 2};
      imgui.getBackgroundDrawList()?.addText(pauseText, adjusted, colors.yellow);
    }

    try {
      defaultHealTargeting?.update();
      defaultCombatTargeting?.update();
      if (this.behaviorRoot && !this.isPaused) {
        this.behaviorRoot.execute(this.behaviorContext);
      }
    } catch (e) {
      this.error = true;
      this.behaviorRoot = null;
      console.error(`${e.message}`);
      console.error(`${e.stack}`);
    }
  }

  rebuild() {
    objMgr.tick();
    if (me) {
      console.info('Rebuilding behaviors');

      const { root, settings } = this.builder.build(wow.SpecializationInfo.activeSpecializationId, BehaviorContext.Normal);
      this.behaviorRoot = root;
      this.behaviorContext = {};
      this.behaviorSettings = settings;
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
