import * as bt from './BehaviorTree';
import { me } from './ObjectManager';

class Spell {
  static cast(...args) {
    if (arguments.length === 0) {
      throw "no arguments given to Spell.cast";
    }
    const spell = arguments[0];
    const rest = Array.prototype.slice.call(arguments, 1);
    let predicate = null;
    let target = me.target;

    for (const element of rest) {
      if (element && element instanceof wow.CGUnit) {
        target = element;
      } else if (typeof element === 'function') {
        predicate = element;
      }
    }

    if (!target) {
      return bt.Status.Failure;
    }

    if (typeof spell === 'number') {
      return Spell.castById(spell, target, predicate);
    } else if (typeof spell === 'string') {
      return Spell.castByName(spell, target, predicate);
    }
  }

  static castById(id, target, predicate = null) {
    return new bt.Sequence(
      new bt.Action(() => {
        if (predicate && !predicate()) {
          return bt.Status.Failure;
        }

        const spell = new Spell(id);
        if (!spell) {
          return bt.Status.Failure;
        }

        if (!Spell.canCast(spell, target)) {
          return bt.Status.Failure;
        }
        if (!Spell.castPrimitive(spell, target)) {
          return bt.Status.Failure;
        }

        return bt.Status.Success;
      }),

      new bt.Action(() => {
        console.log(`Cast ${id}`);
        return bt.Status.Success;
      }),
    );
  }

  static castByName(name, target, predicate = null) {
    return new bt.Sequence(
      new bt.Action(() => {
        if (predicate && !predicate()) {
          return bt.Status.Failure;
        }

        const spell = wow.SpellBook.getSpellByName(name);
        if (!spell) {
          console.error(`failed to find spell ${name}`);
          return bt.Status.Failure;
        }

        if (!Spell.canCast(spell, target)) {
          return bt.Status.Failure;
        }
        if (!Spell.castPrimitive(spell, target)) {
          return bt.Status.Failure;
        }

        return bt.Status.Success;
      }),

      new bt.Action(() => {
        console.log(`Cast ${name}`);
        return bt.Status.Success;
      }),
    );
  }

  static canCast(spell, target) {
    if (!spell) {
      return false;
    }

    if (!target) {
      return false;
    }

    if (!spell.isUsable) {
      return false;
    }

    const cooldown = spell.cooldown;
    if (!cooldown.ready || !cooldown.active) {
      return false;
    }

    if (!spell.inRange(target)) {
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
