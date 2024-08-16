import objMgr, { me } from "../Core/ObjectManager";

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
      return objMgr.getObjectByGuid(this.target);
    }
  }
});

export default true;
