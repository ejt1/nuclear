

Object.defineProperties(wow.CGActivePlayer.prototype, {

  currentParty: {
    /**
     * Get the current active party if it exists.
     * @returns {wow.Party | undefined} - Returns the current party instance or undefined.
     */
    get: function () {
      return wow.Party.currentParty;
    }
  },

  getFriends: {
    /**
     * Get an array of friends within a specified distance of this unit.
     * @param {number} distance - The maximum distance to check for nearby units (default 40).
     * @returns {Array<wow.CGUnit>} - An array of CGUnit objects within the specified distance.
     */
    value: function (distance = 40) {
      const nearbyFriends = [];

      // Check if the player is in a party
      if (this.currentParty) {
        const partyMembers = this.currentParty.members;

        // Loop through the party members
        for (const member of partyMembers) {
          // Check if the member's GUID exists in the Object Manager as a CGUnit
          const friendUnit = member.guid.toUnit();

          // Ensure the friend is a CGUnit and within the specified distance
          if (friendUnit instanceof wow.CGUnit && this.distanceTo(friendUnit) <= distance) {
            nearbyFriends.push(friendUnit);
          }
        }
      }

      // Add more logic here if you want to include nearby friendly units who are not in the party.

      return nearbyFriends;
    }
  },

  getEnemies: {
    /**
     * Get an array of enemies within a specified distance of this unit.
     * @param {number} distance - The maximum distance to check for nearby units (default 40).
     * @returns {Array<wow.CGUnit>} - An array of CGUnit objects that are attackable enemies within the specified distance.
     */
    value: function (distance = 40) {
      const nearbyEnemies = [];

      // Get all units around the player within the specified distance
      const unitsAround = this.getUnitsAround(distance);

      for (const unit of unitsAround) {
        // Ensure the unit is a CGUnit and that the player can attack it
        if (unit instanceof wow.CGUnit && this.canAttack(unit)) {
          // Add valid enemies to the list
          nearbyEnemies.push(unit);
        }
      }

      return nearbyEnemies;
    }
  }

});

export default true;
