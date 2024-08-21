import {GroupRole} from "../Enums/UnitEnums";


Object.defineProperties(wow.PartyMember.prototype, {

  isTank: {
    value: function() {
      return (this.combatRole & GroupRole.Tank) !== 0;
    }
  },

  isHealer: {
    value: function() {
      return (this.combatRole & GroupRole.Healer) !== 0;
    }
  },

  isDamage: {
    value: function() {
      return (this.combatRole & GroupRole.Damage) !== 0;
    }
  }

});

export default true;
