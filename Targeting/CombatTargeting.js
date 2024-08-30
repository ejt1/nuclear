import objMgr, { me } from "../Core/ObjectManager";
import Targeting from "./Targeting";
import PerfMgr from "../Debug/PerfMgr";

class CombatTargeting extends Targeting {
  constructor() {
    super();
  }

  update() {
    PerfMgr.begin("Combat Targeting");
    super.update();
    PerfMgr.end("Combat Targeting");
  }

  reset() {
    super.reset();
  }

  wantToRun() {
    return true;
  }

  collectTargets() {
    objMgr.objects.forEach(obj => {
      if (obj.typeFlags & wow.ObjectType.Unit) {
        this.targets.push(obj);
      }
    });
    return this.targets;
  }

  exclusionFilter() {
    this.targets = this.targets.filter(obj => {
      /** @type {wow.CGUnit} */
      const unit = obj;
      if (!unit.isAttackable) { return false; }
      if (unit.isDeadOrGhost || unit.health <= 1) { return false; }
      if (unit.distanceTo(me) >= 40) { return false; }
      if (!unit.inCombatWithMe) { return false; }
      return true;
    });
  }

  debugRenderTargets() {
    const drawList = imgui.getBackgroundDrawList();
    if (!drawList || !me) { return; }

    const fromSC = wow.WorldFrame.getScreenCoordinates(me.position);
    this.targets.forEach(unit => {
      const toSC = wow.WorldFrame.getScreenCoordinates(unit.position);
      if (toSC.x > 0 && toSC.y > 0) {
        drawList.addLine(fromSC, toSC, imgui.getColorU32({ r: 255, g: 0, b: 0, a: 255 }));
        //drawList.addText(`TTD: ${unit.timeToDeath().toFixed(2)}`, { x: toSC.x - 10, y: toSC.y }, imgui.getColorU32({ r: 255, g: 255, b: 0, a: 255 }));
      }
    });
  }
}

export const defaultCombatTargeting = new CombatTargeting;
export default CombatTargeting;
