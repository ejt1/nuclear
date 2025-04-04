import {Behavior, BehaviorContext} from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import {me} from "@/Core/ObjectManager";
import {defaultHealTargeting as h} from "@/Targeting/HealTargeting";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";
import {DispelPriority} from "@/Data/Dispels"
import {WoWDispelType} from "@/Enums/Auras";
import spellBlacklist from "@/Data/PVPData";

const auras = {
  painSuppression: 33206,
  powerOfTheDarkSide: 198068,
  shadowWordPain: 589,
  powerWordShield: 17,
  atonement: 194384,
  surgeOfLight: 114255,
  premonitionPiety: 428930,
  premonitionSolace: 428934,
  premonitionInsight: 428933,
  harshDiscipline: 373183,
  twilightEquilibriumHolyAmp: 390706,
  twilightEquilibriumShadowAmp: 390707,
  wealAndWoe: 390787,
};

export class PriestDiscipline extends Behavior {
  name = "Priest (Discipline) PVE";
  context = BehaviorContext.Any; // PVP or PVE
  specialization = Specialization.Priest.Discipline;

  build() {
    console.info(`Welcome to: ${this.name} rotation. Pain suppression / Power word Barrier are to be used by you.`);
    return new bt.Selector(
        new bt.Decorator(
          ret => !spell.isGlobalCooldown(),
          new bt.Selector(
            common.waitForNotMounted(),
            common.waitForNotSitting(),
            common.waitForCastOrChannel(),
            spell.cast("Renew", on => me, req => me.hasVisibleAuraByMe(90985) && me.getAuraByMe(90985).remaining < 3000),
            spell.cast("Fade", on => me, req => me.inCombat() && (me.isTanking() || me.effectiveHealthPercent < 90)),
            spell.cast("Power Word: Fortitude", on => me, req => !me.hasVisibleAura(21562)),
            new bt.Decorator(
              ret => me.inCombat() && h.getPriorityTarget() !== undefined && h.getPriorityTarget().effectiveHealthPercent >= 75 && h.getPriorityTarget().hasVisibleAuraByMe(auras.atonement) && h.getPriorityTarget().getAuraByMe(auras.atonement).remaining > 4000,
              this.damageRotation(),
              new bt.Action(() => bt.Status.Success)
            ),

            new bt.Decorator(
              ret => me.inCombat() && h.getPriorityTarget() !== undefined && h.getPriorityTarget().effectiveHealthPercent >= 95,
              this.damageRotation(),
              new bt.Action(() => bt.Status.Success)
            ),
            this.healRotation(),
            this.applyAtonement(),
            common.waitForTarget(),
            new bt.Decorator(
              ret => me.inCombat(),
              new bt.Selector(
                this.damageRotation(),
              )
            ),
          )
      )
    );
  }

  getTanks() {
    return h.friends.Tanks.filter(tank => tank !== null);
  }

  // Atonement Application
  applyAtonement() {
    return new bt.Selector(
      spell.cast("Power Word: Shield", on => this.findFriendWithoutAtonement(), ret => this.findFriendWithoutAtonement() !== undefined && this.findFriendWithoutAtonement().effectiveHealthPercent < 90 && !this.hasShield(this.findFriendWithoutAtonement())),
    );
  }

