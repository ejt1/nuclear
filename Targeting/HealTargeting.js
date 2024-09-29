import Targeting from './Targeting'; // Assuming Targeting is our base class
import { me } from "../Core/ObjectManager";
import PerfMgr from "../Debug/PerfMgr";
import { UnitFlags } from "../Enums/Flags";
import ClassType from "../Enums/Specialization";
import PartyMember from "@/Extensions/PartyMember";

class HealTargeting extends Targeting {
  constructor() {
    super();
    /** @type {Array<wow.CGUnit}>} */
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
      const validTargets = this.priorityList.filter(entry => entry.effectiveHealthPercent > 0);

      // Sort valid targets by healthPct in ascending order
      validTargets.sort((a, b) => a.effectiveHealthPercent - b.effectiveHealthPercent);

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
    /** @type {wow.CGUnit} */
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
    // Directly assign the result of me.getFriends() to this.healTargets
    this.healTargets = me.getFriends();

    // Use find to avoid repeated searching
    if (!this.healTargets.find(unit => unit.guid.equals(me.guid))) {
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
      if (u.hasVisibleAura("Spirit of Redemption")) return false;
      if (me.distanceTo(u) > 40) return false;
      if (!me.withinLineOfSight(u)) return false;
      if (u.isHealImmune()) return false;
      if (!u.guid.equals(me.guid) && u.isHealImmuneAllButMe()) return false;

      return true;
    });
  }

  inclusionFilter() {
    // Placeholder for additional inclusion logic if needed
  }

  weighFilter() {
    const manaMulti = 30;
    const target = me.targetUnit;
    const weightedUnits = [];

    // Cache guid comparison result for efficiency
    const isMe = (u) => me.guid.equals(u.guid);

    this.healTargets.forEach(u => {
      let priority = 0;
      let isTank = false;
      let isDPS = false;
      let isHeal = false;

      let member = isMe(u) ? me : me.currentParty?.getPartyMemberByGuid(u.guid);

      // Skip if no valid member and not the player itself
      if (!member && !isMe(u) && target !== u) return;

      // If it's me, add extra priority
      if (isMe(u)) {
        priority += 10; // Combined two checks into one, 5+5
      }

      // Add extra priority for being the current target
      if (target === u) {
        priority += 20;
      }

      // Check for party member roles (Tank, Healer, DPS)
      if (member instanceof wow.PartyMember) {
        if (member.isTank()) {
          if (u.class !== ClassType.DeathKnight) {
            priority += 20; // Non-DK Tanks get more priority
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

      // Adjust priority based on health and mana
      priority += (100 - u.effectiveHealthPercent); // Higher priority for lower health
      priority -= ((100 - me.pctPower) * (manaMulti / 100)); // Lower priority based on mana

      // Include units that have positive priority or are in combat
      if (priority > 0 || u.inCombat()) {
        weightedUnits.push({ unit: u, priority });
      }

      // Add unit to appropriate friend categories (Tank, DPS, Healer)
      if (isTank) {
        this.friends.Tanks.push(u);
      } else if (isDPS) {
        this.friends.DPS.push(u);
      } else if (isHeal) {
        this.friends.Healers.push(u);
      }

      // Add to the general 'All' friend list
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
