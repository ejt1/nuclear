import * as bt from './BehaviorTree'
import objMgr, { me } from './ObjectManager'
import CGUnit from "../Extensions/CGUnit";
import Spell from './Spell';

class Common {
  static waitForCastOrChannel() {
    return new bt.Selector(
      Common.waitForCast(),
      Common.waitForChannel(),
    );
  }

  static waitForCast() {
    return new bt.Action(() => {
      if (me.isCasting) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
  }

  static waitForChannel() {
    return new bt.Action(() => {
      if (me.isChanneling) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
  }

  static waitForTarget() {
    return new bt.Action(() => {
      if (!me.targetUnit || !Common.validTarget(me.targetUnit)) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
  }

  static waitForNotSitting() {
    return new bt.Action(() => {
      if (me.isSitting()) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
  }

  static waitForFacing() {
    return new bt.Action(() => {
      if (!me.targetUnit || !me.isFacing(me.targetUnit)) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
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
    });
  }

  static ensureAutoAttack() {
    return new bt.Action(() => {
      const autoAttack = Spell.getSpell("Auto Attack")

      if (!autoAttack.isActive) {
        me.toggleAttack();
        return bt.Status.Success;
      }

      return bt.Status.Failure;
    });
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

  static useItemByName(name) {
    const theItem = this.getItemByName(name)
    // use item with checks
  }
}

export default Common;
