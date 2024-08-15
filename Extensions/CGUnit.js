import objMgr, { me } from "../Core/ObjectManager";

Object.defineProperties(wow.CGUnit.prototype, {
  hasAuraByMe: {
    value: function (name) {
      return this.auras.find(aura =>
        aura.name === name &&
        aura.casterGuid &&
        me.guid &&
        me.guid.equals(aura.casterGuid)
      ) !== undefined;
    }
  },

  hasAura: {
    value: function (name) {
      return this.auras.some(aura => aura.name === name);
    }
  },

  hasAuraById: {
    value: function (id) {
      return this.auras.some(aura => aura.spellId === id)
    }
  },


  hasVisibleAura: {
    value: function (name) {
      return this.visibleAuras.some(visibleAura => visibleAura.name === name);
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
