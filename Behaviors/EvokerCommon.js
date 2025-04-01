import * as bt from '@/Core/BehaviorTree';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";

class EvokerCommon {
  static castEmpowered(spellNameOrId, desiredEmpowerLevel, on, conditions) {
    return new bt.Sequence(
      spell.cast(spellNameOrId, () => on(), () => conditions()),
      this.setDesiredEmpowerLevel(desiredEmpowerLevel)
    );
  }

  static setDesiredEmpowerLevel(desiredEmpowerLevel) {
    return new bt.Action(() => {
      this._desiredEmpowerLevel = desiredEmpowerLevel;
      // Store the timestamp when we started empowering
      this._empowerStartTime = Date.now();
      return bt.Status.Success;
    });
  }

  static handleEmpoweredSpell() {
    // If we don't have a desired empower level set, there's nothing to handle
    if (this._desiredEmpowerLevel === undefined) {
      return bt.Status.Failure;
    }

    // Get current empower info
    const currentSpellId = me.spellInfo.spellChannelId;
    const currentSpell = spell.getSpell(currentSpellId);
    const currentEmpowerLevel = me.spellInfo.empowerLevel || 0;
    
    // If we're not currently empowering a spell, fail
    if (!currentSpell || !me.isCastingOrChanneling) {
      this._desiredEmpowerLevel = undefined;
      return bt.Status.Failure;
    }
    
    // Calculate how long we've been empowering
    const empowerTime = Date.now() - (this._empowerStartTime || 0);
    
    // Release conditions:
    // 1. We've reached our desired empower level
    // 2. We've been empowering for at least a minimum time per level (roughly 500ms per level)
    // 3. We're at max empower level (3) regardless of desired level
    if (currentEmpowerLevel >= this._desiredEmpowerLevel || 
        empowerTime >= (this._desiredEmpowerLevel * 500) || 
        currentEmpowerLevel >= 3) {
      
      currentSpell.cast(me.targetUnit);
      this._desiredEmpowerLevel = undefined;
      this._empowerStartTime = undefined;
      return bt.Status.Success;
    }
    
    // Continue holding for more empower
    return bt.Status.Running;
  }

  static findBestDeepBreathTarget()  {
    return combat.targets.reduce((best, mainUnit) => {
      const unitsInRange = combat.targets.filter(target =>
        target.distanceTo(mainUnit) <= 30 && // Fixed distance check
        me.isFacing(target, 30)
      ).length;

      return unitsInRange > best.count ? { unit: mainUnit, count: unitsInRange } : best;
    }, { unit: null, count: 0 });
  };
  
  // Helper to detect if we're currently empowering a specific spell
  static isEmpowering(spellName) {
    if (!me.isCastingOrChanneling) return false;
    
    const currentSpell = spell.getSpell(me.spellInfo.spellChannelId);
    if (!currentSpell) return false;
    
    return currentSpell.name === spellName;
  }
}

export default EvokerCommon;