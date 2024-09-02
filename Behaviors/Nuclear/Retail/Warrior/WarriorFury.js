import { Behavior, BehaviorContext } from "../../../../Core/Behavior";
import * as bt from '../../../../Core/BehaviorTree';
import Specialization from '../../../../Enums/Specialization';
import common from '../../../../Core/Common';
import spell from "../../../../Core/Spell";
import { me } from "../../../../Core/ObjectManager";

export class WarriorFuryBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Warrior.Fury;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForTarget(),
      common.waitForCastOrChannel(),
      this.useCooldowns(),
      new bt.Decorator(
        () => Boolean(me.getUnitsAroundCount(8) >= 2),
        this.multiTargetRotation()
      ),
      new bt.Decorator(
        () => Boolean(me.getUnitsAroundCount(8) < 2 && me.isWithinMeleeRange(me.target)),
        this.singleTargetRotation()
      )
    );
  }

  useCooldowns() {
    return new bt.Selector(
      spell.cast("Lights Judgment", () => Boolean(!me.hasAura("Recklessness"))),
      spell.cast("Berserking", () => Boolean(me.hasAura("Recklessness"))),
      spell.cast("Blood Fury"),
      spell.cast("Fireblood"),
      spell.cast("Ancestral Call")
    );
  }

  multiTargetRotation() {
    return new bt.Selector(
      spell.cast("Recklessness", () => Boolean(
        (!me.hasAura(this.talentSpellIds.angerManagement) && spell.getCooldown("Avatar").timeleft < 1 && me.hasAura(this.talentSpellIds.titansTorment)) ||
        me.hasAura(this.talentSpellIds.angerManagement) ||
        !me.hasAura(this.talentSpellIds.titansTorment)
      )),
      spell.cast("Avatar", () => Boolean(
        (me.hasAura(this.talentSpellIds.titansTorment) && (me.hasAura("Enrage") || me.hasAura(this.talentSpellIds.titanicRage))) ||
        !me.hasAura(this.talentSpellIds.titansTorment)
      )),
      spell.cast("Thunderous Roar", () => Boolean(me.hasAura("Enrage"))),
      spell.cast("Champions Spear", () => Boolean(me.hasAura("Enrage"))),
      spell.cast("Odyn's Fury", () => Boolean(
        (this.getDebuffRemainingTime("385060") < 1 || !me.targetUnit.getAura(385060)) &&
        (me.hasAura("Enrage") || me.hasAura(this.talentSpellIds.titanicRage)) &&
        spell.getCooldown("Avatar").timeleft > 0
      )),
      spell.cast("Whirlwind", () => Boolean(this.getAuraStacks("Whirlwind") === 0 && me.hasAura(this.talentSpellIds.improvedWhirlwind))),
      spell.cast("Execute", () => Boolean(
        me.hasAura("Enrage") &&
        this.getAuraRemainingTime("Ashen Juggernaut") <= 1.5 &&
        me.hasAura(this.talentSpellIds.ashenJuggernaut)
      )),
      spell.cast("Rampage", () => Boolean(
        me.rage >= 85 &&
        spell.getCooldown("Bladestorm").timeleft <= 1.5 &&
        !me.targetUnit.hasAura("Champions Might")
      )),
      spell.cast("Bladestorm", () => Boolean(me.hasAura("Enrage") && spell.getCooldown("Avatar").timeleft >= 9)),
      spell.cast("Ravager", () => Boolean(me.hasAura("Enrage"))),
      spell.cast("Rampage", () => Boolean(me.hasAura(this.talentSpellIds.angerManagement))),
      spell.cast("Bloodbath", () => Boolean(me.hasAura("Furious Bloodthirst"))),
      spell.cast("Crushing Blow"),
      spell.cast("Onslaught", () => Boolean(me.hasAura(this.talentSpellIds.tenderize) || me.hasAura("Enrage"))),
      spell.cast("Bloodbath", () => Boolean(!me.targetUnit.hasAuraByMe("Gushing Wound"))),
      spell.cast("Rampage", () => Boolean(me.hasAura(this.talentSpellIds.recklessAbandon))),
      spell.cast("Execute", () => Boolean(
        me.hasAura("Enrage") &&
        ((me.targetUnit.health.pct > 35 && me.hasAura(this.talentSpellIds.massacre)) || me.targetUnit.health.pct > 20) &&
        this.getAuraRemainingTime("Sudden Death") <= 1.5
      )),
      spell.cast("Bloodbath"),
      spell.cast("Bloodthirst"),
      spell.cast("Raging Blow"),
      spell.cast("Execute"),
      spell.cast("Whirlwind")
    );
  }

  singleTargetRotation() {
    return new bt.Selector(
      spell.cast("Ravager", () => Boolean(spell.getCooldown("Recklessness").timeleft < 1.5 || me.hasAura("Recklessness"))),
      spell.cast("Recklessness", () => Boolean(
        !me.hasAura(this.talentSpellIds.angerManagement) ||
        (me.hasAura(this.talentSpellIds.angerManagement) && (spell.getCooldown("Avatar").ready || spell.getCooldown("Avatar").timeleft < 1.5 || spell.getCooldown("Avatar").timeleft > 30))
      )),
      spell.cast("Avatar", () => Boolean(
        !me.hasAura(this.talentSpellIds.titansTorment) ||
        (me.hasAura(this.talentSpellIds.titansTorment) && (me.hasAura("Enrage") || me.hasAura(this.talentSpellIds.titanicRage)))
      )),
      spell.cast("Champions Spear", () => Boolean(
        me.hasAura("Enrage") &&
        ((me.hasAura("Furious Bloodthirst") && me.hasAura(this.talentSpellIds.titansTorment)) ||
        !me.hasAura(this.talentSpellIds.titansTorment) ||
        me.targetUnit.timeToDie < 20 ||
        this.getEnemiesInRange(8) > 1)
      )),
      spell.cast("Whirlwind", () => Boolean(
        (this.getEnemiesInRange(8) > 1 && me.hasAura(this.talentSpellIds.improvedWhirlwind) && !me.hasAura("Meat Cleaver")) ||
        (this.timeToAdds() < 2 && me.hasAura(this.talentSpellIds.improvedWhirlwind) && !me.hasAura("Meat Cleaver"))
      )),
      spell.cast("Execute", () => Boolean(
        me.hasAura("Ashen Juggernaut") &&
        this.getAuraRemainingTime("Ashen Juggernaut") < 1.5
      )),
      spell.cast("Bladestorm", () => Boolean(
        me.hasAura("Enrage") &&
        (me.hasAura("Avatar") || (me.hasAura("Recklessness") && me.hasAura(this.talentSpellIds.angerManagement)))
      )),
      spell.cast("Odyns Fury", () => Boolean(
        me.hasAura("Enrage") &&
        (this.getEnemiesInRange(8) > 1 || this.timeToAdds() > 15) &&
        (me.hasAura(this.talentSpellIds.dancingBlades) && this.getAuraRemainingTime("Dancing Blades") < 5 || !me.hasAura(this.talentSpellIds.dancingBlades))
      )),
      spell.cast("Rampage", () => Boolean(
        me.hasAura(this.talentSpellIds.angerManagement) &&
        (me.hasAura("Recklessness") || this.getAuraRemainingTime("Enrage") < 1.5 || me.rage > 85)
      )),
      spell.cast("Bloodthirst", () => Boolean(
        (!me.hasAura(this.talentSpellIds.recklessAbandon) &&
        me.hasAura("Furious Bloodthirst") &&
        me.hasAura("Enrage") &&
        (!me.targetUnit.hasAuraByMe("Gushing Wound") || me.hasAura("Champions Might")))
      )),
      spell.cast("Bloodbath", () => Boolean(me.hasAura("Furious Bloodthirst"))),
      spell.cast("Thunderous Roar", () => Boolean(
        me.hasAura("Enrage") &&
        (this.getEnemiesInRange(8) > 1 || this.timeToAdds() > 15)
      )),
      spell.cast("Onslaught", () => Boolean(me.hasAura("Enrage") || me.hasAura(this.talentSpellIds.tenderize))),
      spell.cast("Crushing Blow", () => Boolean(me.hasAura("Enrage"))),
      spell.cast("Rampage", () => Boolean(
        me.hasAura(this.talentSpellIds.recklessAbandon) &&
        (me.hasAura("Recklessness") || this.getAuraRemainingTime("Enrage") < 1.5 || me.rage > 85)
      )),
      spell.cast("Execute", () => Boolean(
        me.hasAura("Enrage") &&
        !me.hasAura("Furious Bloodthirst") &&
        me.hasAura("Ashen Juggernaut") ||
        this.getAuraRemainingTime("Sudden Death") <= 1.5 &&
        (me.targetUnit.health.pct > 35 && me.hasAura(this.talentSpellIds.massacre) || me.targetUnit.health.pct > 20)
      )),
      spell.cast("Execute", () => Boolean(me.hasAura("Enrage"))),
      spell.cast("Rampage", () => Boolean(me.hasAura(this.talentSpellIds.angerManagement))),
      spell.cast("Bloodbath", () => Boolean(
        me.hasAura("Enrage") &&
        me.hasAura(this.talentSpellIds.recklessAbandon)
      )),
      spell.cast("Rampage", () => Boolean(me.targetUnit.health.pct < 35 && me.hasAura(this.talentSpellIds.massacre))),
      spell.cast("Bloodthirst", () => Boolean(!me.hasAura("Enrage") || !me.hasAura("Furious Bloodthirst"))),
      spell.cast("Raging Blow", () => Boolean(spell.getCharges("Raging Blow") > 1)),
      spell.cast("Crushing Blow", () => Boolean(spell.getCharges("Raging Blow") > 1)),
      spell.cast("Bloodbath", () => Boolean(!me.hasAura("Enrage"))),
      spell.cast("Crushing Blow", () => Boolean(
        me.hasAura("Enrage") &&
        me.hasAura(this.talentSpellIds.recklessAbandon)
      )),
      spell.cast("Bloodthirst", () => Boolean(!me.hasAura("Furious Bloodthirst"))),
      spell.cast("Raging Blow", () => Boolean(spell.getCharges("Raging Blow") > 1)),
      spell.cast("Rampage"),
      spell.cast("Bloodbath"),
      spell.cast("Raging Blow"),
      spell.cast("Crushing Blow"),
      spell.cast("Bloodthirst"),
      spell.cast("Slam")
    );
  }

  // Helper methods
  getEnemiesInRange(range) {
    return me.getUnitsAroundCount(range);
  }

  talentSpellIds = {
    angerManagement: 152278,
    titansTorment: 390135,
    titanicRage: 394329,
    improvedWhirlwind: 12950,
    ashenJuggernaut: 392536,
    massacre: 383103,
    tenderize: 388933,
    recklessAbandon: 396749,
    dancingBlades: 391683
  };

  timeToAdds() {
    return 9999;
  }

  getAuraRemainingTime(auraName) {
    const aura = me.getAura(auraName);
    return aura ? aura.remaining : 0;
  }

  getDebuffRemainingTime(debuffName) {
    const debuff = me.targetUnit.getAura(debuffName);
    return debuff ? debuff.remaining : 0;
  }

  getDebuffStacks(debuffName) {
    const debuff = me.targetUnit.getAura(debuffName);
    return debuff ? debuff.stacks : 0;
  }

  getAuraStacks(auraName) {
    const aura = me.getAura(auraName);
    return aura ? aura.stacks : 0;
  }
}
