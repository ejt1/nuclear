import objMgr, { me } from "@/Core/ObjectManager";
import Common from "@/Core/Common";
import { MovementFlags, TraceLineHitFlags, UnitFlags } from "@/Enums/Flags";

const originalTargetGetter = Object.getOwnPropertyDescriptor(wow.CGUnit.prototype, 'target').get;
const originalAurasGetter = Object.getOwnPropertyDescriptor(wow.CGUnit.prototype, 'auras').get;
const originalVisibleAurasGetter = Object.getOwnPropertyDescriptor(wow.CGUnit.prototype, 'visibleAuras').get;
const cacheTimeMs = 500;

Object.defineProperties(wow.CGUnit.prototype, {
  target: {
    get: function () {
      const targetGuid = originalTargetGetter.call(this);
      return objMgr.findObject(targetGuid);
    }
  },

  auras: {
    get: function () {
      if (this._cacheAuras === undefined || this._cacheAurasRefreshTime < wow.frameTime) {
        this._cacheAuras = originalAurasGetter.call(this);
        this._cacheAurasRefreshTime = wow.frameTime + cacheTimeMs;
      }
      return this._cacheAuras;
    }
  },

  visibleAuras: {
    get: function () {
      if (this._cacheVisibleAuras === undefined || this._cacheVisibleAurasRefreshTime < wow.frameTime) {
        this._cacheVisibleAuras = originalVisibleAurasGetter.call(this);
        this._cacheVisibleAurasRefreshTime = wow.frameTime + cacheTimeMs;
      }
      return this._cacheVisibleAuras;
    }
  },

  targetUnit: {
    /**
     * Get the resolved target as a CGUnit object, converting from Guid if necessary.
     * @returns {wow.CGUnit | undefined} - The corresponding CGUnit object or undefined if not found.
     */
    get: function () {
      // If the target is already a CGUnit, return it directly
      if (this.target instanceof wow.CGUnit) {
        return this.target;
      }

      // If the target is a Guid, attempt to resolve it to a CGUnit
      if (this.target instanceof wow.Guid) {
        return objMgr.findObject(this.target);
      }

      // If neither, return undefined
      return undefined;
    }
  },

  /**
   * Estimate the time to death for this unit based on its current health percentage and the elapsed time.
   *
   * @returns {number} The estimated time to death in seconds, or a large number (9999) if the time cannot be determined.
   */
  timeToDeath: {
    value: function () {
      if (!this._ttdHistory) {
        this._ttdHistory = {};
      }

      const uid = this.guid.low;
      const t = wow.frameTime;
      const curhp = this.pctHealth;

      if (this._ttdHistory[uid]) {
        const o = this._ttdHistory[uid];
        const hpdiff = o.inithp - curhp;
        const tdiff = t - o.inittime;

        const hps = hpdiff / (tdiff / 1000); // Health per second

        if (hps > 0) {
          o.ttd = curhp / hps;
        }

        return o.ttd;
      } else {
        this._ttdHistory[uid] = { inittime: t, inithp: curhp, ttd: 9999 };
      }

      return 9999;
    }
  },

  isPlayer: {
    /**
     * Check if the unit is player or active player
     * @returns {boolean} - Returns true if the unit is a player or active player.
     */
    value: function () {
      // Check if `this.type` is either 6 (player) or 7 (active player)
      return this.type === wow.ObjectTypeID.Player || this.type === wow.ObjectTypeID.ActivePlayer;
    }
  },

  hasAuraByMe: {
    /**
     * Check if the unit has an aura by name or spell ID, cast by the player.
     * @param {string|number} nameOrId - The name of the aura or the spell ID.
     * @returns {boolean} - Returns true if the aura is found and cast by the player.
     */
    value: function (nameOrId) {
      /** @type {Array<wow.AuraData>} */
      const auras = this.auras;
      return auras.some((aura) => {
        const isMatch =
          (typeof nameOrId === 'number' && aura.spellId === nameOrId) ||
          (typeof nameOrId === 'string' && aura.name === nameOrId);

        return isMatch && aura.casterGuid && me.guid && me.guid.equals(aura.casterGuid);
      });
    }
  },

  hasAura: {
    /**
     * Check if the unit has an aura by name or spell ID.
     * @param {string|number} nameOrId - The name of the aura or the spell ID.
     * @returns {boolean} - Returns true if the aura is found by name or spell ID.
     */
    value: function (nameOrId) {
      if (typeof nameOrId === 'number') {
        return this.auras.some(aura => aura.spellId === nameOrId);
      } else if (typeof nameOrId === 'string') {
        return this.auras.some(aura => aura.name === nameOrId);
      }
      return false;
    }
  },


  hasVisibleAura: {
    /**
     * Check if the unit has a visible aura by name or spell ID.
     * @param {string|number} nameOrId - The name of the visible aura or the spell ID.
     * @returns {boolean} - Returns true if the visible aura is found by name or spell ID.
     */
    value: function (nameOrId) {
      if (typeof nameOrId === 'number') {
        return this.visibleAuras.some(visibleAura => visibleAura.spellId === nameOrId);
      } else if (typeof nameOrId === 'string') {
        return this.visibleAuras.some(visibleAura => visibleAura.name === nameOrId);
      }
      return false;
    }
  },

  hasVisibleAuraByMe: {
    /**
     * Check if the unit has a visible aura by name or spell ID, cast by the player.
     * @param {string|number} nameOrId - The name of the visible aura or the spell ID.
     * @returns {boolean} - Returns true if the visible aura is found and cast by the player.
     */
    value: function (nameOrId) {
      /** @type {Array<wow.AuraData>} */
      const visibleAuras = this.visibleAuras;
      return visibleAuras.some((visibleAura) => {
        const isMatch =
          (typeof nameOrId === 'number' && visibleAura.spellId === nameOrId) ||
          (typeof nameOrId === 'string' && visibleAura.name === nameOrId);

        return isMatch && visibleAura.casterGuid && me.guid && me.guid.equals(visibleAura.casterGuid);
      });
    }
  },

  getAura: {
    /**
     * Get the aura by name or spell ID.
     * @param {string|number} nameOrId - The name of the aura or the spell ID.
     * @returns {wow.AuraData|null} - Returns the aura if found, or null if not found.
     */
    value: function (nameOrId) {
      if (typeof nameOrId === 'number') {
        // Get by spell ID
        return this.auras.find(aura => aura.spellId === nameOrId) || undefined;
      } else if (typeof nameOrId === 'string') {
        // Get by aura name
        return this.auras.find(aura => aura.name === nameOrId) || undefined;
      }
      return undefined;
    }
  },

  getAuraByMe: {
    /**
     * Get the aura by name or spell ID, cast by the player.
     * @param {string|number} nameOrId - The name of the aura or the spell ID.
     * @returns {wow.AuraData|undefined} - Returns the aura if found and cast by the player, or undefined if not found.
     */
    value: function (nameOrId) {
      // Retrieve the aura using the getAura method
      const aura = this.auras.find((aura) => {
        const isMatch =
          (typeof nameOrId === 'number' && aura.spellId === nameOrId) ||
          (typeof nameOrId === 'string' && aura.name === nameOrId);

        // Check if the aura was cast by the player
        return isMatch && aura.casterGuid && me.guid && me.guid.equals(aura.casterGuid);
      });

      // Return the aura if found, otherwise return undefined
      return aura || undefined;
    }
  },


  getAuraStacks: {
    /**
     * Get the number of stacks for the specified aura by name or spell ID.
     * @param {string|number} nameOrId - The name of the aura or the spell ID.
     * @returns {number} - Returns the stack count if the aura is found, otherwise returns 0.
     */
    value: function (nameOrId) {
      // Get the aura using the existing getAura method
      const aura = this.getAuraByMe(nameOrId);

      // If the aura is found, return the stack count, otherwise return 0
      return aura ? aura.stacks || 0 : 0;
    }
  },

  getUnitsAround: {
    /**
     * Get an array of units within a specified distance of this unit.
     * @param {number} distance - The maximum distance to check for nearby units.
     * @returns {Array<wow.CGUnit>} - An array of CGUnit objects within the specified distance.
     */
    value: function (distance) {
      const nearbyUnits = [];

      objMgr.objects.forEach((obj) => {
        if (obj instanceof wow.CGUnit && obj !== this && Common.validTarget(obj)) {
          const distanceToUnit = this.distanceTo(obj);
          if (distanceToUnit <= distance) {
            nearbyUnits.push(obj);
          }
        }
      });

      return nearbyUnits;
    }
  },

  getUnitsAroundCount: {
    /**
     * Get the count of units within a specified distance of this unit.
     * @param {number} [distance=5] - The maximum distance to check for nearby units. Defaults to 5 if not specified.
     * @returns {number} - The count of units within the specified distance.
     */
    value: function (distance = 5) {
      return this.getUnitsAround(distance).length;
    }
  },

  isMoving: {
    /**
     * Check if the unit is moving based on movement flags.
     * @returns {boolean} - Returns true if the unit is moving in any direction.
     */
    value: function () {
      const movingMask =
        MovementFlags.FORWARD |
        MovementFlags.BACKWARD |
        MovementFlags.STRAFE_LEFT |
        MovementFlags.STRAFE_RIGHT |
        MovementFlags.FALLING |
        MovementFlags.PITCH_UP | // Ascending equivalent
        MovementFlags.PITCH_DOWN; // Descending equivalent

      return (this.movementInfo.flags & movingMask) !== 0;
    }
  },

  inCombat: {
    /**
     * Check if the unit is in combat.
     * @returns {boolean} - Returns true if the unit is in combat.
     */
    value: function () {
      return (this.unitFlags & UnitFlags.IN_COMBAT) !== 0;
    }
  },

  inCombatWith: {
    value: function (unit) {
      return this.threats.find(guid => guid.equals(unit)) !== undefined;
    }
  },

  /** @this {wow.CGUnit} */
  inCombatWithMe: {
    get: function () {
      return me.inCombatWith(this);
    }
  },

  /** @this {wow.CGUnit} */
  inCombatWithParty: {
    get: function () {
      if (!this.inCombat) {
        return false;
      }
      const party = wow.Party.currentParty;
      if (!party) {
        return this.inCombatWithMe;
      }
      return party.members.find(member => {
        const partyUnit = objMgr.findObject(member.guid);
        if (!partyUnit) { return false; }
        return partyUnit.inCombatWith(this);
      }) !== undefined;
    }
  },

  isSwimming: {
    /**
     * Check if the unit is swimming based on movement flags.
     * @returns {boolean} - Returns true if the unit is swimming.
     */
    value: function () {
      return (this.movementInfo.flags & MovementFlags.SWIMMING) !== 0;
    }
  },

  isStunned: {
    /**
     * Check if the unit is stunned based on unit flags.
     * @returns {boolean} - Returns true if the unit is stunned.
     */
    value: function () {
      return (this.unitFlags & UnitFlags.STUNNED) !== 0;
    }
  },

  isRooted: {
    /**
     * Check if the unit is rooted based on movement flags.
     * @returns {boolean} - Returns true if the unit is rooted.
     */
    value: function () {
      return (this.movementInfo.flags & MovementFlags.ROOT) !== 0;
    }
  },

  isSilenced: {
    /**
     * Check if the unit is silenced based on unit flags.
     * @returns {boolean} - Returns true if the unit is silenced.
     */
    value: function () {
      return (this.unitFlags & UnitFlags.PACIFIED) !== 0;
    }
  },

  isFeared: {
    /**
     * Check if the unit is feared based on unit flags.
     * @returns {boolean} - Returns true if the unit is feared.
     */
    value: function () {
      return (this.unitFlags & UnitFlags.FLEEING) !== 0;
    }
  },

  angleToXY: {
    /**
     * Calculate the angle from one set of coordinates to another, taking into account the unit's facing direction.
     * @param {number} x1 - The X coordinate of the starting point.
     * @param {number} y1 - The Y coordinate of the starting point.
     * @param {number} x2 - The X coordinate of the target point.
     * @param {number} y2 - The Y coordinate of the target point.
     * @returns {number} - The angle in degrees between the unit's facing direction and the target.
     */
    value: function (x1, y1, x2, y2) {
      // Calculate the angle to the target
      let angle = Math.atan2(y2 - y1, x2 - x1);

      // Adjust for the unit's facing direction
      let diff = angle - this.facing;

      // Normalize the difference to be within 0 to 2 * PI
      if (diff < 0) {
        diff += Math.PI * 2;
      }

      // Adjust the difference to be between -PI and PI
      if (diff > Math.PI) {
        diff -= Math.PI * 2;
      }

      // Return the difference in degrees
      return this.radToDeg(diff);
    }
  },


  angleToPos: {
    /**
     * Calculate the angle between two positions, considering the unit's facing direction.
     * @param {Vector3} from - The starting position {x, y, z}.
     * @param {Vector3} to - The target position {x, y, z}.
     * @returns {number} - The angle in degrees between the unit's facing direction and the target position.
     */
    value: function (from, to) {
      return this.angleToXY(from.x, from.y, to.x, to.y);
    }
  },

  angleTo: {
    /**
     * Calculate the angle between the unit's current position and another unit's position.
     * @param {wow.CGUnit} target - The target unit.
     * @returns {number} - The angle in degrees between the unit's facing direction and the target unit.
     */
    value: function (target) {
      return this.angleToPos(this.position, target.position);
    }
  },

  isFacing: {
    /**
     * Check if the unit is facing towards the target within a certain angle.
     * @param {wow.CGUnit | wow.Guid | null} target - The target unit.
     * @param {number} [ang=90] - The acceptable angle in degrees for the facing check. Defaults to 90 degrees.
     * @returns {boolean} - Returns true if the unit is facing the target within the specified angle.
     */
    value: function (target, ang = 90) {
      if (!target) {
        return false;
      }

      // Special case: if both units are the player, always return true
      if (target === me && this === me) {
        return true;
      }

      if (!(target instanceof wow.CGUnit) && target instanceof wow.Guid) {
        target = objMgr.findObject(target);
      }

      const angle = this.angleTo(target);

      // Check if the absolute angle is within the specified range
      return Math.abs(angle) < ang;
    }
  },

  radToDeg: {
    /**
     * Convert radians to degrees.
     * @param {number} radians - The angle in radians.
     * @returns {number} - The angle in degrees.
     */
    value: function (radians) {
      return radians * (180 / Math.PI);
    }
  },

  inMyGroup: {
    /**
     * Check if the unit is in the player's current group.
     * @returns {boolean} - Returns true if the unit is in the player's group, false otherwise.
     */
    value: function () {
      const group = wow.Party.currentParty; // Get the current party

      // If the player is not in a group, return false
      if (!group || group.numMembers === 0) {
        return false;
      }

      // Iterate through the group members
      for (const member of group.members) {
        if (member.guid.equals(this.guid)) {
          return true; // The unit is in the group
        }
      }

      return false; // The unit is not in the group
    }
  },

  withinLineOfSight: {
    /**
     * Check if the target unit is within line of sight.
     * @param {wow.CGUnit | wow.Guid} target - The target unit to check line of sight against.
     * @returns {boolean} - Returns true if the target is within line of sight, false otherwise.
     */
    value: function (target) {
      if (target === me) {
        return true
      }

      target = target instanceof wow.CGUnit ? target : target.toUnit();
      if (!target || !target.position || !this.position) {
        return false;
      }
      // Adjust positions to account for the display height of both units
      const from = { ...this.position, z: this.position.z + this.displayHeight };
      const to = { ...target.position, z: target.position.z + target.displayHeight };

      // Define the flags for line of sight checking
      const flags = TraceLineHitFlags.SPELL_LINE_OF_SIGHT;

      // Perform the trace line check
      const traceResult = wow.World.traceLine(from, to, flags);
      return !traceResult.hit; // If traceResult.hit is false, we have line of sight
    }
  }

});

export default true;
