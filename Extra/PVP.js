import drTracker from '@/Core/DRTracker';
import Settings from '@/Core/Settings';

class PVP {
  static tabName = "PVP";

  static options = [
    { type: "checkbox", uid: "DRTrackerEnabled", text: "DR Tracker Enabled", default: true },
    { type: "checkbox", uid: "DRTrackerDebugLogs", text: "DR Tracker Debug Logs Enabled", default: false },
  ];

  static renderOptions(renderFunction) {
    renderFunction([
      { header: "Diminishing Returns", options: this.options },
    ]);
  }

  static tick() {
    this.updateDRTracker();
  }

  static updateDRTracker() {
    // Update DR tracker enabled state based on settings
    if (typeof drTracker !== 'undefined') {
      drTracker.setEnabled(Settings.DRTrackerEnabled);
    }
  }
}

export default PVP;
