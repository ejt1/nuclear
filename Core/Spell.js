import * as bt from './BehaviorTree';
import objMgr, { me } from './ObjectManager';
import { losExclude } from "../Data/Exclusions";
import { DispelPriority, dispels } from "../Data/Dispels";
import { interrupts } from '@/Data/Interrupts';
import Settings from './Settings';
import { defaultHealTargeting as Heal } from '@/Targeting/HealTargeting';
import CommandListener from './CommandListener';

class Spell {
  /** @type {{get: function(): (wow.CGUnit|undefined)}} */
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

    let spellToCast = arguments[0];
    const rest = Array.prototype.slice.call(arguments, 1);
    const sequence = new bt.Sequence();

    sequence.addChild(new bt.Action(() => {
      // Check if there's a queued spell
      if (CommandListener.hasQueuedSpells()) {
        const queuedSpell = CommandListener.getNextQueuedSpell();
        if (queuedSpell) {
          // Override the current spell and target with the queued one
          spellToCast = queuedSpell.spellName;
          switch (queuedSpell.target) {
            case 'target':
              Spell._currentTarget = me.targetUnit;
              break;
            case 'focus':
              Spell._currentTarget = me.focusTarget;
              if (!Spell._currentTarget) {
                console.info("Focus target does not exist. Cancelling queue.");
                return bt.Status.Failure;
              }
              break;
            case 'me':
              Spell._currentTarget = me;
              break;
          }
          console.info(`Attempting to cast queued spell: ${spellToCast} on ${queuedSpell.target}`);

          // Attempt to cast the queued spell immediately
          const castResult = Spell.castEx(spellToCast).tick();
          if (castResult === bt.Status.Success) {
            console.info(`Successfully cast queued spell: ${spellToCast}`);
            return bt.Status.Success;
          } else {
            console.info(`Failed to cast queued spell: ${spellToCast}. Adding back to queue.`);
            CommandListener.addSpellToQueue(queuedSpell);
            return bt.Status.Failure;
          }
        }
      }

      // If no queued spell, proceed with the original target
      Spell._currentTarget = me.targetUnit;
      return bt.Status.Success;
    }));

    // Only add the rest of the sequence if it wasn't a queued spell
    if (!CommandListener.hasQueuedSpells()) {
      for (const arg of rest) {
        if (typeof arg === 'function') {
          sequence.addChild(new bt.Action(() => {
            const r = arg();
            if (r === false || r === undefined || r === null) {
              return bt.Status.Failure;
            } else if (r instanceof wow.CGUnit || r instanceof wow.Guid) {
              Spell._currentTarget = r;
            }
            return bt.Status.Success;
          }));
        } else {
          try {
            throw new Error(`Invalid argument passed to Spell.cast: expected function got ${typeof arg}`);
          } catch (e) {
            console.warn(e.message);
            console.warn(e.stack.split('\n')[1]);
          }
        }
      }

      sequence.addChild(Spell.castEx(spellToCast));
    }

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

