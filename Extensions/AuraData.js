import {WoWAuraFlags} from "@/Enums/Auras";

Object.defineProperties(wow.AuraData.prototype, {
  remaining: {
    get: function () {
      return Math.max(this.expiration - wow.frameTime, 0);
    }
  },
  isBuff: {
    /**
     * Checks if the aura is a buff.
     * @returns {boolean} - True if the aura is a buff, false otherwise.
     */
    value: function () {
      return (this.flags & WoWAuraFlags.Positive) !== 0;
    }
  },

  isDebuff: {
    /**
     * Checks if the aura is a debuff.
     * @returns {boolean} - True if the aura is a debuff, false otherwise.
     */
    value: function () {
      return (this.flags & WoWAuraFlags.Negative) !== 0;
    }
  }
});

export default true;

