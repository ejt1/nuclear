import * as bt from './BehaviorTree';
import objMgr, { me } from './ObjectManager';
import { losExclude } from "../Data/Exclusions";

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

    // start with setting target to undefined
    sequence.addChild(new bt.Action(() => {
      Spell._currentTarget = undefined;
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
          target = me.targetUnit;
        }

        if (!(target instanceof wow.CGUnit)) {
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
        console.info(`Cast ${id} on ${this._currentTarget?.unsafeName}`);
        return bt.Status.Success;
      }),
    );
  }

  static castByName(name) {
    return new bt.Sequence(
      new bt.Action(() => {
        let target = Spell._currentTarget;
        if (!target) {
          target = me.targetUnit;
        }

        if (target instanceof wow.Guid && !target.toUnit()) {
          return bt.Status.Failure;
        }

        const spell = wow.SpellBook.getSpellByName(name);
        if (!spell) {
          //console.error(`failed to find spell ${name}`);
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
        console.info(`Cast ${name} on ${this._currentTarget?.unsafeName}`);
        return bt.Status.Success;
      }),
    );
  }

  static canCast(spell, target) {
    if (!spell || spell.name === undefined) {
      return false;
    }

    if (!target) {
      return false;
    }

    if (!spell.isKnown) {
      return false;
    }

    const cooldown = spell.cooldown;
    if (!cooldown.ready || !cooldown.active) {
      return false;
    }

    if (!spell.isUsable) {
      return false;
    }

    if (spell.castTime > 0 && me.isMoving()) {
      return false;
    }

    if ((target instanceof wow.CGUnit && !losExclude[target.entryId]) && !me.withinLineOfSight(target)) {
      return false;
    }

    if ((target instanceof wow.CGUnit && !losExclude[target.entryId]) && !spell.inRange(target)) {
      return false;
    }

    return true;
  }

  /**
   *
   * @param {wow.Spell} spell
   * @returns {boolean}
   */
  static castPrimitive(spell, target) {
    return spell.cast(target);
  }

  static isGlobalCooldown() {
    const gcd = wow.SpellBook.gcdSpell;
    if (gcd && !gcd.cooldown.ready) {
      return true;
    }
    return false;
  }

  static applyAura(spellNameOrId, unit, expire = false) {
    return new bt.Sequence(
      new bt.Action(() => {
        if (!unit) {
          console.info("No unit passed to function Apply");
          return bt.Status.Failure;
        }

        const aura = unit.getAuraByMe(spellNameOrId);
        if (aura && ((aura.remaining > 2000 || aura.remaining === 0) || expire)) {
          return bt.Status.Failure;
        }

        Spell._currentTarget = unit;
        return bt.Status.Success;
      }),
      typeof spellNameOrId === 'number' ? Spell.castById(spellNameOrId) : Spell.castByName(spellNameOrId)
    );
  }

  static interrupt(spellNameOrId, interruptPlayersOnly = false) {
    return new bt.Sequence(
      new bt.Action(() => {
        let spell;
        if (typeof spellNameOrId === 'number') {
          spell = new wow.Spell(spellNameOrId);
        } else if (typeof spellNameOrId === 'string') {
          spell = wow.SpellBook.getSpellByName(spellNameOrId);
        } else {
          console.error("Invalid argument type for interrupt method");
          return bt.Status.Failure;
        }

        if (!spell || !spell.isUsable || !spell.cooldown.ready) {
          return bt.Status.Failure;
        }

        const spellRange = spell.baseMaxRange;
        const unitsAround = me.getUnitsAround(spellRange);

        for (const target of unitsAround) {
          if (!(target instanceof wow.CGUnit)) {
            continue;
          }

          if (interruptPlayersOnly && !target.isPlayer()) {
            continue;
          }

          if (!spell.inRange(target)) {
            continue;
          }

          if (!target.isCasting && !target.isChanneling) {
            continue;
          }

          const castInfo = target.spellInfo;
          if (!castInfo) {
            continue;
          }

          const currentTime = wow.frameTime;
          const castRemains = castInfo.castEnd - currentTime;
          const castTime = castInfo.castEnd - castInfo.castStart;
          const castPctRemain = (castRemains / castTime) * 100;

          if (castPctRemain <= 50) {
            if (target.isInterruptible && spell.cast(target)) {
              return bt.Status.Success;
            }
          }
        }

        return bt.Status.Failure;
      })
    );
  }

  /**
   * Retrieves the cooldown information of a spell.
   * @param {number | string} spellNameOrId - The name or ID of the spell.
   * @returns {object | null} - The cooldown information or null if the spell is not found.
   */
  static getCooldown(spellNameOrId) {
    const spell = typeof spellNameOrId === 'number'
      ? new wow.Spell(spellNameOrId)
      : wow.SpellBook.getSpellByName(spellNameOrId);

    if (!spell) {
      console.error(`Spell ${spellNameOrId} not found`);
      return null;
    }

    return spell.cooldown;
  }

  /**
   * Retrieves the current and maximum charges of a spell.
   * @param {number | string} spellNameOrId - The name or ID of the spell.
   * @returns {{ charges: number, maxCharges: number }} - An object containing the current and maximum charges.
   */
  static getCharges(spellNameOrId) {
    const spell = typeof spellNameOrId === 'number'
      ? new wow.Spell(spellNameOrId)
      : wow.SpellBook.getSpellByName(spellNameOrId);

    return spell.charges.charges
  }

  static getSpell(spellNameOrId) {
    if (typeof spellNameOrId === 'number') {
      return new wow.Spell(spellNameOrId);
    } else if (typeof spellNameOrId === 'string') {
      return wow.SpellBook.getSpellByName(spellNameOrId);
    }
    throw new Error("Invalid argument type for getSpell method");
  }
}

export default Spell;