  // Healing Rotation
  healRotation() {
    return new bt.Selector(
      spell.cast("Power Word: Life", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.effectiveHealthPercent < 50 && me.inCombat),
      spell.cast("Desperate Prayer", on => me, ret => me.effectiveHealthPercent < 70 && me.inCombat),
      //spell.cast("Pain Suppression", on => h.getPriorityTarget(), ret => this.shouldCastWithHealthAndNotPainSupp(34) && me.inCombat),
      spell.cast("Rapture", on => h.getPriorityTarget(), ret => this.shouldCastWithHealthAndNotPainSupp(30) && me.inCombat()),
      spell.cast("Void Shift", on => h.getPriorityTarget(), ret => this.shouldCastWithHealthAndNotPainSupp(24)),
      spell.cast("Mass Dispel", on => this.findMassDispelTarget(), ret => this.findMassDispelTarget() !== undefined),
      spell.cast("Premonition", on => me, ret => this.shouldCastPremonition(h.getPriorityTarget())),
      spell.cast("Shadow Word: Death", on => this.findDeathThePolyTarget(), ret => this.findDeathThePolyTarget() !== undefined),
      spell.cast("Evangelism", on => me, ret => me.inCombat() && this.getAtonementCount() > 3 && this.minAtonementDuration() < 4000),
      //spell.cast("Power Word: Barrier", on => h.getPriorityTarget(), ret => this.shouldCastWithHealthAndNotPainSupp(40) && me.inCombat),
      spell.cast("Power Word: Shield", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.effectiveHealthPercent < 90 && !this.hasShield(h.getPriorityTarget()) && !me.hasVisibleAura("Rapture")),
      spell.cast("Power Word: Radiance", on => me, ret => this.shouldCastRadiance()),
      spell.cast("Penance", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.effectiveHealthPercent < 40),
      spell.cast("Flash Heal", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.effectiveHealthPercent < 75 && me.hasAura(auras.surgeOfLight)),
      spell.cast("Flash Heal", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.effectiveHealthPercent < 75 && me.effectiveHealthPercent < 90 && !me.hasVisibleAura("Protective Light")),
      spell.dispel("Purify", true, DispelPriority.High, true, WoWDispelType.Magic),
      //spell.dispel("Dispel Magic", false, DispelPriority.High, true, WoWDispelType.Magic),
      spell.cast("Renew", on => h.getPriorityTarget(), ret => (!this.hasAtonement(h.getPriorityTarget()) || h.getPriorityTarget().getAuraByMe(auras.atonement).remaining  < 4000) && h.getPriorityTarget()?.effectiveHealthPercent < 80 && !me.hasVisibleAura("Rapture")),
      spell.cast("Mind Blast", on => this.currentOrBestTarget(), ret => this.hasAtonement(h.getPriorityTarget())),
      spell.cast("Shadowfiend", on => this.currentOrBestTarget(), ret => me.inCombat() && this.hasAtonement(h.getPriorityTarget())),
      spell.cast("Voidwraith", on => this.currentOrBestTarget(), ret => me.inCombat() && this.hasAtonement(h.getPriorityTarget())),
      spell.cast("Shadow Word: Death", on => this.findShadowWordDeathTarget(), ret => this.findShadowWordDeathTarget() !== undefined && this.hasAtonement(h.getPriorityTarget())),
      spell.cast("Penance", on => this.getPenanceTarget(), ret => this.shouldCastPenance()),
      spell.cast("Flash Heal", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.effectiveHealthPercent < 55),
      spell.cast("Power Word: Shield", on => h.getPriorityTarget(), ret => (!this.hasAtonement(h.getPriorityTarget()) || h.getPriorityTarget().getAuraByMe(auras.atonement).remaining  < 4000) && me.hasVisibleAura("Rapture")),
      spell.dispel("Purify", true, DispelPriority.Low, true, WoWDispelType.Magic, WoWDispelType.Disease),
      spell.cast("Penance", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.effectiveHealthPercent < 50),
      this.maintainTankAtonement(),
    );
  }

  damageRotation() {
    return new bt.Selector(
      // Buff Management: Prioritize spells based on active buffs
      spell.cast("Penance", on => this.currentOrBestTarget(), ret => me.hasAura(auras.harshDiscipline)),
      spell.cast("Penance", on => this.currentOrBestTarget(), ret => me.hasAura(auras.powerOfTheDarkSide)),
      spell.cast("Mind Blast", on => this.currentOrBestTarget(), ret => me.hasAura(auras.twilightEquilibriumShadowAmp)),
      spell.cast("Smite", on => this.currentOrBestTarget(), ret => me.hasAura(auras.twilightEquilibriumHolyAmp)),
      spell.cast("Smite", on => this.currentOrBestTarget(), ret => me.hasAura(auras.wealAndWoe)),

      // Schism: Cast on cooldown if the target doesn't have the debuff
      spell.cast("Schism", on => this.currentOrBestTarget(), ret => !this.currentOrBestTarget().hasAura("Schism") && me.inCombat),

      // Ultimate Penitence
      spell.cast("Ultimate Penitence", on => this.currentOrBestTarget(), ret => me.inCombat() && this.getAtonementCount() > 5),

      // Core Rotation Spells
      spell.cast("Shadow Word: Pain", on => this.currentOrBestTarget(), ret => !this.hasShadowWordPain(this.currentOrBestTarget())),
      spell.cast("Power Word: Radiance", on => me, ret => (spell.getCooldown("Voidwraith").timeleft < 1.5 || spell.getCooldown("Shadowfiend").timeleft < 1.5 || me.hasVisibleAura("Shadow Covenant")) && spell.getCharges("Power Word: Radiance") === 2),
      spell.cast("Shadowfiend", on => this.currentOrBestTarget(), ret => me.inCombat()),
      spell.cast("Voidwraith", on => this.currentOrBestTarget(), ret => me.inCombat()),
      spell.cast("Shadow Word: Death", on => this.findShadowWordDeathTarget(), ret => this.findShadowWordDeathTarget() !== undefined),
      spell.cast("Shadow Word: Death", on => this.currentOrBestTarget(), ret => me.hasVisibleAura("Shadow Covenant")),
      spell.cast("Mindgames", on => me.targetUnit, ret => me.targetUnit?.effectiveHealthPercent < 50),
      spell.cast("Mind Blast", on => this.currentOrBestTarget(), ret => true),
      spell.cast("Penance", on => this.hasswpTarget(), ret => this.hasswpTarget() !== undefined),
      spell.cast("Penance", on => this.currentOrBestTarget(), ret => this.hasShadowWordPain(this.currentOrBestTarget())),
      spell.cast("Halo", on => me, ret => this.getEnemiesInRange(40) >= 3),
      spell.cast("Smite", on => this.currentOrBestTarget(), ret => me.hasVisibleAura("Shadow Covenant")),
      spell.cast("Shadow Word: Pain", on => this.findswpTarget(), ret => this.findswpTarget() !== undefined),
      spell.cast("Smite", on => this.currentOrBestTarget(), ret => true)
    );
  }

