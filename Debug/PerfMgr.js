class PerfMgr {
  constructor() {
    /** @type {Map<string, object>} */
    this.renderTimes = new Map();
    /** @type {Boolean} */
    this.enabled = false;
  }

  begin(name) {
    if (!this.renderTimes.has(name)) {
      const obj = {
        currentTime: Date.now(),
        history: new Array(100),
        historyIndex: 0,
      }
      for (let n = 0; n < obj.history.length; ++n) {
        obj.history[n] = 0;
      }
      this.renderTimes.set(name, obj);
    } else {
      const obj = this.renderTimes.get(name);
      obj.currentTime = Date.now();
    }
  }

  end(name) {
    const obj = this.renderTimes.get(name);
    if (!obj) { return; }

    const elapsed = Date.now() - obj.currentTime;
    obj.history[obj.historyIndex++] = elapsed;
    if (obj.historyIndex == obj.history.length) {
      obj.historyIndex = 0;
    }
  }

  render() {
    if (!this.enabled) {
      return;
    }
    let perfWindowFlags = imgui.WindowFlags.None;
    perfWindowFlags |= imgui.WindowFlags.NoBackground;
    perfWindowFlags |= imgui.WindowFlags.NoCollapse;
    perfWindowFlags |= imgui.WindowFlags.NoFocusOnAppearing;
    perfWindowFlags |= imgui.WindowFlags.NoResize;
    perfWindowFlags |= imgui.WindowFlags.NoTitleBar;
    const mainViewport = imgui.getMainViewport();
    const workSize = mainViewport.workSize;
    imgui.setNextWindowSize({ x: 0, y: 0 }, imgui.Cond.Always);
    imgui.setNextWindowPos({ x: 0, y: 0 });

    imgui.begin("Perf", undefined, perfWindowFlags);
    this.renderTimes.forEach((obj, name) => {
      let average = 0;
      let maxValue = 5;
      for (let n = 0; n < obj.history.length; ++n) {
        average += obj.history[n];
        if (obj.history[n] > maxValue) {
          maxValue = Math.ceil(obj.history[n]) + 1;
        }
      }
      average /= obj.history.length;

      imgui.plotLines(`${name}##perf`, obj.history, `avg ${average}`, undefined, 0, maxValue, { x: 100, y: 0 });
    });
    imgui.end();
  }
}

export default new PerfMgr();
