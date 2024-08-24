import objMgr from "../Core/ObjectManager";

Object.defineProperties(wow.Guid.prototype, {
  toUnit: {
    /**
     * Convert the GUID to a CGUnit object, or return itself if it's already a CGUnit.
     * @returns {wow.CGUnit | undefined} - The corresponding CGUnit object or undefined if not found.
     */
    value: function () {
      // If `this` is already a CGUnit, just return `this`
      if (this instanceof wow.CGUnit) {
        return this;
      }

      // Otherwise, use the object manager to find the object by GUID
      const unit = objMgr.findObject(this);

      // Check if the object is an instance of CGUnit
      if (unit instanceof wow.CGUnit) {
        return unit;
      }

      // Return undefined if not found or not a CGUnit
      return undefined;
    }
  }
});

wow.Guid.prototype.toString = function() {
  return `${this.low.toString(16)}:${this.high.toString(16)} (${this.hash.toString(16)})`;
};

wow.Guid.prototype.toJSON = function() {
  return this.toString();
};

export default true;
