import objMgr, { me } from './Core/ObjectManager';
import dbgWindow from './Debug/DebugWindow';
import perfMgr from './Debug/PerfMgr';
import nuclear from './nuclear'
import _ from './Extensions/Extensions';

nuclear.initialize().then(() => {
  // our "main loop", called every tick
  setInterval(_ => {
    perfMgr.begin("total");
    objMgr.tick();
    nuclear.tick();
    dbgWindow.tick();
    perfMgr.end("total");
    perfMgr.render();
  }, 1);

  console.info("Nuclear initialized");
}).catch(reason => {
  console.error(`${reason}`);
  console.error(`${reason.stack}`);
});
