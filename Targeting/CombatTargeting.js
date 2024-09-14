import objMgr, { me } from "../Core/ObjectManager";
import Targeting from "./Targeting";
import PerfMgr from "../Debug/PerfMgr";
import colors from "@/Enums/Colors";
import Settings from "@/Core/Settings";
import { TraceLineHitFlags } from '@/Enums/Flags';
import CGUnit from "@/Extensions/CGUnit";

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
    this.drawBestTargetCircle();
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
      if (unit.isImmune()) { return false; }
      if (unit === me.target && Settings.AttackOOC) { return true; }
      if (!unit.inCombatWithMe && !wow.Party.currentParty?.isUnitInCombatWithParty(unit)) { return false; }
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

  drawBestTargetCircle() {
    if (!Settings.RenderBestTargetCircle || !this.bestTarget) return;

    const drawList = imgui.getBackgroundDrawList();
    if (!drawList) return;

    const targetPos = this.bestTarget.position;
    const radius = this.bestTarget.boundingRadius;
    const segments = 16;
    const points = [];

    const twoPi = 2 * Math.PI;
    const angleIncrement = twoPi / segments;
    const zOffset = 5;

    const from = new Vector3(0, 0, targetPos.z + zOffset);
    const to = new Vector3(0, 0, targetPos.z - zOffset);

    for (let i = 0; i <= segments; i++) {
      const angle = i * angleIncrement;
      const x = targetPos.x + radius * Math.cos(angle);
      const y = targetPos.y + radius * Math.sin(angle);

      from.x = to.x = x;
      from.y = to.y = y;

      const result = wow.World.traceLine(from, to, TraceLineHitFlags.COLLISION);

      if (result.hit) {
        const screenPos = wow.WorldFrame.getScreenCoordinates(result.wp);
        if (screenPos) {
          points.push(screenPos);
        }
      }
    }

    if (points.length > 1) {
      drawList.addPolyline(points, colors.yellow, 0, 2);
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
          current.health > highest.health ? current : highest
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
