import objMgr, {me} from "../Core/ObjectManager";
import Common from "../Core/Common";
import {MovementFlags, UnitFlags} from "../Enums/Flags";
import Guid from "./Guid";

Object.defineProperties(wow.CGUnit.prototype, {
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
        return this.auras.find(aura => aura.spellId === nameOrId) || null;
      } else if (typeof nameOrId === 'string') {
        // Get by aura name
        return this.auras.find(aura => aura.name === nameOrId) || null;
      }
      return null;
    }
  },

  targetUnit: {
    get: function () {
      return objMgr.findObject(this.target);
    }
  },

  unitsAround: {
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

  unitsAroundCount: {
    /**
     * Get the count of units within a specified distance of this unit.
     * @param {number} [distance=5] - The maximum distance to check for nearby units. Defaults to 5 if not specified.
     * @returns {number} - The count of units within the specified distance.
     */
    value: function (distance = 5) {
      return this.unitsAround(distance).length;
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

  AngleToXY: {
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


  AngleToPos: {
    /**
     * Calculate the angle between two positions, considering the unit's facing direction.
     * @param {Vector3} from - The starting position {x, y, z}.
     * @param {Vector3} to - The target position {x, y, z}.
     * @returns {number} - The angle in degrees between the unit's facing direction and the target position.
     */
    value: function (from, to) {
      return this.AngleToXY(from.x, from.y, to.x, to.y);
    }
  },

  AngleTo: {
    /**
     * Calculate the angle between the unit's current position and another unit's position.
     * @param {wow.CGUnit} target - The target unit.
     * @returns {number} - The angle in degrees between the unit's facing direction and the target unit.
     */
    value: function (target) {
      return this.AngleToPos(this.position, target.position);
    }
  },

  IsFacing: {
    /**
     * Check if the unit is facing towards the target within a certain angle.
     * @param {wow.CGUnit} target - The target unit.
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

      const angle = this.AngleTo(target);

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
  }

});

export default true;
