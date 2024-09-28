import settings from "@/Core/Settings";
import colors from "@/Enums/Colors";
import AntiAFK from "@/Extra/AntiAFK";
import Autolooter from "@/Extra/Autolooter";
import Radar from "@/Extra/Radar";
import General from "@/Extra/General";
import ProfileSettings from "@/Extra/ProfileSettings";
import nuclear from "@/nuclear";
import { me } from "@/Core/ObjectManager";

class NuclearWindow {
  constructor() {
    this.show = new imgui.MutableVariable(false);
    this.modules = [General, Radar, Autolooter, AntiAFK, ProfileSettings]; // Add other modules here as needed
    this.initialized = false;
    // Initialize state for each option from Settings
    this.state = {};
    this.modules.forEach(module => {
      module.options.forEach(option => {
        const settingValue = settings[option.uid];
        const defaultValue = option.default;
        this.state[option.uid] = new imgui.MutableVariable(settingValue !== undefined ? settingValue : defaultValue);
      });
    });
    // Color definitions
    this.colors = {
      headerColor: colors.blue,
      enabledColor: colors.green,
      disabledColor: colors.lightgrey
    };
  }

  tick() {
    if (!me) {
      return;
    }

    if (imgui.isKeyPressed(imgui.Key.Insert, false)) {
      this.show.value = !this.show.value;
    }
    if (this.show.value) {
      this.render(this.show);
    }
  }

  initializeSettings() {
    if (this.initialized) {
      return;
    }

    const unsetOptions = this.modules
      .flatMap(module => module.options)
      .filter(option => !option.header && settings[option.uid] === undefined);

    if (unsetOptions.length > 0) {
      unsetOptions.forEach(option => {
        settings[option.uid] = option.default;
      });
      settings.saveSettings();
    }

    this.initialized = true;
  }

  render(open) {
    const mainViewport = imgui.getMainViewport();
    const workPos = mainViewport.workPos;
    imgui.setNextWindowPos({ x: workPos.x + 20, y: workPos.y + 20 }, imgui.Cond.FirstUseEver);
    imgui.setNextWindowSize({ x: 300, y: 400 }, imgui.Cond.FirstUseEver);

    imgui.pushStyleColor(imgui.Col.Text, [1.0, 1.0, 1.0, 1.0]);
    imgui.pushStyleColor(imgui.Col.WindowBg, [0.1, 0.1, 0.1, 0.9]);

    if (!imgui.begin("Nuclear", open)) {
      imgui.popStyleColor(2);
      imgui.end();
      return;
    }

    if (imgui.beginTabBar("NuclearTabs")) {
      this.modules.forEach(module => {
        if (imgui.beginTabItem(module.tabName)) {
          module.renderOptions(this.renderOptionsGroup.bind(this));
          imgui.endTabItem();
        }
      });
      imgui.endTabBar();
    }

    imgui.popStyleColor(2);
    imgui.end();
  }

  renderOptionsGroup(groups) {
    groups.forEach(group => {
      imgui.pushStyleColor(imgui.Col.Header, this.colors.headerColor);
      if (imgui.collapsingHeader(group.header)) {
        imgui.popStyleColor();
        this.renderOptions(group.options);
      } else {
        imgui.popStyleColor();
      }
    });
  }

  renderOptions(options) {
    options.forEach(option => {
      if (option.header) {
        imgui.text(option.header);
        imgui.separator();
        if (option.options) {
          this.renderOptions(option.options);
        }
      } else {
        const settingValue = settings[option.uid];
        if (!this.state[option.uid]) {
          this.state[option.uid] = new imgui.MutableVariable(settingValue !== undefined ? settingValue : option.default);
        }
        if (option.type === "checkbox") {
          this.state[option.uid].value = settingValue !== undefined ? settingValue : option.default;
          imgui.pushStyleColor(imgui.Col.Text, this.state[option.uid].value ? this.colors.enabledColor : this.colors.disabledColor);
          if (imgui.checkbox(option.text, this.state[option.uid])) {
            settings[option.uid] = this.state[option.uid].value;
          }
          imgui.popStyleColor();
        } else if (option.type === "slider") {
          this.state[option.uid].value = settingValue !== undefined ? settingValue : option.default;
          if (imgui.sliderInt(option.text, this.state[option.uid], option.min, option.max)) {
            settings[option.uid] = this.state[option.uid].value;
          }
        } else if (option.type === "combobox") {
          this.state[option.uid].value = settingValue !== undefined ? settingValue : option.default;
          if (imgui.beginCombo(option.text, this.state[option.uid].value)) {
            option.options.forEach(item => {
              const isSelected = (item === this.state[option.uid].value);
              if (imgui.selectable(item, isSelected)) {
                const oldValue = this.state[option.uid].value;
                this.state[option.uid].value = item;
                settings[option.uid] = item;
                if (option.uid === "profileSelector" && oldValue !== item) {
                  const specializationId = wow.SpecializationInfo.activeSpecializationId;
                  const profileKey = `profile${specializationId}`;
                  settings[profileKey] = item;
                  nuclear.rebuild();  // Call rebuild after changing the profile
                }
              }
              if (isSelected) {
                imgui.setItemDefaultFocus();
              }
            });
            imgui.endCombo();
          }
        }
      }
    });
  }
}

export default new NuclearWindow();
