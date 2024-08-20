import objMgr, {me} from "../Core/ObjectManager";


Object.defineProperties(wow.CGActivePlayer.prototype, {

  currentParty: {
    /**
     * Get the current active party if it exists, or return `undefined` if not in a party.
     * @returns {wow.Party | undefined} - Returns the current party instance or undefined.
     */
    get: function () {
      return (wow.Party?.currentParty) ? wow.Party.currentParty : undefined;
    }
  }

});

export default true;
