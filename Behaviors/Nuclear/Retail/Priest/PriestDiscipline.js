import {Behavior, BehaviorContext} from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import {me} from "@/Core/ObjectManager";
import {defaultHealTargeting as h} from "@/Targeting/HealTargeting";
import {DispelPriority} from "@/Data/Dispels"
import {WoWDispelType} from "@/Enums/Auras";
import spellBlacklist from "@/Data/PVPData";
import Spell from "@/Core/Spell";

const auras = {
  painSuppression: 33206,
  powerOfTheDarkSide: 198068,
  purgeTheWicked: 204213,
  powerWordShield: 17,
  atonement: 194384,
  surgeOfLight: 114255,
  premonitionPiety: 428930,
  premonitionSolace: 428934,
  premonitionInsight: 428933,
};

export class PriestDiscipline extends Behavior {
  name = "Priest (Discipline) PVP";
  context = BehaviorContext.Any; // PVP or PVE
  specialization = Specialization.Priest.Discipline;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForNotWaitingForArenaToStart(),
        common.waitForNotSitting(),
        common.waitForNotMounted(),
        common.waitForCastOrChannel(),
        this.healRotation(),
        this.applyAtonement(),
        common.waitForTarget(),
        common.waitForFacing(),
        this.damageRotation(),
      )
    );
  }

  // Atonement Application
  applyAtonement() {
    return new bt.Selector(
      spell.cast("Power Word: Shield", on => this.findFriendWithoutAtonement(), ret => this.findFriendWithoutAtonement() !== undefined)
    );
  }

  // Healing Rotation
  healRotation() {
    return new bt.Selector(
      spell.cast("Power Word: Life", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 50),
      spell.cast("Desperate Prayer", on => me, ret => me.pctHealth < 40),
      spell.cast("Pain Suppression", on => h.getPriorityTarget(), ret => this.shouldCastWithHealthAndNotPainSupp(34)),
      spell.cast("Rapture", on => h.getPriorityTarget(), ret => this.shouldCastWithHealthAndNotPainSupp(42)),
      spell.cast("Void Shift", on => h.getPriorityTarget(), ret => this.shouldCastWithHealthAndNotPainSupp(24)),
      spell.cast("Mass Dispel", on => this.findMassDispelTarget(), ret => this.findMassDispelTarget() !== undefined),
      spell.cast("Premonition", on => me, ret => this.shouldCastPremonition(h.getPriorityTarget())),
      spell.cast("Shadow Word: Death", on => this.findDeathThePolyTarget(), ret => this.findDeathThePolyTarget() !== undefined),
      spell.cast("Power Word: Barrier", on => h.getPriorityTarget(), ret => this.shouldCastWithHealthAndNotPainSupp(40)),
      spell.cast("Power Word: Shield", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 89 && !this.hasShield(h.getPriorityTarget())),
      spell.cast("Power Word: Radiance", on => h.getPriorityTarget(), ret => this.shouldCastRadiance(2)),
      spell.cast("Flash Heal", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 85 && me.hasAura(auras.surgeOfLight)),
      spell.dispel("Purify", true, DispelPriority.High, true, WoWDispelType.Magic),
      spell.dispel("Dispel Magic", false, DispelPriority.High, true, WoWDispelType.Magic),
      spell.cast("Penance", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 69),
      spell.cast("Power Word: Radiance", on => h.getPriorityTarget(), ret => this.shouldCastRadiance(1)),
      spell.cast("Penance", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 65),
      spell.cast("Flash Heal", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 55),
      spell.dispel("Purify", true, DispelPriority.Medium, true, WoWDispelType.Magic),
      spell.dispel("Dispel Magic", false, DispelPriority.Medium, true, WoWDispelType.Magic),
    );
  }

  // Damage Rotation
  damageRotation() {
    return new bt.Selector(
      spell.cast("Shadow Word: Death", on => this.findShadowWordDeathTarget(), ret => this.findShadowWordDeathTarget() !== undefined),
      spell.cast("Shadow Word: Pain", ret => me.targetUnit && !this.hasPurgeTheWicked(me.targetUnit)),
      spell.cast("Mindgames", on => me.targetUnit, ret => me.targetUnit?.pctHealth < 50),
      spell.cast("Penance", on => me.targetUnit, ret => me.hasAura(auras.powerOfTheDarkSide)),
      spell.cast("Mind Blast", on => me.targetUnit, ret => true),
      spell.cast("Penance", ret => true),
      spell.cast("Smite", ret => true)
    );
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
      if (enemy.pctHealth < 20) {
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
    if (target.pctHealth < 50 || target.timeToDeath() < 3) {
      return true;
    }
  }

  // Helper to check if a target has Atonement applied by the player
  hasAtonement(target) {
    if (!target) {
      return false;
    }
    return target.hasAuraByMe(auras.atonement);
  }

  hasShield(target) {
    if (!target) {
      return false;
    }
    return target.hasAuraByMe(auras.powerWordShield);
  }


  hasPurgeTheWicked(target) {
    if (!target) {
      return false;
    }
    return target.hasAura(auras.purgeTheWicked);
  }

  shouldCastWithHealthAndNotPainSupp(health) {
    const healTarget = h.getPriorityTarget()
    if (!healTarget) {
      return false;
    }
    return (healTarget.pctHealth < health || healTarget.timeToDeath() < 3) && !healTarget.hasAuraByMe(auras.painSuppression);
  }

  shouldCastRadiance(charges) {
    const healTarget = h.getPriorityTarget();
    if (!healTarget) {
      return false;
    }
    return healTarget.pctHealth < 59 && spell.getCharges("Power Word: Radiance") === charges;
  }

  // todo - probably move this somewhere useful rather than here?
  isNotDeadAndInLineOfSight(friend) {
    return friend && !friend.deadOrGhost && me.withinLineOfSight(friend);
  }

}

