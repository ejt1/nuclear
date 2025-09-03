import * as bt from './BehaviorTree'
import objMgr, { me } from './ObjectManager'
import CGUnit from "../Extensions/CGUnit";
import Spell from './Spell';
import spell from "@/Core/Spell";

class Common {
  static waitForCastOrChannel() {
    return new bt.Action(() => {
      if (me.isCastingOrChanneling) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    }, "Wait for cast or channel");
  }

  static waitForTarget() {
    return new bt.Action(() => {
      if (!me.targetUnit || !Common.validTarget(me.targetUnit)) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    }, "Wait for target");
  }

  static waitForNotSitting() {
    return new bt.Action(() => {
      if (me.isSitting()) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    }, "Wait for not sitting");
  }

  static waitForFacing() {
    return new bt.Action(() => {
      if (!me.targetUnit || !me.isFacing(me.targetUnit)) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    }, "Wait for facing");
  }

  static validTarget(u) {
    if (!u || u.deadOrGhost || !me.canAttack(u)) {
      return false;
    }

    return true;
  }

  static waitForNotMounted() {
    return new bt.Action(() => {
      if (me.isMounted) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    }, "Wait for not mounted");
  }

  static ensureAutoAttack() {
    return new bt.Action(() => {
      const autoAttack = Spell.getSpell("Auto Attack")

      if (!autoAttack.isActive) {
        me.toggleAttack();
        return bt.Status.Success;
      }

      return bt.Status.Failure;
    }, "Ensure Auto Attacking");
  }

  /**
   * Finds and returns an item by its name.
   *
   * @param {string} name - The name of the item to find.
   * @returns {wow.CGItem|null} The item if found, otherwise null.
   */
  static getItemByName(name) {
    let foundItem = null;

    // Iterate over all objects in ObjectManager
    objMgr.objects.forEach((obj) => {
      if (obj instanceof wow.CGItem && obj.name === name) {
        foundItem = obj; // Set the found item
      }
    });

    // Return the found item or null if not found
    return foundItem;
  }

  /**
   * Uses an item by its name.
   *
   * @param {string} name - The name of the item to use.
   * @param {wow.CGObject|wow.Guid|undefined} [target] - Optional target for the item use.
   * @returns {boolean} True if the item was used successfully, false otherwise.
   */
  static useItemByName(name, target = undefined) {
    const item = this.getItemByName(name);

    if (!item) {
      return false;
    }

    if (!item.cooldown.ready) {
      return false;
    }

    if (!item.useSpell) {
      return false;
    }

    // Check if the item has charges (if applicable)
    if (item.enchantment && item.enchantment.charges === 0) {
      return false;
    }

    // Check if the item has expired (if applicable)
    if (item.expiration !== 0 && item.expiration <= wow.frameTime) {
      return false;
    }

    // Attempt to use the item
    const success = item.use(target);
    if (success) {
      console.debug(`Successfully used item "${name}".`);
    } else {
      console.debug(`Failed to use item "${name}".`);
    }

    return success;
  }

  /**
   * Finds and returns an equipped item by its name.
   *
   * @param {string} name - The name of the item to find.
   * @returns {wow.CGItem|null} The equipped item if found, otherwise null.
   */
  static getEquippedItemByName(name) {
    let foundItem = null;

    // Iterate over all objects in ObjectManager
    objMgr.objects.forEach((obj) => {
      if (obj instanceof wow.CGItem &&
        obj.name === name &&
        obj.owner && obj.containedIn &&
        obj.owner.equals(obj.containedIn) &&
        obj.owner.equals(me.guid)) {
        foundItem = obj; // Set the found item
      }
    });

    // Return the found item or null if not found
    return foundItem;
  }

  /**
   * Uses an equipped item by its name.
   *
   * @param {string} name - The name of the equipped item to use.
   * @param {wow.CGObject|wow.Guid|undefined} [target] - Optional target for the item use.
   * @returns {boolean} True if the item was used successfully, false otherwise.
   */
  static useEquippedItemByName(name, targetSelector = () => undefined) {
    return new bt.Action(() => {
      const item = this.getEquippedItemByName(name);

      if (!item || item === null) {
        //console.debug(`Equipped item "${name}" not found.`);
        return bt.Status.Failure;
      }

      if (!item.useSpell) {
        // console.debug(`Equipped item "${name}" is not usable.`);
        return bt.Status.Failure;
      }

      // Check the cooldown of the item's use spell
      if (!item.cooldown.ready) {
        //console.debug(`Equipped item "${name}" is on cooldown.`);
        return bt.Status.Failure;
      }

      // Check if the item has charges (if applicable)
      if (item.enchantment && item.enchantment.charges === 0) {
        //console.debug(`Equipped item "${name}" has no charges left.`);
        return bt.Status.Failure;
      }

      // Check if the item has expired (if applicable)
      if (item.expiration !== 0 && item.expiration <= wow.frameTime) {
        //console.debug(`Equipped item "${name}" has expired.`);
        return bt.Status.Failure;
      }

      const target = targetSelector();

      // Attempt to use the item
      const success = item.use(target);
      if (success) {
        console.info(`Used equipped item "${name}".`);
        return bt.Status.Success;
      } else {
        return bt.Status.Failure;
      }
    }, `Use equipped item ${name}`);
  }

  static waitForNotWaitingForArenaToStart() {
    return new bt.Action(() => {
      if (me.hasArenaPreparation()) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    }, "Wait for not waiting for arena to start");
  }
}

export default Common;
