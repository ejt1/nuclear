import { me } from '@/Core/ObjectManager';
import Settings from '@/Core/Settings';

class General {
  static options = [
    { header: "Interrupt Settings" },
    { type: "combobox", uid: "InterruptMode", text: "Interrupt Mode", options: ["None", "Everything", "List"], default: "None" },
    { type: "slider", uid: "InterruptPercentage", text: "Interrupt Percentage", default: 50, min: 1, max: 100 },

    { header: "Dispel Settings" },
    { type: "combobox", uid: "DispelMode", text: "Dispel Mode", options: ["None", "Everything", "List"], default: "None" },

    { header: "Healthstone Settings" },
    { type: "slider", uid: "HealthstonePercentage", text: "Healthstone Usage Percentage", default: 30, min: 0, max: 100 },
  ];

  static tabName = "General";

  static renderOptions(renderFunction) {
    renderFunction([
      { header: "Interrupt Settings", collapsible: true, options: this.options.slice(0, 3) },
      { header: "Dispel Settings", collapsible: true, options: this.options.slice(3, 5) },
      { header: "Healthstone Settings", collapsible: true, options: this.options.slice(5, 7) },
    ]);
  }

  static general() {
    if (Settings.HealthstonePercentage > 0) {
      if (me.pctHealth <= Settings.HealthstonePercentage) {
        // Logic to use Healthstone
      }
    }

    // Implement interrupt logic based on InterruptMode and InterruptPercentage
    if (Settings.InterruptMode !== "None") {
      // Logic for interrupts
      // You'll need to implement the actual interrupt logic here
    }

    // Implement dispel logic based on DispelMode
    if (Settings.DispelMode !== "None") {
      // Logic for dispels
      // You'll need to implement the actual dispel logic here
    }
  }

  static tick() {
    this.general();
    // Implement other tick logic if needed
  }
}

export default General;