    if ((target instanceof wow.CGUnit && !losExclude[target.entryId]) && !this.inRange(spell, target)) {
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
 * This function first tries to retrieve the spell directly by ID or name. If not found,
 * it then iterates through the player's spellbook and constructs spells using their
 * override ID to check for matches.
 *
 * @param {number | string} spellNameOrId - The spell ID or name.
 * @returns {wow.Spell | null} - The spell object, or null if not found.
 */
  static getSpell(spellNameOrId) {
    let spell;

    // First, attempt to get the spell directly by ID or name
    if (typeof spellNameOrId === 'number') {
      spell = new wow.Spell(spellNameOrId);
    } else if (typeof spellNameOrId === 'string') {
      spell = wow.SpellBook.getSpellByName(spellNameOrId);
    } else {
      console.error("Invalid argument type for getSpell method");
      throw new Error("Invalid argument type for getSpell method");
    }

    // If the spell was found, return it immediately
    if (spell) {
      return spell;
    }

    // If the spell wasn't found, search through the player's spellbook
    const playerSpells = wow.SpellBook.playerSpells;
    for (const playerSpell of playerSpells) {
      if (playerSpell.id === playerSpell.overrideId) {
        continue;
      }

      const constructedSpell = new wow.Spell(playerSpell.overrideId);  // Use the spell's override
      // Check if the constructed spell matches the original name or ID provided
      if (
        (typeof spellNameOrId === 'number' && (constructedSpell.id === spellNameOrId || constructedSpell.overrideId === spellNameOrId)) ||
        (typeof spellNameOrId === 'string' && constructedSpell.name === spellNameOrId)
      ) {
        return playerSpell;
      }
    }

    // Return null if no match is found
    return null;
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
  * It attempts to interrupt spells based on the configured interrupt mode and percentage.
  * For cast spells, it uses the configured interrupt percentage.
  * For channeled spells, it checks if the channel time is greater than a randomized value
  * between 300 and 1100 milliseconds (700 ± 400).
  *
  * @param {number | string} spellNameOrId - The ID or name of the interrupt spell to cast.
  * @param {boolean} [interruptPlayersOnly=false] - If set to true, only player units will be interrupted.
  * @returns {bt.Sequence} - A behavior tree sequence that handles the interrupt logic.
  */
  static interrupt(spellNameOrId, interruptPlayersOnly = false) {
    return new bt.Sequence(
      new bt.Action(() => {
        // Early return if interrupt mode is set to "None"
        if (Settings.InterruptMode === "None") {
          return bt.Status.Failure;
        }
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
          if (!target.isCastingOrChanneling) {
            continue;
          }
          if (interruptPlayersOnly && !target.isPlayer()) {
            continue;
          }
          if (!spell.inRange(target) && !me.isWithinMeleeRange(target)) {
            continue;
          }
          const castInfo = target.spellInfo;
          if (!castInfo) {
            continue;
          }
          if (!target.isInterruptible) {
            continue;
          }
          if (!me.isFacing(target)) {
            continue;
          }
          const currentTime = wow.frameTime;
          const castRemains = castInfo.castEnd - currentTime;
          const castTime = castInfo.castEnd - castInfo.castStart;
          const castPctRemain = (castRemains / castTime) * 100;
          const channelTime = currentTime - castInfo.channelStart;
          // Generate a random interrupt time between 300 and 1100 ms (700 ± 400)
          const randomInterruptTime = 700 + (Math.random() * 800 - 400);

          // Check if we should interrupt based on the settings
          let shouldInterrupt = false;
          if (Settings.InterruptMode === "Everything") {
            if (target.isChanneling) {
              shouldInterrupt = channelTime > randomInterruptTime;
            } else {
              shouldInterrupt = castPctRemain <= Settings.InterruptPercentage;
            }
          } else if (Settings.InterruptMode === "List") {
            if (target.isChanneling) {
              shouldInterrupt = interrupts[castInfo.spellId] && channelTime > randomInterruptTime;
            } else {
              shouldInterrupt = interrupts[castInfo.spellId] && castPctRemain <= Settings.InterruptPercentage;
            }
          }

          if (shouldInterrupt && spell.cast(target)) {
            const spellId = target.isChanneling ? target.currentChannel : target.currentCast;
            const interruptTime = target.isChanneling ? `${channelTime.toFixed(2)}ms` : `${castPctRemain.toFixed(2)}%`;
            console.info(`Interrupted ${spellId} being ${target.isChanneling ? 'channeled' : 'cast'} by: ${target.unsafeName} after ${interruptTime}`);
            return bt.Status.Success;
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
    * @returns {bt.Status} - Whether a dispel was cast.
    */
  static dispel(spellNameOrId, friends, priority = DispelPriority.Low, playersOnly = false, ...types) {
    return new bt.Sequence(
      new bt.Action(() => {
        // Early return if dispel mode is set to "None"
        if (Settings.DispelMode === "None") {
          return bt.Status.Failure;
        }

        const spell = Spell.getSpell(spellNameOrId);
        if (!spell || !spell.isUsable || !spell.cooldown.ready) {
          return bt.Status.Failure;
        }

        // List to target, either friends or enemies
        const list = friends ? Heal.priorityList : me.getEnemies(40);
        if (!list) {
          console.error("No list was provided for Dispel");
          return bt.Status.Failure;
        }

        // Loop through each unit in the list
        for (const unit of list) {
          if (playersOnly && !unit.isPlayer()) {
            continue;
          }

          const auras = unit.auras;
          for (const aura of auras) {
            const dispelTypeMatch = types.includes(aura.dispelType);
            // Check for debuff/buff status, dispel priority, and aura duration remaining
            const dispelPriority = dispels[aura.spellId] || DispelPriority.Low;
            const isValidDispel = friends
              ? aura.isDebuff() && dispelPriority >= priority
              : aura.isBuff() && dispelPriority >= priority;

            if (isValidDispel && aura.remaining > 2000 && dispelTypeMatch) {
              const durationPassed = aura.duration - aura.remaining;

              // Check if we should dispel based on the settings
              let shouldDispel = false;

              if (Settings.DispelMode === "Everything") {
                shouldDispel = true;
              } else if (Settings.DispelMode === "List") {
                shouldDispel = dispels[aura.spellId] !== undefined
              }

              // Try to cast the dispel if it's been long enough and meets the dispel criteria
              if (shouldDispel && durationPassed > 777 && spell.cast(unit)) {
                console.info(`Cast dispel on ${unit.unsafeName} to remove ${aura.name} with priority ${dispelPriority}`);
                return bt.Status.Success;
              }
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

  /**
   * Determines if the specified spell is in range of the target.
   *
   * This function checks whether the spell's `baseMaxRange` is 0, which implies the spell has no range limit
   * and can be cast regardless of distance. If `baseMaxRange` is greater than 0, it performs a range check
   * using the `spell.inRange()` method.
   *
   * @param {wow.Spell} spell - The spell to check.
   * @param {wow.CGUnit | wow.Guid} target - The target to check the range against.
   * @returns {boolean} - Returns `true` if the spell can be cast (either because it has no range limit or it is within range of the target), `false` otherwise.
   */
  static inRange(spell, target) {
    if (spell.baseMaxRange === 0) {
      return true;
    } else {
      return spell.inRange(target);
    }
  }
}

export default Spell;
