import settings from "../Core/Settings";
import colors from "@/Enums/Colors";
import Radar from "@/Extra/Radar";

class NuclearWindow {
  constructor() {
    this.show = new imgui.MutableVariable(false);
    this.modules = [Radar]; // Add other modules here as needed

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
      const settingValue = settings[option.uid];

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
      }
    });
  }
}

export default new NuclearWindow();
