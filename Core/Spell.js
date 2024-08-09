import * as bt from './BehaviorTree';
import { me } from './ObjectManager';

class Spell {
  static cast(name) {
    return new bt.Sequence(
      new bt.Action(() => {
        const spell = wow.SpellBook.getSpellByName(name);
        if (!spell) {
          console.error(`failed to find spell ${name}`);
          return bt.Status.Failure;
        }

        if (!Spell.canCast(spell)) {
          return bt.Status.Failure;
        }
        if (!Spell.castPrimitive(spell)) {
          return bt.Status.Failure;
        }

        return bt.Status.Success;
      }),

      new bt.Action(() => {
        console.log(`Cast ${name}`);
        return bt.Status.Success;
      }),

      // XXX: here we can wait for GCD and/or cast/channel
    );
  }

  /**
   *
   * @param {wow.Spell} spell
   * @returns {boolean}
   */
  static canCast(spell) {
    if (!spell) { return false; }

    if (!spell.isUsable) {
      return false;
    }
    const cooldown = spell.cooldown;
    if (!cooldown.ready || !cooldown.active) {
      return false;
    }
    return true;
  }

  /**
   *
   * @param {wow.Spell} spell
   * @returns {boolean}
   */
  static castPrimitive(spell) {
    return spell.cast(me.target);
  }

  static isGlobalCooldown() {
    const gcd = wow.SpellBook.gcdSpell;
    if (gcd && !gcd.cooldown.ready) {
      return true;
    }
    return false;
  }
}

export default Spell;