  maintainTankAtonement() {
    return new bt.Selector(
      spell.cast("Power Word: Shield", on => this.getTankNeedingAtonement(), req => this.shouldApplyAtonementToTank()),
      spell.cast("Renew", on => this.getTankNeedingAtonement(), req => this.shouldApplyAtonementToTank())
    );
  }

  currentOrBestTarget() {
    const schismTarget = combat.targets.find(unit => unit.hasVisibleAuraByMe("Schism"));
    const target = me.target;
    if (schismTarget) {
      return schismTarget;
    }
    if (target !== null && me.canAttack(target)) {
      return target;
    }
    if (target === null) {
      return combat.bestTarget;
    }
  }

  getTankNeedingAtonement() {
    if (!me.inMythicPlus()) {
      return null;
    }

    const tanks = h.friends.Tanks;
    for (const tank of tanks) {
      if (this.isNotDeadAndInLineOfSight(tank)) {
        const atonement = tank.getAuraByMe(auras.atonement);
        if (!atonement || atonement.remaining < 4000) {
          return tank;
        }
      }
    }
    return null;
  }

  shouldApplyAtonementToTank() {
    return me.inMythicPlus() && this.getTankNeedingAtonement() !== null;
  }

  shouldCastRadiance() {
    if (spell.getCharges("Power Word: Radiance") < 2) {
      return false;
    }

    const lowHealthAllies = this.getLowHealthAlliesCount(85);
    if (lowHealthAllies < 3) {
      return false;
    }
    return true;
  }

  // Add this new method to the class:
  getLowHealthAlliesCount(healthThreshold) {
    return h.friends.All.filter(friend =>
      friend &&
      friend.effectiveHealthPercent < healthThreshold &&
      this.isNotDeadAndInLineOfSight(friend) &&
      !friend.getAuraByMe(auras.atonement)?.remaining > 4000
    ).length;
  }

  getCurrentTarget() {
    const targetPredicate = unit =>
      unit && common.validTarget(unit) &&
      unit.distanceTo(me) <= 30 &&
      me.withinLineOfSight(unit) &&
      !unit.isImmune();

    // First, look for a unit with the Schism aura
    const schismTarget = combat.targets.find(unit => unit.hasAura("Schism") && targetPredicate(unit));
    if (schismTarget) {
      return schismTarget;
    }

    const target = me.target;
    if (target !== null && targetPredicate(target)) {
      return target;
    }
    const enemies = me.getEnemies();

    for (const enemy of enemies) {
      if (enemy.inCombatWithMe) {
        return enemy;
      }
    }
  }

  shouldCastPenance() {
    const priorityTarget = h.getPriorityTarget();
    const currentTarget = this.getCurrentTarget();

    if (!priorityTarget) {
      return currentTarget != null;
    }

    return priorityTarget.effectiveHealthPercent < 55 ||
      (priorityTarget.effectiveHealthPercent >= 55 &&
        this.hasAtonement(priorityTarget) &&
        currentTarget != null &&
        this.hasShadowWordPain(currentTarget));
  }

