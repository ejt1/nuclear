import * as bt from './BehaviorTree';
import objMgr, {me} from './ObjectManager';
import {losExclude} from "../Data/Exclusions";
import {DispelPriority, dispels} from "../Data/Dispels";

class Spell {
  /** @type {wow.CGUnit | wow.Guid | null} */
  static _currentTarget;

  /**
   * Constructs and returns a sequence of actions for casting a spell.
   *
   * This method builds a behavior tree sequence that attempts to cast a spell on a target. It
   * can accept a combination of a spell (by name or ID) and additional functions that
   * determine the target of the spell or conditions that must be satisfied for casting. The
   * target will be set during the sequence based on the result of the provided functions.
   *
   * @param {string | number} spell - The spell to cast, specified by name (string) or ID (number).
   * @param {...function} args - Additional functions that can determine the target of the spell or
   *                             conditions to be checked before casting.
   *
   * @throws {Error} - Throws an error if no arguments are provided to the function.
   *
   * @returns {bt.Sequence} - A behavior tree sequence that handles the spell casting logic.
   *                          If the conditions are met and the target is valid, the spell will be cast.
   */
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

    sequence.addChild(Spell.castEx(spell));

    return sequence;
  }

  /**
   * Unified casting method that handles casting a spell by ID or name.
   * @param {number | string} spellNameOrId - The spell ID or name.
   * @returns {bt.Sequence} - The behavior tree sequence for casting the spell.
   */
  static castEx(spellNameOrId) {
    return new bt.Sequence(
      new bt.Action(() => {
        let target = Spell._currentTarget;
        if (!target) {
          target = me.targetUnit;
        }

        if (!(target instanceof wow.CGUnit)) {
          return bt.Status.Failure;
        }

        const spell = Spell.getSpell(spellNameOrId);
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
        console.info(`Cast ${spellNameOrId} on ${Spell._currentTarget?.unsafeName}`);
        return bt.Status.Success;
      })
    );
  }

  /**
   * Determines whether a spell can be cast on a given target.
   *
   * This method checks various conditions to determine if a spell can be successfully cast
   * on the specified target, including whether the spell is known, off cooldown, usable, and
   * whether the target is within line of sight and range.
   *
   * @param {wow.Spell} spell - The spell to be cast.
   * @param {wow.CGUnit | wow.Guid} target - The target on which the spell is to be cast.
   * @returns {boolean} - Returns true if the spell can be cast, false otherwise.
   */
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

  /**
   * Helper function to retrieve a spell by ID or name.
   * @param {number | string} spellNameOrId - The spell ID or name.
   * @returns {wow.Spell | null} - The spell object, or null if not found.
   */
  static getSpell(spellNameOrId) {
    if (typeof spellNameOrId === 'number') {
      return new wow.Spell(spellNameOrId);
    } else if (typeof spellNameOrId === 'string') {
      return wow.SpellBook.getSpellByName(spellNameOrId);
    } else {
      console.error("Invalid argument type for getSpellByIdOrName method");
      throw Error("Invalid argument type for getSpellByIdOrName method")
    }
  }

  /**
   * Checks if the global cooldown (GCD) is currently active.
   *
   * The global cooldown is a short, universal cooldown that prevents spells from being cast
   * in quick succession. If the GCD is active, certain abilities may not be cast until it ends.
   *
   * @returns {boolean} - Returns true if the global cooldown is active, false otherwise.
   */
  static isGlobalCooldown() {
    const gcd = wow.SpellBook.gcdSpell;
    if (gcd && !gcd.cooldown.ready) {
      return true;
    }
    return false;
  }

  /**
   * Attempts to apply an aura (buff/debuff) to a unit by casting the specified spell.
   *
   * The aura will only be applied if the target unit doesn't already have the aura, or if
   * the remaining duration of the aura is low. Optionally, the `expire` flag forces the
   * aura to be reapplied regardless of its remaining duration.
   *
   * @param {number | string} spellNameOrId - The name or ID of the spell that applies the aura.
   * @param {wow.CGUnit} unit - The target unit on which to apply the aura.
   * @param {boolean} [expire=false] - If true, forces the aura to be reapplied regardless of remaining duration.
   * @returns {bt.Sequence} - A behavior tree sequence that handles the aura application logic.
   */
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
      Spell.castEx(spellNameOrId)
    );
  }

  /**
   * Attempts to interrupt a casting or channeling spell on nearby enemies or players.
   *
   * This method checks for units around the player within the interrupt spell's range.
   * It attempts to interrupt spells that are more than 50% completed.
   *
   * @param {number | string} spellNameOrId - The ID or name of the interrupt spell to cast.
   * @param {boolean} [interruptPlayersOnly=false] - If set to true, only player units will be interrupted.
   * @returns {bt.Sequence} - A behavior tree sequence that handles the interrupt logic.
   */
  static interrupt(spellNameOrId, interruptPlayersOnly = false) {
    return new bt.Sequence(
      new bt.Action(() => {
        const spell = Spell.getSpell(spellNameOrId);

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
   * Dispel a debuff or buff from units, depending on if we are dispelling friends or enemies.
   * @param {number | string} spellNameOrId - The spell ID or name.
   * @param {boolean} friends - If true, dispel friendly units. If false, dispel enemies (for purge/soothe).
   * @param {number} priority - The priority level for dispel. Defaults to DispelPriority.Low if not provided.
   * @param {boolean} playersOnly - dispel only players - used for purge.
   * @param {...number} types - The types of dispel we can use, e.g., Magic, Curse, Disease, Poison.
   * @returns {boolean} - Whether a dispel was cast.
   */
  static dispel(spellNameOrId, friends, priority = DispelPriority.Low, playersOnly = false, ...types) {
    return new bt.Sequence(
      new bt.Action(() => {
        // Check if the spell is on cooldown
        if (this.getCooldown(spellNameOrId).timeleft > 0) return false;

        // List to target, either friends or enemies
        const list = friends ? me.getFriends() : me.getEnemies(40);

        if (!list) {
          console.error("No list was provided for Dispel");
          return false;
        }

        // Loop through each unit in the list
        for (const unit of list) {
          const auras = unit.auras;

          for (const aura of auras) {
            const dispelTypeMatch = types.includes(aura.dispelType);

            // Check for debuff/buff status, dispel priority, and aura duration remaining
            const dispelPriority = dispels[aura.spellId] || DispelPriority.Low;
            const isValidDispel = friends
              ? aura.isDebuff && dispelPriority >= priority
              : aura.isBuff && dispelPriority >= priority;

            if (isValidDispel && aura.remaining > 2000 && dispelTypeMatch) {
              const durationPassed = aura.duration - aura.remaining;

              // Try to cast the dispel if it's been long enough
              if (durationPassed > 777 && this.castPrimitive(this.getSpell(spellNameOrId), unit)) {
                console.info(`Cast dispel on ${unit.unsafeName} to remove ${aura.name} with priority ${dispelPriority}`);
                return bt.Status.Success;
              }
            }
          }
        }

        return bt.Status.Failure;
      })
    )
  }

  /**
   * Retrieves the cooldown information of a spell.
   * @param {number | string} spellNameOrId - The name or ID of the spell.
   * @returns {{ duration: number, start: number, timeleft: number, active: number, modRate: number, ready: boolean } | null} - The cooldown information or null if the spell is not found.
   */
  static getCooldown(spellNameOrId) {
    const spell = Spell.getSpell(spellNameOrId);

    if (!spell) {
      console.error(`Spell ${spellNameOrId} not found`);
      return null;
    }

    return spell.cooldown;
  }

  /**
   * Retrieves the current and maximum charges of a spell.
   * @param {number | string} spellNameOrId - The name or ID of the spell.
   * @returns {number} - The charges
   */
  static getCharges(spellNameOrId) {
    const spell = Spell.getSpell(spellNameOrId);
    return spell.charges.charges
  }

}

export default Spell;
