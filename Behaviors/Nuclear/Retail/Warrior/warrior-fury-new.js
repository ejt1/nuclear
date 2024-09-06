import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { PowerType } from "@/Enums/PowerType";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";

export class WarriorFuryNewBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Warrior.Fury;
  version = wow.GameVersion.Retail;
  name = "SimC Warrior Fury";

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForTarget(),
      common.waitForCastOrChannel(),
      this.startCombat(),
      this.useInterrupt(),
      this.useTrinkets(),
      this.useRacials(),
      new bt.Decorator(
        () => this.hasTalent("Slayers Dominance") && this.getEnemiesInRange(8) === 1,
        this.slayerSingleTarget()
      ),
      new bt.Decorator(
        () => this.hasTalent("Slayers Dominance") && this.getEnemiesInRange(8) > 1,
        this.slayerMultiTarget()
      ),
      new bt.Decorator(
        () => this.hasTalent("Lightning Strikes") && this.getEnemiesInRange(8) === 1,
        this.thaneSingleTarget()
      ),
      new bt.Decorator(
        () => this.hasTalent("Lightning Strikes") && this.getEnemiesInRange(8) > 1,
        this.thaneMultiTarget()
      )
    );
  }

  startCombat() {
    return new bt.Selector(
      spell.cast("Charge", on => me.targetUnit && me.distanceTo(me.targetUnit) > 8 && me.distanceTo(me.targetUnit) <= 25, req => wow.frameTime <= 0.5),
      spell.cast("Heroic Leap", on => me.targetUnit, req => me.distanceTo(me.targetUnit) > 25)
    );
  }

  useInterrupt() {
    return spell.cast("Pummel", on => this.getCurrentTarget(), req => this.getCurrentTarget().isCasting);
  }

  useTrinkets() {
    // Implement trinket usage logic here
    return new bt.Selector();
  }

  useRacials() {
    return new bt.Selector(
      spell.cast("Lights Judgment", on => this.getCurrentTarget(), req => this.shouldUseOnGCDRacials()),
      spell.cast("Bag of Tricks", on => this.getCurrentTarget(), req => this.shouldUseOnGCDRacials()),
      spell.cast("Berserking", on => this.getCurrentTarget(), req => me.hasAura("Recklessness")),
      spell.cast("Blood Fury", on => this.getCurrentTarget()),
      spell.cast("Fireblood", on => this.getCurrentTarget()),
      spell.cast("Ancestral Call", on => this.getCurrentTarget())
    );
  }

  slayerSingleTarget() {
    return new bt.Selector(
      this.useRecklessness(),
      this.useAvatar(),
      spell.cast("Thunderous Roar", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      spell.cast("Champions Spear", on => this.getCurrentTarget(), req => this.shouldUseChampionsSpear()),
      spell.cast("Odyns Fury", on => this.getCurrentTarget(), req => this.shouldUseOdynsFury()),
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.shouldUseExecute()),
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.shouldUseRampage()),
      spell.cast("Bladestorm", on => this.getCurrentTarget(), req => me.hasAura("Enrage") && spell.getCooldown("Avatar").remaining >= 9),
      spell.cast("Onslaught", on => this.getCurrentTarget(), req => this.hasTalent("Tenderize") && me.hasAura("Brutal Finish")),
      spell.cast("Crushing Blow", on => this.getCurrentTarget()),
      spell.cast("Bloodbath", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      spell.cast("Raging Blow", on => this.getCurrentTarget(), req => this.hasTalent("Slaughtering Strikes") && me.powerByType(PowerType.Rage) < 110 && this.hasTalent("Reckless Abandon")),
      spell.cast("Bloodthirst", on => this.getCurrentTarget(), req => !this.hasTalent("Reckless Abandon") && me.hasAura("Enrage")),
      spell.cast("Raging Blow", on => this.getCurrentTarget()),
      spell.cast("Onslaught", on => this.getCurrentTarget()),
      spell.cast("Execute", on => this.getCurrentTarget()),
      spell.cast("Bloodthirst", on => this.getCurrentTarget()),
      spell.cast("Whirlwind", on => this.getCurrentTarget(), req => this.hasTalent("Meat Cleaver")),
      spell.cast("Slam", on => this.getCurrentTarget()),
      spell.cast("Storm Bolt", on => this.getCurrentTarget(), req => me.hasAura("Bladestorm"))
    );
  }

  slayerMultiTarget() {
    return new bt.Selector(
      this.useRecklessness(),
      this.useAvatar(),
      spell.cast("Thunderous Roar", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      spell.cast("Champions Spear", on => this.getCurrentTarget(), req => this.shouldUseChampionsSpear()),
      spell.cast("Odyns Fury", on => this.getCurrentTarget(), req => this.shouldUseOdynsFury()),
      spell.cast("Whirlwind", on => this.getCurrentTarget(), req => me.getAuraStacks("Meat Cleaver") === 0 && this.hasTalent("Meat Cleaver")),
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.shouldUseExecute()),
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.shouldUseRampage()),
      spell.cast("Bladestorm", on => this.getCurrentTarget(), req => me.hasAura("Enrage") && spell.getCooldown("Avatar").remaining >= 9),
      spell.cast("Onslaught", on => this.getCurrentTarget(), req => this.hasTalent("Tenderize") && me.hasAura("Brutal Finish")),
      spell.cast("Crushing Blow", on => this.getCurrentTarget()),
      spell.cast("Bloodbath", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      spell.cast("Raging Blow", on => this.getCurrentTarget(), req => this.hasTalent("Slaughtering Strikes")),
      spell.cast("Onslaught", on => this.getCurrentTarget()),
      spell.cast("Execute", on => this.getCurrentTarget()),
      spell.cast("Bloodthirst", on => this.getCurrentTarget()),
      spell.cast("Raging Blow", on => this.getCurrentTarget()),
      spell.cast("Whirlwind", on => this.getCurrentTarget()),
      spell.cast("Storm Bolt", on => this.getCurrentTarget(), req => me.hasAura("Bladestorm"))
    );
  }

  thaneSingleTarget() {
    return new bt.Selector(
      this.useRecklessness(),
      spell.cast("Thunder Blast", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      this.useAvatar(),
      spell.cast("Ravager", on => this.getCurrentTarget()),
      spell.cast("Thunderous Roar", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      spell.cast("Champions Spear", on => this.getCurrentTarget(), req => this.shouldUseChampionsSpear()),
      spell.cast("Odyns Fury", on => this.getCurrentTarget(), req => this.shouldUseOdynsFury()),
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.shouldUseExecute()),
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.shouldUseRampage()),
      spell.cast("Bladestorm", on => this.getCurrentTarget(), req => me.hasAura("Enrage") && this.hasTalent("Unhinged")),
      spell.cast("Crushing Blow", on => this.getCurrentTarget()),
      spell.cast("Onslaught", on => this.getCurrentTarget(), req => this.hasTalent("Tenderize")),
      spell.cast("Bloodbath", on => this.getCurrentTarget()),
      spell.cast("Raging Blow", on => this.getCurrentTarget()),
      spell.cast("Execute", on => this.getCurrentTarget()),
      spell.cast("Bloodthirst", on => this.getCurrentTarget(), req => me.hasAura("Enrage") && (!me.hasAura("Burst of Power") || !this.hasTalent("Reckless Abandon"))),
      spell.cast("Onslaught", on => this.getCurrentTarget()),
      spell.cast("Bloodthirst", on => this.getCurrentTarget()),
      spell.cast("Thunder Clap", on => this.getCurrentTarget()),
      spell.cast("Whirlwind", on => this.getCurrentTarget(), req => this.hasTalent("Meat Cleaver")),
      spell.cast("Slam", on => this.getCurrentTarget())
    );
  }

  thaneMultiTarget() {
    return new bt.Selector(
      this.useRecklessness(),
      spell.cast("Thunder Blast", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      this.useAvatar(),
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => me.getAuraStacks("Meat Cleaver") === 0 && this.hasTalent("Meat Cleaver")),
      spell.cast("Thunderous Roar", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      spell.cast("Ravager", on => this.getCurrentTarget()),
      spell.cast("Champions Spear", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      spell.cast("Odyns Fury", on => this.getCurrentTarget(), req => this.shouldUseOdynsFury()),
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.shouldUseExecute()),
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.shouldUseRampage()),
      spell.cast("Bladestorm", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      spell.cast("Crushing Blow", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      spell.cast("Onslaught", on => this.getCurrentTarget(), req => this.hasTalent("Tenderize")),
      spell.cast("Bloodbath", on => this.getCurrentTarget()),
      spell.cast("Bloodthirst", on => this.getCurrentTarget()),
      spell.cast("Thunder Clap", on => this.getCurrentTarget()),
      spell.cast("Onslaught", on => this.getCurrentTarget()),
      spell.cast("Execute", on => this.getCurrentTarget()),
      spell.cast("Raging Blow", on => this.getCurrentTarget()),
      spell.cast("Whirlwind", on => this.getCurrentTarget())
    );
  }

  useRecklessness() {
    return spell.cast("Recklessness", on => this.getCurrentTarget(), req => (
      (!this.hasTalent("Anger Management") && spell.getCooldown("Avatar").remaining < 1 && this.hasTalent("Titans Torment")) ||
      this.hasTalent("Anger Management") ||
      !this.hasTalent("Titans Torment")
    ));
  }

  useAvatar() {
    return spell.cast("Avatar", on => this.getCurrentTarget(), req => (
      (this.hasTalent("Titans Torment") && (me.hasAura("Enrage") || this.hasTalent("Titanic Rage")) && 
       (!this.getCurrentTarget().hasAuraByMe("Champions Might") || !this.hasTalent("Champions Might"))) ||
      !this.hasTalent("Titans Torment")
    ));
  }

  shouldUseChampionsSpear() {
    return (me.hasAura("Enrage") && this.hasTalent("Titans Torment") && spell.getCooldown("Avatar").remaining < 1) ||
           (me.hasAura("Enrage") && !this.hasTalent("Titans Torment"));
  }

  shouldUseOdynsFury() {
    return this.getDebuffRemainingTime("Odyns Fury Torment MH") < 1 &&
           (me.hasAura("Enrage") || this.hasTalent("Titanic Rage")) &&
           spell.getCooldown("Avatar").remaining > 0;
  }

  shouldUseExecute() {
    return this.hasTalent("Ashen Juggernaut") &&
           this.getAuraRemainingTime("Ashen Juggernaut") <= 1500 &&
           me.hasAura("Enrage");
  }

  shouldUseRampage() {
    return (this.hasTalent("Bladestorm") && spell.getCooldown("Bladestorm").remaining <= 1500 && !this.getCurrentTarget().hasAuraByMe("Champions Might")) ||
           this.hasTalent("Anger Management");
  }

  shouldUseOnGCDRacials() {
    return !me.hasAura("Recklessness") &&
           !me.hasAura("Avatar") &&
           me.powerByType(PowerType.Rage) < 80 &&
           !me.hasAura("Bloodbath") &&
           !me.hasAura("Crushing Blow") &&
           !me.hasAura("Sudden Death") &&
           !spell.getCooldown("Bladestorm").ready &&
           (!spell.getCooldown("Execute").ready || !this.isExecutePhase());
  }

  isExecutePhase() {
    const target = this.getCurrentTarget();
    return (this.hasTalent("Massacre") && target.health.pct < 35) || target.health.pct < 20;
  }

  getCurrentTarget() {
    if (me.targetUnit && me.isWithinMeleeRange(me.targetUnit)) {
      return me.targetUnit;
    } else {
      return combat.targets.find(unit => unit.inCombat && unit.distanceTo(me) <= 8);
    }
  }

  getEnemiesInRange(range) {
    return me.getUnitsAroundCount(range);
  }

  getAuraRemainingTime(auraName) {
    const aura = me.getAura(auraName);
    return aura ? aura.remaining : 0;
  }

  getDebuffRemainingTime(debuffName) {
    const target = this.getCurrentTarget();
    const debuff = target.getAura(debuffName);
    return debuff ? debuff.remaining : 0;
  }

  getAuraStacks(auraName) {
    const aura = me.getAura(auraName);
    return aura ? aura.stacks : 0;
  }

  hasTalent(talentName) {
    // This is a placeholder. You'll need to implement a proper talent checking mechanism
    return true; // or false, depending on the actual talent system
  }
}
