

Object.defineProperties(wow.CGActivePlayer.prototype, {

  currentParty: {
    /**
     * Get the current active party if it exists.
     * @returns {wow.Party | undefined} - Returns the current party instance or undefined.
     */
    get: function () {
      return wow.Party.currentParty;
    }
  }

});

export default true;
