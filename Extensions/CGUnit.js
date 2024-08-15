import objMgr, { me } from "../Core/ObjectManager";

Object.defineProperties(wow.CGUnit.prototype, {
  hasAuraByMe: {
    value: function (name) {
      return this.auras.find(aura =>
        aura.name === name &&
        me.equals(aura.casterGuid)
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
