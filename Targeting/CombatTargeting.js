import objMgr, { me } from "../Core/ObjectManager";
import Targeting from "./Targeting";
import PerfMgr from "../Debug/PerfMgr";
import colors from "@/Enums/Colors";
import Settings from "@/Core/Settings";

class CombatTargeting extends Targeting {
  constructor() {
    super();
    this.burstToggle = false;
  }

  update() {
    PerfMgr.begin("Combat Targeting");
    super.update();
    this.calculateBestTarget();
    //this.debugRenderTargets();
    this.drawBurstStatus();
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
      if (unit === me.target && Settings.AttackOOC) { return true; }
      if (!unit.inCombatWithMe) { return false; }
      return true;
    });
  }

  toggleBurst() {
    this.burstToggle = !this.burstToggle;
    console.info(`Burst mode ${this.burstToggle ? 'Enabled' : 'Disabled'}`);
  }

  debugRenderTargets() {
    const drawList = imgui.getBackgroundDrawList();
    if (!drawList || !me) { return; }
    const fromSC = wow.WorldFrame.getScreenCoordinates(me.position);
    this.targets.forEach(unit => {
      const toSC = wow.WorldFrame.getScreenCoordinates(unit.position);
      if (toSC.x > 0 && toSC.y > 0) {
        drawList.addLine(fromSC, toSC, colors.red);
      }
    });
  }

  drawBurstStatus() {
    if (this.burstToggle) {
      const drawList = imgui.getBackgroundDrawList();
      if (!drawList) { return; }

      const viewport = imgui.getMainViewport();
      const pos = {
        x: viewport.workPos.x + 10,
        y: viewport.workPos.y + viewport.workSize.y - 30
      };

      const text = "BURST MODE ENABLED";

      drawList.addText(text, pos, colors.green);
    }
  }

  calculateBestTarget() {
    if (this.targets.length === 0) return null;

    const targetPriority = Settings.TargetPriority;
    const facingTargets = this.targets.filter(target => me.isFacing(target));

    if (facingTargets.length === 0) return null;

    switch (targetPriority) {
      case "Closest":
        return facingTargets.reduce((closest, current) =>
          current.distanceTo(me) < closest.distanceTo(me) ? current : closest
        );
      case "Lowest Health":
        return facingTargets.reduce((lowest, current) =>
          current.health < lowest.health ? current : lowest
        );
      case "Highest Health":
        return facingTargets.reduce((highest, current) =>
          current.pctHealth > highest.pctHealth ? current : highest
        );
      default:
        return facingTargets[0];
    }
  }

  get bestTarget() {
    return this.calculateBestTarget();
  }
}

export const defaultCombatTargeting = new CombatTargeting();
export default CombatTargeting;
export const bestTarget = defaultCombatTargeting.bestTarget;
