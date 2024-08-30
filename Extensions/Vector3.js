Object.defineProperties(Vector3.prototype, {
  distance: {
    /**
     * @this {Vector3}
     * @param {Vector3} other
     * @returns {number}
     */
    value: function (other) {
      return Math.pow((this.x - other.x), 2) + Math.pow((this.y - other.y), 2) + Math.pow((this.z - other.z), 2);
    }
  },

  distanceSq: {
    /**
     * @this {Vector3}
     * @param {Vector3} other
     * @returns {number}
     */
    value: function (other) {
      return Math.sqrt(this.distance(other));
    }
  }
});

export default true;
