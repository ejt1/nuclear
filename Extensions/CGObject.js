import { ObjectFlags } from "@/Enums/Flags";

Object.defineProperties(wow.CGObject.prototype, {
  /**
   * @this {wow.CGObject}
   * @param {wow.CGObject | Vector3} to
   * @returns {number} distance
   */
  distanceTo: {
    value: function (to) {
      const from = this.position;
      if (to instanceof Vector3) {
        return from.distanceSq(to);
      } else if (to instanceof wow.CGUnit) {
        // XXX: not sure about this, better have unit.spellDistance for bounding radius calculations
        let bbRadius = 0;
        if (this instanceof wow.CGUnit) {
          //bbRadius = this.boundingRadius + to.boundingRadius;
          bbRadius = this.getMeleeRange(to);
        } else {
          bbRadius = to.boundingRadius;
        }
        const dist = from.distanceSq(to.position);
        return dist < bbRadius ? 0 : dist;
      } else if (to instanceof wow.CGObject) {
        const pos = to.position;
        return from.distanceSq(pos);
      }
      throw `expected wow.CGObject | Vector3 got ${typeof to}`;
    }
  },

  /**
   * @this {wow.CGObject}
   * @param {wow.CGObject | Vector3} to
   * @returns {number} distance
   */
  distanceTo2D: {
    value: function (to) {
      const from = this.position;
      if (to instanceof Vector3) {
        return from.distanceSq2D(to);
      } else if (to instanceof wow.CGUnit) {
        let bbRadius = 0;
        if (this instanceof wow.CGUnit) {
          bbRadius = this.getMeleeRange(to);
          //bbRadius = this.boundingRadius + to.boundingRadius;
        } else {
          bbRadius = to.boundingRadius;
        }
        const dist = from.distanceSq2D(to.position);
        return dist < bbRadius ? 0 : dist - bbRadius;
      } else if (to instanceof wow.CGObject) {
        const pos = to.position;
        return from.distanceSq2D(pos);
      }
      throw `expected wow.CGObject | Vector3 got ${typeof to}`;
    }
  },

  /**
   * @returns {boolean}
   */
  isInteractable: {
    get: function () {
      return (this.dynamicFlags & ObjectFlags.Interactable) === 0;
    }
  },

  /**
   * @returns {boolean}
   */
  isLootable: {
    get: function () {
      return (this.dynamicFlags & ObjectFlags.Lootable) > 0;
    }
  },

  withinInteractRange: {
    value: function (obj) {
      const objRadius = obj.boundingRadius ?? obj.displayHeight ?? 0;  // Defaults to 0 if undefined or null
      const distance = Math.max(this.boundingRadius + objRadius + 1.333, 6);

      return this.distanceTo(obj) < distance;
    }
  }
});

export default true;
