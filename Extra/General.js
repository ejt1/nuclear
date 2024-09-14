import Common from '@/Core/Common';
import ObjectManager, { me } from '@/Core/ObjectManager';
import Settings from '@/Core/Settings';
import { defaultCombatTargeting as combat } from '@/Targeting/CombatTargeting';

class General {
  static options = [
    { type: "checkbox", uid: "AutoInterrupt", text: "Auto Interrupt", default: false },
    { type: "slider", uid: "InterruptPercentage", text: "Interrupt Percentage", min: 0, max: 100, default: 70 },
    { type: "dropdown", uid: "InterruptMode", text: "Interrupt Mode", options: ["None", "Everything", "List"], default: "None" },
    { type: "checkbox", uid: "AutoDispel", text: "Auto Dispel", default: false },
    { type: "dropdown", uid: "DispelMode", text: "Dispel Mode", options: ["None", "Everything", "List"], default: "None" },
    { type: "checkbox", uid: "UseHealthstone", text: "Use Healthstone", default: false },
    { type: "slider", uid: "HealthstonePercentage", text: "Healthstone Percentage", min: 0, max: 100, default: 30 },
    { type: "checkbox", uid: "AutoTargetSwitch", text: "Auto Target Switch", default: false },
    { type: "slider", uid: "TargetSwitchDelay", text: "Target Switch Delay (ms)", min: 0, max: 5000, default: 1000 },
    { type: "slider", uid: "SpellCastDelay", text: "Spell Cast Delay (ms)", min: 0, max: 1000, default: 0 }
  ];

  static tabName = "General";

  static renderOptions(renderFunction) {
    renderFunction([
      { header: "Interrupt Settings", collapsible: true, options: this.options.slice(0, 3) },
      { header: "Dispel Settings", collapsible: true, options: this.options.slice(3, 5) },
      { header: "Healthstone Settings", collapsible: true, options: this.options.slice(5, 7) },
      { header: "Combat Behavior Settings", collapsible: true, options: this.options.slice(7, 9) },
      { header: "Spell Cast Settings", collapsible: true, options: this.options.slice(9) },
    ]);
  }

  static lastAutoTargetTime = 0;

  static general() {
    const currentTime = wow.frameTime;
    if (Settings.AutoTargetSwitch && combat.bestTarget && currentTime - this.lastAutoTargetTime > Settings.TargetSwitchDelay) {
      wow.GameUI.setTarget(combat.bestTarget);
      this.lastAutoTargetTime = currentTime;
    }
    if (Settings.HealthstonePercentage > 0) {
      if (me.pctHealth <= Settings.HealthstonePercentage) {
        Common.useItemByName("Healthstone")
      }
    }
  }

  static tick() {
    this.general();
  }
}

export default General;
