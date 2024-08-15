import * as bt from './BehaviorTree';
import { me } from './ObjectManager';

class Spell {
  /** @type {wow.CGUnit | wow.Guid | null} */
  static _currentTarget;

  static cast(...args) {
    if (arguments.length === 0) {
      throw "no arguments given to Spell.cast";
    }
    const spell = arguments[0];
    const rest = Array.prototype.slice.call(arguments, 1);
    const sequence = new bt.Sequence();

    // start with setting target to null
    sequence.addChild(new bt.Action(() => {
      Spell._currentTarget = null;
    }));

    for (const arg of rest) {
      if (typeof arg === 'function') {
        sequence.addChild(new bt.Action(() => {
          const r = arg();
          if (r === false) {
            // function returned a boolean predicate
            return bt.Status.Failure;
          } else if (r instanceof wow.CGUnit || r instanceof wow.Guid) {
            // function returned a target
            Spell._currentTarget = r;
          }
          return bt.Status.Success;
        }));
      }
      // XXX: output error to indicate invalid argument?
    }

    if (typeof spell === 'number') {
      sequence.addChild(Spell.castById(spell));
    } else if (typeof spell === 'string') {
      sequence.addChild(Spell.castByName(spell));
    }

    return sequence;
  }

  static castById(id) {
    return new bt.Sequence(
      new bt.Action(() => {
        let target = Spell._currentTarget;
        if (!target) {
          target = me.target;
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

  static castByName(name) {
    return new bt.Sequence(
      new bt.Action(() => {
        let target = Spell._currentTarget;
        if (!target) {
          target = me.target;
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
