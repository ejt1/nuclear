import { Behavior, BehaviorContext } from "../../../../Core/Behavior";
import * as bt from '../../../../Core/BehaviorTree';
import Specialization from '../../../../Enums/Specialization';
import common from '../../../../Core/Common';
import spell from "../../../../Core/Spell";
import { me } from "../../../../Core/ObjectManager";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";
import colors from "@/Enums/Colors";

export class WarriorFuryBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Warrior.Fury;
  version = wow.GameVersion.Retail;
  name = "JMR Warrior Fury";  

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForTarget(),
      common.waitForCastOrChannel(),
      common.waitForFacing(),
      spell.cast("Battle Shout", () => !me.hasAura("Battle Shout")),
      spell.cast("Victory Rush", () => me.pctHealth < 70),
      spell.cast("Bloodthirst", () => me.pctHealth < 70 && me.hasVisibleAura("Enraged Regeneration")),
      spell.interrupt("Pummel", false),
      spell.interrupt("Storm Bolt", false),
      this.useCooldowns(),
      new bt.Decorator(
        () => Boolean(me.getUnitsAroundCount(8) >= 2),
        new bt.Selector(
          this.multiTargetRotation(),
          new bt.Action(() => bt.Status.Success)
        )
      ),
      new bt.Decorator(
        () => Boolean(me.getUnitsAroundCount(8) < 2),
        this.singleTargetRotation()
      )
    );
  }

  useCooldowns() {
    return new bt.Selector(
      spell.cast("Lights Judgment", () => Boolean(!me.hasAura("Recklessness"))),
      spell.cast("Berserking", () => Boolean(me.hasAura("Recklessness"))),
      spell.cast("Blood Fury", () => Boolean(me.hasAura("Recklessness") && me.getUnitsAroundCount(8) >= 1)),
      spell.cast("Fireblood"),
      spell.cast("Ancestral Call")
    );
  }

  multiTargetRotation() {
    return new bt.Selector(
      this.castOnTargetOrClosest("Recklessness", () => Boolean(
        (!me.hasAura(this.talentSpellIds.angerManagement) && spell.getCooldown("Avatar").timeleft < 1 && me.hasAura(this.talentSpellIds.titansTorment)) ||
        me.hasAura(this.talentSpellIds.angerManagement) ||
        !me.hasAura(this.talentSpellIds.titansTorment)
      )),
      this.castOnTargetOrClosest("Avatar", () => Boolean(
        (me.hasAura(this.talentSpellIds.titansTorment) && (me.hasAura("Enrage") || me.hasAura(this.talentSpellIds.titanicRage))) ||
        !me.hasAura(this.talentSpellIds.titansTorment)
      )),
      this.castOnTargetOrClosest("Thunderous Roar", () => Boolean(me.hasAura("Enrage"))),
      this.castOnTargetOrClosest("Champions Spear", () => Boolean(me.hasAura("Enrage"))),
      this.castOnTargetOrClosest("Odyn's Fury", () => Boolean(
        (this.getDebuffRemainingTime("385060") < 1 || !this.getTargetUnit().getAura(385060)) &&
        (me.hasAura("Enrage") || me.hasAura(this.talentSpellIds.titanicRage)) &&
        spell.getCooldown("Avatar").timeleft > 0
      )),
      this.castOnTargetOrClosest("Whirlwind", () => Boolean(this.getAuraStacks("Whirlwind") === 0 && me.hasAura(this.talentSpellIds.improvedWhirlwind))),
      this.castOnTargetOrClosest("Execute", () => Boolean(
        me.hasAura("Enrage") &&
        this.getAuraRemainingTime("Ashen Juggernaut") <= 1.5 &&
        me.hasAura(this.talentSpellIds.ashenJuggernaut)
      )),
      this.castOnTargetOrClosest("Rampage", () => Boolean(
        me.rage >= 85 &&
        spell.getCooldown("Bladestorm").timeleft <= 1.5 &&
        !me.hasAura("Champion's Might")
      )),
      this.castOnTargetOrClosest("Bladestorm", () => Boolean(me.hasAura("Enrage") && spell.getCooldown("Avatar").timeleft >= 9)),
      this.castOnTargetOrClosest("Ravager", () => Boolean(me.hasAura("Enrage"))),
      this.castOnTargetOrClosest("Rampage", () => Boolean(me.hasAura(this.talentSpellIds.angerManagement))),
      this.castOnTargetOrClosest("Bloodbath", () => Boolean(me.hasAura("Furious Bloodthirst"))),
      this.castOnTargetOrClosest("Crushing Blow"),
      this.castOnTargetOrClosest("Onslaught", () => Boolean(me.hasAura(this.talentSpellIds.tenderize) || me.hasAura("Enrage"))),
      this.castOnTargetOrClosest("Bloodbath", (target) => Boolean(!target.hasAuraByMe("Gushing Wound"))),
      this.castOnTargetOrClosest("Rampage", () => Boolean(me.hasAura(this.talentSpellIds.recklessAbandon))),
      this.castOnTargetOrClosest("Execute", (target) => Boolean(
        me.hasAura("Enrage") &&
        ((target.health.pct > 35 && me.hasAura(this.talentSpellIds.massacre)) || target.health.pct > 20) &&
        this.getAuraRemainingTime("Sudden Death") <= 1.5
      )),
      this.castOnTargetOrClosest("Bloodbath"),
      this.castOnTargetOrClosest("Bloodthirst"),
      this.castOnTargetOrClosest("Raging Blow"),
      this.castOnTargetOrClosest("Execute"),
      this.castOnTargetOrClosest("Whirlwind")
    );
  }
  
  singleTargetRotation() {
    return new bt.Selector(
      this.castOnTargetOrClosest("Ravager", () => Boolean(spell.getCooldown("Recklessness").timeleft < 1.5 || me.hasAura("Recklessness"))),
      this.castOnTargetOrClosest("Recklessness", () => Boolean(
        !me.hasAura(this.talentSpellIds.angerManagement) ||
        (me.hasAura(this.talentSpellIds.angerManagement) && (spell.getCooldown("Avatar").ready || spell.getCooldown("Avatar").timeleft < 1.5 || spell.getCooldown("Avatar").timeleft > 30))
      )),
      this.castOnTargetOrClosest("Avatar", () => Boolean(
        !me.hasAura(this.talentSpellIds.titansTorment) ||
        (me.hasAura(this.talentSpellIds.titansTorment) && (me.hasAura("Enrage") || me.hasAura(this.talentSpellIds.titanicRage)))
      )),
      this.castOnTargetOrClosest("Champions Spear", () => Boolean(
        me.hasAura("Enrage") &&
        ((me.hasAura("Furious Bloodthirst") && me.hasAura(this.talentSpellIds.titansTorment)) ||
          !me.hasAura(this.talentSpellIds.titansTorment) ||
          this.getTargetTimeToDie() < 20 ||
          this.getEnemiesInRange(8) > 1)
      )),
      this.castOnTargetOrClosest("Whirlwind", () => Boolean(
        (this.getEnemiesInRange(8) > 1 && me.hasAura(this.talentSpellIds.improvedWhirlwind) && !me.hasAura("Meat Cleaver")) ||
        (this.timeToAdds() < 2 && me.hasAura(this.talentSpellIds.improvedWhirlwind) && !me.hasAura("Meat Cleaver"))
      )),
      this.castOnTargetOrClosest("Execute", () => Boolean(
        me.hasAura("Ashen Juggernaut") &&
        this.getAuraRemainingTime("Ashen Juggernaut") < 1.5
      )),
      this.castOnTargetOrClosest("Bladestorm", () => Boolean(
        me.hasAura("Enrage") &&
        (me.hasAura("Avatar") || (me.hasAura("Recklessness") && me.hasAura(this.talentSpellIds.angerManagement)))
      )),
      this.castOnTargetOrClosest("Odyns Fury", () => Boolean(
        me.hasAura("Enrage") &&
        (this.getEnemiesInRange(8) > 1 || this.timeToAdds() > 15) &&
        (me.hasAura(this.talentSpellIds.dancingBlades) && this.getAuraRemainingTime("Dancing Blades") < 5 || !me.hasAura(this.talentSpellIds.dancingBlades))
      )),
      this.castOnTargetOrClosest("Rampage", () => Boolean(
        me.hasAura(this.talentSpellIds.angerManagement) &&
        (me.hasAura("Recklessness") || this.getAuraRemainingTime("Enrage") < 1.5 || me.rage > 85)
      )),
      this.castOnTargetOrClosest("Bloodthirst", (target) => Boolean(
        (!me.hasAura(this.talentSpellIds.recklessAbandon) &&
          me.hasAura("Furious Bloodthirst") &&
          me.hasAura("Enrage") &&
          (!target.hasAuraByMe("Gushing Wound") || me.hasAura("Champions Might")))
      )),
      this.castOnTargetOrClosest("Bloodbath", () => Boolean(me.hasAura("Furious Bloodthirst"))),
      this.castOnTargetOrClosest("Thunderous Roar", () => Boolean(
        me.hasAura("Enrage") &&
        (this.getEnemiesInRange(8) > 1 || this.timeToAdds() > 15)
      )),
      this.castOnTargetOrClosest("Onslaught", () => Boolean(me.hasAura("Enrage") || me.hasAura(this.talentSpellIds.tenderize))),
      this.castOnTargetOrClosest("Crushing Blow", () => Boolean(me.hasAura("Enrage"))),
      this.castOnTargetOrClosest("Rampage", () => Boolean(
        me.hasAura(this.talentSpellIds.recklessAbandon) &&
        (me.hasAura("Recklessness") || this.getAuraRemainingTime("Enrage") < 1.5 || me.rage > 85)
      )),
      this.castOnTargetOrClosest("Execute", (target) => Boolean(
        me.hasAura("Enrage") &&
        !me.hasAura("Furious Bloodthirst") &&
        me.hasAura("Ashen Juggernaut") ||
        this.getAuraRemainingTime("Sudden Death") <= 1.5 &&
        (target.health.pct > 35 && me.hasAura(this.talentSpellIds.massacre) || target.health.pct > 20)
      )),
      this.castOnTargetOrClosest("Execute", () => Boolean(me.hasAura("Enrage"))),
      this.castOnTargetOrClosest("Rampage", () => Boolean(me.hasAura(this.talentSpellIds.angerManagement))),
      this.castOnTargetOrClosest("Bloodbath", () => Boolean(
        me.hasAura("Enrage") &&
        me.hasAura(this.talentSpellIds.recklessAbandon)
      )),
      this.castOnTargetOrClosest("Rampage", (target) => Boolean(target.health.pct < 35 && me.hasAura(this.talentSpellIds.massacre))),
      this.castOnTargetOrClosest("Bloodthirst", () => Boolean(!me.hasAura("Enrage") || !me.hasAura("Furious Bloodthirst"))),
      this.castOnTargetOrClosest("Raging Blow", () => Boolean(spell.getCharges("Raging Blow") > 1)),
      this.castOnTargetOrClosest("Crushing Blow", () => Boolean(spell.getCharges("Raging Blow") > 1)),
      this.castOnTargetOrClosest("Bloodbath", () => Boolean(!me.hasAura("Enrage"))),
      this.castOnTargetOrClosest("Crushing Blow", () => Boolean(
        me.hasAura("Enrage") &&
        me.hasAura(this.talentSpellIds.recklessAbandon)
      )),
      this.castOnTargetOrClosest("Bloodthirst", () => Boolean(!me.hasAura("Furious Bloodthirst"))),
      this.castOnTargetOrClosest("Raging Blow", () => Boolean(spell.getCharges("Raging Blow") > 1)),
      this.castOnTargetOrClosest("Rampage"),
      this.castOnTargetOrClosest("Bloodbath"),
      this.castOnTargetOrClosest("Raging Blow"),
      this.castOnTargetOrClosest("Crushing Blow"),
      this.castOnTargetOrClosest("Bloodthirst"),
      this.castOnTargetOrClosest("Slam")
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
    const target = this.getTargetUnit();
    const debuff = target.getAura(debuffName);
    return debuff ? debuff.remaining : 0;
  }
  
  getDebuffStacks(debuffName) {
    const target = this.getTargetUnit();
    const debuff = target.getAura(debuffName);
    return debuff ? debuff.stacks : 0;
  }

  getTargetTimeToDie() {
    const target = this.getTargetUnit();
    return target ? target.timeToDeath() : 0;
  }
  
  getAuraStacks(auraName) {
    const aura = me.getAura(auraName);
    return aura ? aura.stacks : 0;
  }

  getCurrentTarget() {
    if (me.targetUnit && me.isWithinMeleeRange(me.targetUnit)) {
      return me.targetUnit;
    } else {
      // Find any enemy in combat within melee range, not just the closest one
      return combat.targets.find(unit => unit.distanceTo(me) <= 10);
    }
  }

  getTargetUnit() {
    const closestTarget = this.getCurrentTarget();
    return closestTarget || me.targetUnit;
  }

  castOnTargetOrClosest(spellName, condition = () => true) {
    return new bt.Action(() => {
      const spellObject = spell.getSpell(spellName);
      if (!spellObject) return bt.Status.Failure;
  
      // Check if we have a current target and it's in range
      let target = this.getTargetUnit();
      const inRange = target && me.distanceTo(target) <= 10;
  
      if (!inRange) {
        // If target is out of range, find the closest valid target
        target = combat.targets.find(unit => unit.distanceTo(me) <= 10) // Get the closest target
      }
  
      // Ensure we have a valid target
      if (target) {
        if (condition(target)) {
          return spell.cast(spellName, () => target).tick();
        }
      }
  
      return bt.Status.Failure;
    });
  }
}
