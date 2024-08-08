import objMgr from './Core/ObjectManager';
import dbgWindow from './Debug/DebugWindow';
import perfMgr from './Debug/PerfMgr';
import nuclear from './nuclear'

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

objMgr.tick();
if (objMgr.me) {
  const me = objMgr.me;
  const arcaneShot = wow.SpellBook.getSpellByName("Arcane Shot");
  console.debug(`Arcane Shot? ${arcaneShot?.id}`);
  const bloodThirst = wow.SpellBook.getSpellByName("Bloodthirst");
  console.debug(`Bloodthirst? ${bloodThirst?.id}`);
}
