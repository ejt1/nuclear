import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { defaultHealTargeting as h } from "@/Targeting/HealTargeting";
import { DispelPriority } from "@/Data/Dispels";
import { WoWDispelType } from "@/Enums/Auras";

const auras = {
  painSuppression: 33206,
  powerOfTheDarkSide: 198068,
  purgeTheWicked: 204213,
  powerWordShield: 17,
  atonement: 194384,
  surgeOfLight: 114255
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
        common.waitForNotMounted(),
        common.waitForCastOrChannel(),
        this.healRotation(),
        this.applyAtonement(),
        common.waitForTarget(),
        common.waitForFacing(),
        this.applyOffensiveDoTs(),
        this.damageRotation(),
      )
    );
  }

  // Atonement Application
  applyAtonement() {
    return new bt.Selector(
      spell.cast("Power Word: Shield", on => h.getPriorityTarget(), ret => !this.hasAtonement(h.getPriorityTarget()))
    );
  }

  // Healing Rotation
  healRotation() {
    return new bt.Selector(
      spell.cast("Power Word: Life", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 35),
      spell.cast("Mass Dispel", on => this.findMassDispelTarget(), ret => this.findMassDispelTarget() !== undefined),
      spell.cast("Desperate Prayer", on => me, ret => me.pctHealth < 40),
      //todo death the poly
      spell.cast("Pain Suppression", on => h.getPriorityTarget(), ret => (h.getPriorityTarget()?.pctHealth < 34 || h.getPriorityTarget()?.timeToDeath() < 2) && !this.hasPainSuppression(h.getPriorityTarget())),
      spell.cast("Rapture", on => h.getPriorityTarget(), ret => (h.getPriorityTarget()?.pctHealth < 38 || h.getPriorityTarget()?.timeToDeath() < 2) && !this.hasPainSuppression(h.getPriorityTarget())),
      spell.cast("Void Shift", on => h.getPriorityTarget(), ret => (h.getPriorityTarget()?.pctHealth < 24  || h.getPriorityTarget()?.timeToDeath() < 2) && !this.hasPainSuppression(h.getPriorityTarget())),
      spell.cast("Power Word: Barrier", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 40 & !this.hasPainSuppression(h.getPriorityTarget())),
      spell.cast("Power Word: Shield", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 80 && !this.hasShield(h.getPriorityTarget()) && !this.hasAtonement(h.getPriorityTarget())),
      spell.cast("Power Word: Radiance", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 55 && spell.getCharges("Power Word: Radiance") === 2),
      spell.cast("Flash Heal", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 75 && me.hasAura(auras.surgeOfLight)),
      spell.dispel("Purify", true, DispelPriority.High, true, WoWDispelType.Magic),
      spell.dispel("Dispel Magic", false, DispelPriority.High, true, WoWDispelType.Magic),
      // todo dispel magic high prio
      spell.cast("Penance", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 69),
      spell.cast("Power Word: Radiance", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 55 && spell.getCharges("Power Word: Radiance") === 1),
      spell.cast("Flash Heal", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 75),
      spell.cast("Penance", on => h.getPriorityTarget(), ret => h.getPriorityTarget()?.pctHealth < 90)
    );
  }

  // Offensive DoTs
  applyOffensiveDoTs() {
    return new bt.Selector(
      spell.cast("Shadow Word: Pain", ret => me.targetUnit && !this.hasPurgeTheWicked(me.targetUnit))
    );
  }

  // Damage Rotation
  damageRotation() {
    return new bt.Selector(
      spell.cast("Mindgames", on => me.targetUnit, ret => me.targetUnit?.pctHealth < 50),
      spell.cast("Penance", on => me.targetUnit, ret => me.hasAura(auras.powerOfTheDarkSide)),
      spell.cast("Mind Blast", on => me.targetUnit, ret => true),
      spell.cast("Smite", on => me.targetUnit, ret => true),
      spell.cast("Shadow Word: Pain", ret => me.targetUnit && !this.hasPurgeTheWicked(me.targetUnit)),
      spell.cast("Penance", ret => true),
      spell.cast("Smite", ret => true)
    );
  }

  findMassDispelTarget() {
    const enemies = me.getEnemies(); // Assuming me.getEnemies() gives a list of enemy targets

    for (const enemy of enemies) {
      if (enemy.hasAura("Ice Block") || enemy.hasAura("Divine Shield")) {
        return enemy;
      }
    }

    return undefined
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

  // Helper to check if a target has Atonement applied by the player
  hasPainSuppression(target) {
    if (!target) {
      return false;
    }
    return target.hasAuraByMe(auras.painSuppression);
  }


  hasPurgeTheWicked(target) {
    if (!target) {
      return false;
    }
    return target?.hasAura(auras.purgeTheWicked);
  }
}

export default PriestDiscipline;


