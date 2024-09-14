import Targeting from './Targeting'; // Assuming Targeting is our base class
import { me } from "../Core/ObjectManager";
import PerfMgr from "../Debug/PerfMgr";
import { UnitFlags } from "../Enums/Flags";
import ClassType from "../Enums/Specialization";
import PartyMember from "@/Extensions/PartyMember";

class HealTargeting extends Targeting {
  constructor() {
    super();
    /** @type {Array<{ u: wow.CGUnit, priority: number}>} */
    this.priorityList = new Array(); // Treating this as an array consistently
    this.friends = {
      /** @type {Array<wow.CGUnit>} */
      Tanks: new Array(),
      /** @type {Array<wow.CGUnit>} */
      DPS: new Array(),
      /** @type {Array<wow.CGUnit>} */
      Healers: new Array(),
      /** @type {Array<wow.CGUnit>} */
      All: new Array()
    };
    /** @type {Array<wow.CGUnit>} */
    this.afflicted = new Array();
  }

  /**
   * Returns the top priority target in the priority list, sorted by the lowest healthPct.
   * Targets with healthPct > 0 are filtered out. Returns undefined if no valid targets exist.
   * @returns {CGUnit | undefined} - The top priority target or undefined if the list is empty.
   */
  getPriorityTarget() {
    if (this.priorityList.length > 0) {
      // Filter out targets with healthPct greater than 0
      const validTargets = this.priorityList.filter(entry => entry.predictedHealthPercent > 0);

      // Sort valid targets by healthPct in ascending order
      validTargets.sort((a, b) => a.predictedHealthPercent - b.predictedHealthPercent);

      // Return the unit with the lowest healthPct, or undefined if no valid targets exist
      return validTargets.length > 0 ? validTargets[0] : undefined;
    }

    return undefined;
  }

  update() {
    PerfMgr.begin("Heal Targeting");
    super.update();
    PerfMgr.end("Heal Targeting");
  }

  reset() {
    super.reset()
    // Resetting priority list and friends
    this.priorityList = new Array();
    this.friends = {
      Tanks: new Array(),
      DPS: new Array(),
      Healers: new Array(),
      All: new Array()
    };
    this.healTargets = new Array();
    this.afflicted = new Array();
  }

  wantToRun() {
    if (!me) return false;
    if (me.isMounted) return false;
    if (me.unitFlags & UnitFlags.LOOTING) return false;
    if (me.hasAura("Preparation")) return false;
    return true;
  }

  collectTargets() {
    const units = me.getFriends();

    // Copying unit list to healTargets
    units.forEach((u, k) => {
      this.healTargets[k] = u;
    });

    if (!units.some(unit => unit.guid.equals(me.guid))) {
      this.healTargets.push(me);
    }
  }

  exclusionFilter() {
    const specialUnits = {
      afflicted: 204773 // Afflicted Soul, M+ Affix, heal to full or dispel.
    };

    // Filtering out targets based on conditions
    this.healTargets = this.healTargets.filter(u => {
      if (u.entryId === specialUnits.afflicted) {
        this.afflicted.push(u);
        return false;
      }

      if (me.canAttack(u)) return false;
      if (u.deadOrGhost || u.health <= 1) return false;
      if (me.distanceTo(u) > 40) return false;
      if (!me.withinLineOfSight(u)) return false;
      if (u.isHealImmune()) return false;

      return true;
    });
  }

  isHealImmune() {
    return false;
  }

  inclusionFilter() {
    // Placeholder for additional inclusion logic if needed
  }

  weighFilter() {
    const manaMulti = 30;
    const target = me.targetUnit;

    // Temporary array to store units along with their calculated priority
    const weightedUnits = [];

    this.healTargets.forEach(u => {
      let priority = 0;
      let isTank = false;
      let isDPS = false;
      let isHeal = false;

      let member = null;
      if (me.guid.equals(u.guid)) {
        priority += 5
        member = me;
      } else {
        member = me.currentParty?.getPartyMemberByGuid(u.guid);
      }

      if (!member && !me.guid.equals(u.guid) && target !== u) return;

      if (me.guid.equals(u.guid)) {
        priority += 5;
      }

      if (target && target === u) {
        priority += 20;
      }

      if (member instanceof wow.PartyMember) {
        if (member.isTank()) {
          if (u.class !== ClassType.DeathKnight) {
            priority += 20;
          }
          isTank = true;
        }

        if (member.isHealer()) {
          priority += 15;
          isHeal = true;
        }

        if (member.isDamage()) {
          priority += 5;
          isDPS = true;
        }
      }

      priority += (100 - u.predictedHealthPercent); // Higher priority for lower health
      priority -= ((100 - me.pctPower) * (manaMulti / 100)); // Lower priority based on mana

      if (priority > 0 || u.inCombat()) {
        // Add the unit to weightedUnits with its calculated priority
        weightedUnits.push({ unit: u, priority: priority });
      }

      if (isTank) {
        this.friends.Tanks.push(u);
      } else if (isDPS) {
        this.friends.DPS.push(u);
      } else if (isHeal) {
        this.friends.Healers.push(u);
      }

      this.friends.All.push(u);
    });

    // Sort the weightedUnits array by priority in descending order
    weightedUnits.sort((a, b) => b.priority - a.priority);

    // Map the sorted weightedUnits to extract just the units
    this.priorityList = weightedUnits.map(wu => wu.unit);
  }
}

// Export HealTargeting as a singleton instance
export const defaultHealTargeting = new HealTargeting;
export default HealTargeting;
