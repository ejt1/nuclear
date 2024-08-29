
Object.defineProperties(wow.AuraData.prototype, {
  remaining: {
    get: function () {
      return Math.max(this.expiration - wow.frameTime, 0);
    }
  }
});

export default true;

