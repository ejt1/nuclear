import * as bt from './BehaviorTree';
import { me } from './ObjectManager';

class Spell {
  static cast(...args) {
    if (arguments.length == 0) {
      throw "no arguments given to Spell.cast";
    }
    const spell = arguments[0];
    const rest = Array.prototype.slice.call(arguments, 1);
    let predicate = null;
    for (let i = 0; i < rest.length; ++i){
      if (typeof rest[i] === 'function'){
        predicate = rest[i];
      }
    }
    if (typeof spell === 'number') {
      return Spell.castById(spell, predicate);
    } else if (typeof spell === 'string') {
      return Spell.castByName(spell, predicate);
    }
    // XXX: add support for casting by wow.Spell object
  }

  static castById(id, predicate = null) {
    return new bt.Sequence(
      new bt.Action(() => {
        if (predicate && !predicate()){
          return bt.Status.Failure;
        }

        const spell = new Spell(id);
        if (!spell) {
          console.error(`failed to construct spell with id ${id}`);
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
        console.log(`Cast ${id}`);
        return bt.Status.Success;
      }),

      // XXX: here we can wait for GCD and/or cast/channel
    );
  }

  static castByName(name, predicate = null) {
    return new bt.Sequence(
      new bt.Action(() => {
        if (predicate && !predicate()){
          return bt.Status.Failure;
        }

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

    if (!spell.inRange(me.target)) {
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
