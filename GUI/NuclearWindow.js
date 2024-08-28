import Settings from "../Core/Settings";

class NuclearWindow {
  constructor() {
    this.show = new imgui.MutableVariable(false);
    this.radarOptions = [
      { type: "checkbox", uid: "ExtraRadar", text: "Enable Radar", default: false },
      { type: "checkbox", uid: "ExtraRadarTrackHerbs", text: "Track Herbs", default: false },
      { type: "checkbox", uid: "ExtraRadarTrackOres", text: "Track Ores", default: false },
      { type: "checkbox", uid: "ExtraRadarTrackTreasures", text: "Track Treasures", default: false },
      { type: "checkbox", uid: "ExtraRadarTrackQuests", text: "Track Quest Objectives", default: false },
      { type: "checkbox", uid: "ExtraRadarTrackRares", text: "Track Rares", default: false },
      { type: "checkbox", uid: "ExtraRadarTrackInteractables", text: "Track All POI", default: false },
      { type: "checkbox", uid: "ExtraRadarTrackEverything", text: "Track Everything", default: false },
      { type: "checkbox", uid: "ExtraRadarDrawLines", text: "Draw Lines", default: false },
      { type: "checkbox", uid: "ExtraRadarDrawLinesClosest", text: "Draw Lines Closest Only", default: false },
      { type: "checkbox", uid: "ExtraRadarDrawDistance", text: "Draw Distance", default: false },
      { type: "checkbox", uid: "ExtraRadarDrawDebug", text: "Draw Debug Info", default: false },
      { type: "slider", uid: "ExtraRadarLoadDistance", text: "Radar Load Distance", default: 200, min: 1, max: 200 }
    ];

    this.autolooterOptions = [
      { type: "checkbox", uid: "EnableLooter", text: "Enable looter", default: false }
    ];

    // Initialize state for each option from Settings
    this.state = {};
    [...this.radarOptions, ...this.autolooterOptions].forEach(option => {
      this.state[option.uid] = new imgui.MutableVariable(Settings[option.uid] !== undefined ? Settings[option.uid] : option.default);
    });
  }

  tick() {
    if (imgui.isKeyPressed(imgui.Key.Insert, false)) {
      this.show.value = !this.show.value;
    }

    if (this.show.value) {
      this.render(this.show);
    }
  }

  render(open) {
    const mainViewport = imgui.getMainViewport();
    const workPos = mainViewport.workPos;
    imgui.setNextWindowPos({ x: workPos.x + 20, y: workPos.y + 20 }, imgui.Cond.FirstUseEver);
    imgui.setNextWindowSize({ x: 300, y: 400 }, imgui.Cond.FirstUseEver);

    if (!imgui.begin("Nuclear", open)) {
      imgui.end();
      return;
    }

    if (imgui.beginTabBar("NuclearTabs")) {
      if (imgui.beginTabItem("Radar")) {
        this.renderRadarOptions();
        imgui.endTabItem();
      }

      if (imgui.beginTabItem("Autolooter")) {
        this.renderAutolooterOptions();
        imgui.endTabItem();
      }

      imgui.endTabBar();
    }

    imgui.end();
  }

  renderRadarOptions() {
    if (imgui.collapsingHeader("General Radar Settings")) {
      this.renderOptions(this.radarOptions.slice(0, 1)); // Enable Radar
    }
    if (imgui.collapsingHeader("Tracking Options")) {
      this.renderOptions(this.radarOptions.slice(1, 8)); // Track Herbs to Track Everything
    }
    if (imgui.collapsingHeader("Drawing Options")) {
      this.renderOptions(this.radarOptions.slice(8, 12)); // Draw Lines to Draw Debug Info
    }
    if (imgui.collapsingHeader("Distance Settings")) {
      this.renderOptions(this.radarOptions.slice(12)); // Radar Load Distance
    }
  }

  renderAutolooterOptions() {
    this.renderOptions(this.autolooterOptions);
  }

  renderOptions(options) {
    options.forEach(option => {
      if (option.type === "checkbox") {
        if (imgui.checkbox(option.text, this.state[option.uid])) {
          Settings[option.uid] = this.state[option.uid].value;
        }
      } else if (option.type === "slider") {
        if (imgui.sliderInt(option.text, this.state[option.uid], option.min, option.max)) {
          Settings[option.uid] = this.state[option.uid].value;
        }
      }
    });
  }
}

export default new NuclearWindow();
