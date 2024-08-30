import { me } from '@/Core/ObjectManager';
import Settings from '@/Core/Settings';

class AntiAFK {
  static options = [
    { type: "checkbox", uid: "ExtraAntiAFK", text: "Enable AntiAFK", default: false }
  ];

  static tabName = "AntiAFK";

  static renderOptions(renderFunction) {
    renderFunction([{ header: "AntiAFK Settings", options: this.options }]);
  }

  static lastAction = 0;

  static antiAFK() {
    if (!Settings.ExtraAntiAFK) return;

    const timePassed = wow.frameTime - this.lastAction;
    if (timePassed > 60000) {
      console.info("Last Action")
      this.lastAction = wow.frameTime;
      wow.GameUI.eventTime = wow.frameTime;
    }
  }

  static tick() {
    this.antiAFK();
  }
}

export default AntiAFK;
