import {Behavior, BehaviorContext} from "../../../../Core/Behavior";
import * as bt from '../../../../Core/BehaviorTree';
import Specialization from '../../../../Enums/Specialization';
import common from '../../../../Core/Common';
import spell from "../../../../Core/Spell";
import {me} from "../../../../Core/ObjectManager";
import { defaultHealTargeting as HEAL } from "../../../../Targeting/HealTargeting";

const auras = {
  purgeTheWicked: 204213,
  powerWordShield: 17,
  atonement: 194384
}

export class PriestDiscipline extends Behavior {
  name = "Priest (Discipline)";
  context = BehaviorContext.Any; // PVP or PVE
  specialization = Specialization.Priest.Discipline;
  version = wow.GameVersion.Retail;


  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForCastOrChannel(),
        this.applyAtonement(),
        this.healRotation(),
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
      // Power Word: Shield or Flash Heal to apply Atonement
      spell.cast("Power Word: Shield", on => HEAL.getPriorityTarget(), ret => !HEAL.getPriorityTarget()?.hasAura(auras.atonement)),
    );
  }

  // Applying DoTs like Purge the Wicked
  applyOffensiveDoTs() {
    return new bt.Selector(
      spell.cast("Shadow Word: Pain", ret => !me.targetUnit?.hasAura(auras.purgeTheWicked))
    );
  }

  // Healing Rotation
  healRotation() {
    return new bt.Selector(
      // Burst Healing Phase
      new bt.Decorator(
        ret => HEAL.getPriorityTarget() && HEAL.getPriorityTarget().pctHealth < 35, // TODO IMPLEMENT UH OH  phase
        new bt.Selector(
          spell.cast("Power Word: Radiance", on => HEAL.getPriorityTarget().pctHealth < 35),
        )
      ),
      // Sustained Healing Phase
      new bt.Decorator(
        ret => HEAL.getPriorityTarget() && HEAL.getPriorityTarget().pctHealth >= 0,
        new bt.Selector(
          spell.cast("Power Word: Radiance", on => HEAL.getPriorityTarget().pctHealth < 35),
          spell.cast("Flash Heal", on => HEAL.getPriorityTarget(), ret => HEAL.getPriorityTarget().pctHealth < 60),
          spell.cast("Power Word: Shield", on => HEAL.getPriorityTarget(), ret => HEAL.getPriorityTarget().pctHealth <= 90 && !HEAL.getPriorityTarget()?.hasAura(auras.powerWordShield) && !HEAL.getPriorityTarget().hasAura(auras.atonement)), spell.cast("Flash Heal", on => HEAL.getPriorityTarget(), ret => HEAL.getPriorityTarget().pctHealth < 90),
          spell.cast("Penance", on => HEAL.getPriorityTarget(), ret => HEAL.getPriorityTarget().pctHealth < 70)
        )
      )
    );
  }

  damageRotation() {
    return new bt.Selector(
      // Burst Damage Phase
      new bt.Decorator(
        ret => me.targetUnit && me.targetUnit.pctHealth < 80,
        new bt.Selector(
          //spell.cast("Power Infusion", on => me, ret => true),
          spell.cast("Shadowfiend", on => me.targetUnit, ret => me.pctPower < 60),
          spell.cast("Schism", on => me.targetUnit, ret => true),
          //spell.cast("Dark Archangel", on => me.targetUnit, ret => me.hasPvPTalent("Dark Archangel")),
          spell.cast("Mindgames", on => me.targetUnit, ret => true),
          spell.cast("Penance", on => me.targetUnit, ret => true),
          spell.cast("Shadow Word: Death", on => me.targetUnit, ret => me.targetUnit.pctHealth < 20),
          spell.cast("Power Word: Solace", on => me.targetUnit, ret => true),
          spell.cast("Mind Blast", on => me.targetUnit, ret => true),
          spell.cast("Smite", on => me.targetUnit, ret => true)
        )
      ),
      // Sustained Damage Phase
      new bt.Decorator(
        ret => me.targetUnit && me.targetUnit.pctHealth >= 20,
        new bt.Selector(
          spell.cast("Shadow Word: Pain", ret => !me.targetUnit.hasAura(auras.purgeTheWicked)),
          spell.cast("Penance", ret => true),
          spell.cast("Smite", ret => true)
        )
      )
    );
  }
}

