import objMgr, { me } from "../Core/ObjectManager";

Object.defineProperties(wow.CGUnit.prototype, {
  hasAuraByMe: {
    /**
     * @param {string} name
     */
    value: function (name) {
      /** @type {Array<wow.AuraData>} */
      const auras = this.auras;
      return auras.find((aura) =>
        aura.name === name &&
        aura.casterGuid &&
        me.guid &&
        me.guid.equals(aura.casterGuid)
      ) !== undefined;
    }
  },

  hasAura: {
    value: function (name) {
      return this.auras.some(aura => aura.name === name) !== undefined;
    }
  },

  getAura: {
    value: function (name) {
      return this.auras.find(aura => aura.name === name);
    }
  },

  targetUnit: {
    get: function () {
      return objMgr.getObjectByGuid(this.target);
    }
  }
});

export default true;