  getPenanceTarget() {
    const priorityTarget = h.getPriorityTarget();
    const currentTarget = this.getCurrentTarget();

    if (!priorityTarget) {
      return currentTarget;
    }

    if (priorityTarget.effectiveHealthPercent < 55) {
      return priorityTarget;
    } else if (priorityTarget.effectiveHealthPercent >= 55 &&
      this.hasAtonement(priorityTarget) &&
      currentTarget != null &&
      this.hasShadowWordPain(currentTarget)) {
      return currentTarget;
    }

    return currentTarget;
  }

  findFriendWithoutAtonement() {
    const friends = me.getFriends();

    for (const friend of friends) {
      if (this.isNotDeadAndInLineOfSight(friend) && !this.hasAtonement(friend)) {
        return friend;
      }
    }

    return undefined;
  }

  findMassDispelTarget() {
    const enemies = me.getEnemies();

    for (const enemy of enemies) {
      if (enemy.hasAura("Ice Block") || enemy.hasAura("Divine Shield")) {
        return enemy;
      }
    }

    return undefined
  }

  findShadowWordDeathTarget() {
    const enemies = me.getEnemies();

    for (const enemy of enemies) {
      if (enemy.effectiveHealthPercent < 20 && enemy.inCombatWithMe) {
        return enemy;
      }
    }

    return undefined
  }

  findswpTarget() {
    const enemies = me.getEnemies();

    for (const enemy of enemies) {
      if ((!this.hasShadowWordPain(enemy) || enemy.getAuraByMe(auras.shadowWordPain).remaining < 4000) && enemy.inCombatWithMe) {
        return enemy;
      }
    }

    return undefined
  }

  hasswpTarget() {
    const enemies = me.getEnemies();

    for (const enemy of enemies) {
      if (this.hasShadowWordPain(enemy) && me.inCombatWith(enemy) && enemy.effectiveHealthPercent > 10) {
        return enemy;
      }
    }

    return undefined
  }

  findDeathThePolyTarget() {
    const enemies = me.getEnemies();

    for (const enemy of enemies) {
      if (enemy.isCastingOrChanneling && enemy.isPlayer()) {
        const spellInfo = enemy.spellInfo;
        const target = spellInfo ? spellInfo.spellTargetGuid : null;

        if (enemy.spellInfo) {
          const onBlacklist = spellBlacklist[enemy.spellInfo.spellCastId];
          const castRemains = enemy.spellInfo.castEnd - wow.frameTime;
          if (target && target.equals(me.guid) && onBlacklist && castRemains < 1000) {
            return enemy; // Return the enemy as the target for Shadow Word: Death
          }
        }
      }
    }

    return undefined; // No valid target found
  }

  shouldCastPremonition(target) {
    if (!target) {
      return false
    }
    if (me.hasAura(auras.premonitionInsight) || me.hasAura(auras.premonitionSolace) || me.hasAura(auras.premonitionPiety)) {
      return false;
    }
    if (target.effectiveHealthPercent < 50 || target.timeToDeath() < 3) {
      return true;
    }
  }

  // Helper to check if a target has Atonement applied by the player
  hasAtonement(target) {
    if (!target) {
      return false;
    }
    return target.hasAura(auras.atonement);
  }

  hasShield(target) {
    if (!target) {
      return false;
    }
    return target.hasAura(auras.powerWordShield);
  }


  hasShadowWordPain(target) {
    if (!target) {
      return false;
    }
    return target.hasAura(auras.shadowWordPain);
  }

  shouldCastWithHealthAndNotPainSupp(health) {
    const healTarget = h.getPriorityTarget()
    if (!healTarget) {
      return false;
    }
    return (healTarget.effectiveHealthPercent < health || healTarget.timeToDeath() < 3) && !healTarget.hasAura(auras.painSuppression);
  }

  // todo - probably move this somewhere useful rather than here?
  isNotDeadAndInLineOfSight(friend) {
    return friend && !friend.deadOrGhost && me.withinLineOfSight(friend);
  }

  getEnemiesInRange(range) {
    return combat.targets.filter(unit => me.distanceTo(unit) < range).length;
  }

  getAtonementCount() {
    return h.friends.All.filter(friend => this.hasAtonement(friend)).length;
  }

  minAtonementDuration() {
    let minDuration = Infinity;
    for (const friend of h.friends.All) {
      if (this.hasAtonement(friend)) {
        const duration = friend.getAuraByMe(auras.atonement).remaining;
        if (duration < minDuration) {
          minDuration = duration;
        }
      }
    }
    return minDuration === Infinity ? 0 : minDuration;
  }
}
