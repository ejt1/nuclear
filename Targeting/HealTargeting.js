import Targeting from './Targeting'; // Assuming Targeting is our base class
import { me } from "../Core/ObjectManager";
import { UnitFlags } from "../Enums/Flags";
import ClassType from "../Enums/Specialization";

class HealTargeting extends Targeting {
  constructor() {
    super();
    this.priorityList = []; // Treating this as an array consistently
    this.friends = {
      Tanks: [],
      DPS: [],
      Healers: [],
      All: []
    };
    this.afflicted = [];
  }

  getPriorityList() {
    return this.priorityList;
  }

  /**
   * Returns the top priority target in the priority list, sorted by the lowest healthPct.
   * Targets with healthPct > 0 are filtered out. Returns undefined if no valid targets exist.
   * @returns {CGUnit | undefined} - The top priority target or undefined if the list is empty.
   */
  getPriorityTarget() {
    if (this.priorityList.length > 0) {
      // Filter out targets with healthPct greater than 0
      const validTargets = this.priorityList.filter(entry => entry.unit.pctHealth > 0);

      // Sort valid targets by healthPct in ascending order
      validTargets.sort((a, b) => a.unit.pctHealth - b.unit.pctHealth);

      // Return the unit with the lowest healthPct, or undefined if no valid targets exist
      return validTargets.length > 0 ? validTargets[0].unit : undefined;
    }

    return undefined;
  }

  update() {
    super.update();
  }

  reset() {
    // Resetting priority list and friends
    this.priorityList = [];
    this.friends = {
      Tanks: [],
      DPS: [],
      Healers: [],
      All: []
    };
    this.healTargets = [];
    this.afflicted = [];
  }

  wantToRun() {
    if (!me) return false;
    if (me.isMounted) return false;
    if (me.unitFlags & UnitFlags.LOOTING) return false;
    if (me.hasAura("Preparation")) return false;
    return true;
  }

  collectTargets() {
    const flags = wow.ObjectType.Unit | wow.ObjectType.Player | wow.ObjectType.ActivePlayer;
    const units = me.getFriends();

    // Copying unit list to healTargets
    units.forEach((u, k) => {
      this.healTargets[k] = u;
    });
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
      // if (u.isHealImmune()) return false; // TODO

      return true;
    });
  }

  inclusionFilter() {
    // Placeholder for additional inclusion logic if needed
  }

  weighFilter() {
    const manaMulti = 30;
    const target = me.targetUnit;

    this.healTargets.forEach(u => {
      let priority = 0;
      let isTank = false;
      let isDPS = false;
      let isHeal = false;

      const member = me.currentParty.getPartyMemberByGuid(u.guid);

      // Skipping if the unit is not relevant
      if (!member && me.guid !== u.guid && target !== u) return;

      if (target && target === u) {
        priority += 20;
      }

      if (member) {
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

      priority += (100 - u.pctHealth); // Higher priority for lower health
      priority -= ((100 - me.pctPower) * (manaMulti / 100)); // Lower priority based on mana

      // Adding valid units to priorityList
      if (priority > 0 || u.inCombat()) {
        this.priorityList.push({ unit: u, priority: priority }); // Use push to add to the array
      }

      // Classifying units into tanks, DPS, and healers
      if (isTank) {
        this.friends.Tanks.push(u);
      } else if (isDPS) {
        this.friends.DPS.push(u);
      } else if (isHeal) {
        this.friends.Healers.push(u);
      }

      this.friends.All.push(u);
    });

    // Sorting priorityList by priority in descending order
    this.priorityList.sort((a, b) => b.priority - a.priority);
  }

  // Commented-out methods for future use
  // getLowestMember() {
  //   return this.priorityList[0] && this.priorityList[0].unit;
  // }
  //
  // getMembersBelow(pct) {
  //   let count = 0;
  //   const members = [];
  //
  //   for (const { unit } of Object.values(this.priorityList)) {
  //     if (unit.healthPct < pct) {
  //       members.push(unit);
  //       count++;
  //     }
  //   }
  //
  //   return { members, count };
  // }
  //
  // getMembersAround(friend, dist, threshold = 100) {
  //   let count = 0;
  //   const members = [];
  //
  //   for (const { unit } of Object.values(this.priorityList)) {
  //     if (friend !== unit && friend.getDistance(unit) <= dist && unit.healthPct < threshold) {
  //       members.push(unit);
  //       count++;
  //     }
  //   }
  //
  //   return { members, count };
  // }
}

// Export HealTargeting as a singleton instance
export const defaultHealTargeting = new HealTargeting;
export default HealTargeting;
