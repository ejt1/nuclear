import objMgr, { me } from './Core/ObjectManager';
import dbgWindow from './Debug/DebugWindow';
import perfMgr from './Debug/PerfMgr';
import nuclear from './nuclear';
import extensions from './Extensions/Extensions';
import data from './Data/Data';
import nuclearWindow from './GUI/NuclearWindow';
import Settings from './Core/Settings';
import Radar from './Extra/Radar';
import Autolooter from './Extra/Autolooter';
import AntiAFK from './Extra/AntiAFK';
import General from './Extra/General';
import commandListener from './Core/CommandListener';
import colors from './Enums/Colors';

let pauseCore = false;

const extraModules = [General, Radar, Autolooter, AntiAFK];

nuclear.initialize().then(() => {
  // our "main loop", called every tick
  setInterval(_ => {
    if (imgui.isKeyPressed(imgui.Key.Pause, false)) {
      pauseCore = !pauseCore;
    }

    if (pauseCore) {
      imgui.getBackgroundDrawList()?.addText("PAUSED", {x: 20, y: 20}, colors.red);
      return;
    }

    perfMgr.begin("total");
    objMgr.tick();
    nuclear.tick();
    me && extraModules.forEach(module => module.tick());
    dbgWindow.tick();
    commandListener.renderQueuedSpells();
    nuclearWindow.tick();
    perfMgr.end("total");
    perfMgr.render();
  }, 1);

  console.info("Nuclear initialized");
}).catch(reason => {
  console.error(`${reason}`);
  console.error(`${reason.stack}`);
});
