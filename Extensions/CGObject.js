import { ObjectFlags } from "@/Enums/Flags";

Object.defineProperties(wow.CGObject.prototype, {
  /**
   * @this {wow.CGObject}
   * @param {wow.CGObject | Vector3} to
   * @returns {number} distance
   */
  distanceTo: {
    value: function (to) {
      const from = this.position
      if (to instanceof Vector3) {
        return from.distanceSq(to);
      } else if (to instanceof wow.CGUnit) {
        // XXX: not sure about this, better have unit.spellDistance for bounding radius calculations
        let bbRadius = 0;
        if (this instanceof wow.CGUnit) {
          bbRadius = this.boundingRadius + to.boundingRadius;
        } else {
          bbRadius = to.boundingRadius;
        }
        const dist = from.distanceSq(to.position);
        return dist > bbRadius ? 0 : dist + bbRadius;
      } else if (to instanceof wow.CGObject) {
        const pos = to.position;
        return from.distanceSq(pos);
      }
      throw `expected wow.CGObject | Vector3 got ${typeof to}`;
    }
  },
  /**
   * @returns {boolean}
   */
  interactable: {
    get: function () {
      return (this.dynamicFlags & ObjectFlags.Interactable) === 0;
    }
  },
  /**
   * @returns {boolean}
   */
  isObjective: {
    get: function () {
      return (this.dynamicFlags & ObjectFlags.Objective) > 0;
    }
  },
});

export default true;
