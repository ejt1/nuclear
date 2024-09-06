import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { PowerType } from "@/Enums/PowerType";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";

export class WarriorArmsNewBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Warrior.Arms;
  version = wow.GameVersion.Retail;
  name = "SimC Warrior Arms";

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
        () => this.hasTalent("Demolish") && this.getEnemiesInRange(8) > 2,
        this.colossusAoe()
      ),
      new bt.Decorator(
        () => this.hasTalent("Demolish") && this.isExecutePhase(),
        this.colossusExecute()
      ),
      new bt.Decorator(
        () => this.hasTalent("Demolish") && this.getEnemiesInRange(8) === 2 && !this.isExecutePhase(),
        this.colossusSweep()
      ),
      new bt.Decorator(
        () => this.hasTalent("Demolish"),
        this.colossusSt()
      ),
      new bt.Decorator(
        () => this.hasTalent("Slayers Dominance") && this.getEnemiesInRange(8) > 2,
        this.slayerAoe()
      ),
      new bt.Decorator(
        () => this.hasTalent("Slayers Dominance") && this.isExecutePhase(),
        this.slayerExecute()
      ),
      new bt.Decorator(
        () => this.hasTalent("Slayers Dominance") && this.getEnemiesInRange(8) === 2 && !this.isExecutePhase(),
        this.slayerSweep()
      ),
      new bt.Decorator(
        () => this.hasTalent("Slayers Dominance"),
        this.slayerSt()
      )
    );
  }

  startCombat() {
    return new bt.Selector(
      spell.cast("Charge", on => me.targetUnit && me.distanceTo(me.targetUnit) > 8 && me.distanceTo(me.targetUnit) <= 25, req => wow.frameTime <= 0.5)
    );
  }

  useInterrupt() {
    return spell.cast("Pummel", on => this.getCurrentTarget(), req => this.getCurrentTarget().isCasting);
  }

  useTrinkets() {
    return new bt.Selector(
      // Implement trinket usage logic here
    );
  }

  useRacials() {
    return new bt.Selector(
      spell.cast("Lights Judgment", on => this.getCurrentTarget(), req => !this.getCurrentTarget().hasAuraByMe("Colossus Smash") && spell.getCooldown("Mortal Strike").remaining > 0),
      spell.cast("Bag of Tricks", on => this.getCurrentTarget(), req => !this.getCurrentTarget().hasAuraByMe("Colossus Smash") && spell.getCooldown("Mortal Strike").remaining > 0),
      spell.cast("Berserking", on => this.getCurrentTarget(), req => me.hasAura("Avatar") && (this.getTargetTimeToDie() > 180 || (this.getTargetTimeToDie() < 180 && this.isExecutePhase()) || this.getTargetTimeToDie() < 20)),
      spell.cast("Blood Fury", on => this.getCurrentTarget(), req => this.getCurrentTarget().hasAuraByMe("Colossus Smash")),
      spell.cast("Fireblood", on => this.getCurrentTarget(), req => this.getCurrentTarget().hasAuraByMe("Colossus Smash")),
      spell.cast("Ancestral Call", on => this.getCurrentTarget(), req => this.getCurrentTarget().hasAuraByMe("Colossus Smash"))
    );
  }

  colossusAoe() {
    return new bt.Selector(
      spell.cast("Cleave", on => this.getCurrentTarget(), req => me.hasAura("Collateral Damage") && me.hasAura("Merciless Bonegrinder")),
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => !this.getCurrentTarget().hasAuraByMe("Rend")),
      spell.cast("Thunderous Roar"),
      spell.cast("Avatar"),
      spell.cast("Ravager"),
      spell.cast("Sweeping Strikes"),
      spell.cast("Skullsplitter", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      spell.cast("Warbreaker"),
      spell.cast("Bladestorm", on => this.getCurrentTarget(), req => this.hasTalent("Unhinged") || this.hasTalent("Merciless Bonegrinder")),
      spell.cast("Champions Spear"),
      spell.cast("Colossus Smash"),
      spell.cast("Cleave"),
      spell.cast("Demolish", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      spell.cast("Bladestorm", on => this.getCurrentTarget(), req => this.hasTalent("Unhinged")),
      spell.cast("Overpower"),
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      spell.cast("Overpower", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      spell.cast("Execute", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      spell.cast("Thunder Clap"),
      spell.cast("Mortal Strike"),
      spell.cast("Execute"),
      spell.cast("Bladestorm"),
      spell.cast("Whirlwind")
    );
  }

  colossusExecute() {
    return new bt.Selector(
      spell.cast("Sweeping Strikes", on => this.getCurrentTarget(), req => this.getEnemiesInRange(8) === 2),
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= this.getGCD() && !this.hasTalent("Bloodletting")),
      spell.cast("Thunderous Roar"),
      spell.cast("Champions Spear"),
      spell.cast("Ravager", on => this.getCurrentTarget(), req => spell.getCooldown("Colossus Smash").remaining <= this.getGCD()),
      spell.cast("Avatar"),
      spell.cast("Colossus Smash"),
      spell.cast("Warbreaker"),
      spell.cast("Demolish", on => this.getCurrentTarget(), req => this.getCurrentTarget().hasAuraByMe("Colossus Smash")),
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => this.getDebuffStacks("Executioners Precision") === 2 && !me.hasAura("Ravager") && (this.getAuraStacks("Lethal Blows") === 2 || !me.hasSetBonus(30, 4))),
      spell.cast("Execute", on => this.getCurrentTarget(), req => me.rage >= 40),
      spell.cast("Skullsplitter"),
      spell.cast("Overpower"),
      spell.cast("Bladestorm"),
      spell.cast("Execute"),
      spell.cast("Mortal Strike")
    );
  }

  colossusSweep() {
    return new bt.Selector(
      spell.cast("Sweeping Strikes"),
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= this.getGCD() && me.hasAura("Sweeping Strikes")),
      spell.cast("Thunderous Roar"),
      spell.cast("Champions Spear"),
      spell.cast("Ravager", on => this.getCurrentTarget(), req => spell.getCooldown("Colossus Smash").ready),
      spell.cast("Avatar"),
      spell.cast("Colossus Smash"),
      spell.cast("Warbreaker"),
      spell.cast("Overpower", on => this.getCurrentTarget(), req => spell.getCharges("Overpower") === 2 && this.hasTalent("Dreadnaught") || me.hasAura("Sweeping Strikes")),
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      spell.cast("Skullsplitter", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      spell.cast("Demolish", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes") && this.getCurrentTarget().hasAuraByMe("Colossus Smash")),
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => !me.hasAura("Sweeping Strikes")),
      spell.cast("Demolish", on => this.getCurrentTarget(), req => me.hasAura("Avatar") || (this.getCurrentTarget().hasAuraByMe("Colossus Smash") && spell.getCooldown("Avatar").remaining >= 35)),
      spell.cast("Execute", on => this.getCurrentTarget(), req => me.hasAura("Recklessness Warlords Torment") || me.hasAura("Sweeping Strikes")),
      spell.cast("Overpower", on => this.getCurrentTarget(), req => spell.getCharges("Overpower") === 2 || me.hasAura("Sweeping Strikes")),
      spell.cast("Execute"),
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 8000 && !me.hasAura("Sweeping Strikes")),
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 5000),
      spell.cast("Cleave", on => this.getCurrentTarget(), req => this.hasTalent("Fervor of Battle")),
      spell.cast("Whirlwind", on => this.getCurrentTarget(), req => this.hasTalent("Fervor of Battle")),
      spell.cast("Slam")
    );
  }

  colossusSt() {
    return new bt.Selector(
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= this.getGCD()),
      spell.cast("Thunderous Roar"),
      spell.cast("Champions Spear"),
      spell.cast("Ravager", on => this.getCurrentTarget(), req => spell.getCooldown("Colossus Smash").remaining <= this.getGCD()),
      spell.cast("Avatar", on => this.getCurrentTarget(), req => this.timeToAdds() > 15),
      spell.cast("Colossus Smash"),
      spell.cast("Warbreaker"),
      spell.cast("Mortal Strike"),
      spell.cast("Demolish"),
      spell.cast("Skullsplitter"),
      spell.cast("Overpower", on => this.getCurrentTarget(), req => spell.getCharges("Overpower") === 2),
      spell.cast("Execute"),
      spell.cast("Overpower"),
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= this.getGCD() * 5),
      spell.cast("Slam")
    );
  }

  slayerAoe() {
    return new bt.Selector(
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => !this.getCurrentTarget().hasAuraByMe("Rend")),
      spell.cast("Sweeping Strikes"),
      spell.cast("Thunderous Roar"),
      spell.cast("Avatar"),
      spell.cast("Champions Spear"),
      spell.cast("Warbreaker"),
      spell.cast("Colossus Smash"),
      spell.cast("Cleave"),
      spell.cast("Overpower", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      spell.cast("Execute", on => this.getCurrentTarget(), req => me.hasAura("Sudden Death") && this.getAuraStacks("Imminent Demise") < 3),
      spell.cast("Bladestorm"),
      spell.cast("Skullsplitter", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      spell.cast("Execute", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes") && this.getDebuffStacks("Executioners Precision") < 2),
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes") && this.getDebuffStacks("Executioners Precision") === 2),
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.getCurrentTarget().hasAuraByMe("Marked for Execution")),
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      spell.cast("Overpower", on => this.getCurrentTarget(), req => this.hasTalent("Dreadnaught")),
      spell.cast("Thunder Clap"),
      spell.cast("Overpower"),
      spell.cast("Execute"),
      spell.cast("Mortal Strike"),
      spell.cast("Whirlwind"),
      spell.cast("Skullsplitter"),
      spell.cast("Slam"),
      spell.cast("Storm Bolt", on => this.getCurrentTarget(), req => me.hasAura("Bladestorm"))
    );
  }

slayerExecute() {
    return new bt.Selector(
      spell.cast("Sweeping Strikes", on => this.getCurrentTarget(), req => this.getEnemiesInRange(8) === 2),
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= this.getGCD() && !this.hasTalent("Bloodletting")),
      spell.cast("Thunderous Roar"),
      spell.cast("Champions Spear"),
      spell.cast("Avatar"),
      spell.cast("Warbreaker"),
      spell.cast("Colossus Smash"),
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.getAuraRemainingTime("Juggernaut") <= this.getGCD()),
      spell.cast("Bladestorm", on => this.getCurrentTarget(), req => (this.getDebuffStacks("Executioners Precision") === 2 && this.getDebuffRemainingTime("Colossus Smash") > 4000) || (this.getDebuffStacks("Executioners Precision") === 2 && spell.getCooldown("Colossus Smash").remaining > 15) || !this.hasTalent("Executioners Precision")),
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => this.getDebuffStacks("Executioners Precision") === 2 && (this.getAuraStacks("Lethal Blows") === 2 || !me.hasSetBonus(30, 4))),
      spell.cast("Skullsplitter", on => this.getCurrentTarget(), req => me.rage < 85),
      spell.cast("Overpower", on => this.getCurrentTarget(), req => me.hasAura("Opportunist") && me.rage < 80 && this.getAuraStacks("Martial Prowess") < 2),
      spell.cast("Execute"),
      spell.cast("Overpower"),
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => !this.hasTalent("Executioners Precision")),
      spell.cast("Storm Bolt", on => this.getCurrentTarget(), req => me.hasAura("Bladestorm"))
    );
  }

  slayerSweep() {
    return new bt.Selector(
      spell.cast("Thunderous Roar"),
      spell.cast("Sweeping Strikes"),
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= this.getGCD()),
      spell.cast("Champions Spear"),
      spell.cast("Avatar"),
      spell.cast("Colossus Smash"),
      spell.cast("Warbreaker"),
      spell.cast("Skullsplitter", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.getDebuffStacks("Marked for Execution") === 3),
      spell.cast("Bladestorm"),
      spell.cast("Overpower", on => this.getCurrentTarget(), req => this.hasTalent("Dreadnaught") || me.hasAura("Opportunist")),
      spell.cast("Mortal Strike"),
      spell.cast("Cleave", on => this.getCurrentTarget(), req => this.hasTalent("Fervor of Battle")),
      spell.cast("Execute"),
      spell.cast("Overpower"),
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 8000 && !me.hasAura("Sweeping Strikes")),
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 5000),
      spell.cast("Whirlwind", on => this.getCurrentTarget(), req => this.hasTalent("Fervor of Battle")),
      spell.cast("Slam"),
      spell.cast("Storm Bolt", on => this.getCurrentTarget(), req => me.hasAura("Bladestorm"))
    );
  }

  slayerSt() {
    return new bt.Selector(
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= this.getGCD()),
      spell.cast("Thunderous Roar"),
      spell.cast("Champions Spear"),
      spell.cast("Avatar"),
      spell.cast("Colossus Smash"),
      spell.cast("Warbreaker"),
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.getDebuffStacks("Marked for Execution") === 3),
      spell.cast("Bladestorm"),
      spell.cast("Overpower", on => this.getCurrentTarget(), req => me.hasAura("Opportunist")),
      spell.cast("Mortal Strike"),
      spell.cast("Skullsplitter"),
      spell.cast("Execute"),
      spell.cast("Overpower"),
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= this.getGCD() * 5),
      spell.cast("Cleave", on => this.getCurrentTarget(), req => !me.hasAura("Martial Prowess")),
      spell.cast("Slam"),
      spell.cast("Storm Bolt", on => this.getCurrentTarget(), req => me.hasAura("Bladestorm"))
    );
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
    const debuff = target ? target.getAura(debuffName) : null;
    return debuff ? debuff.remaining : 0;
  }

  getDebuffStacks(debuffName) {
    const target = this.getCurrentTarget();
    const debuff = target ? target.getAura(debuffName) : null;
    return debuff ? debuff.stacks : 0;
  }

  getAuraStacks(auraName) {
    const aura = me.getAura(auraName);
    return aura ? aura.stacks : 0;
  }

  hasTalent(talentName) {
    return me.hasTalent(talentName);
  }

  isExecutePhase() {
    const target = this.getCurrentTarget();
    return (this.hasTalent("Massacre") && target.health.pct < 35) || target.health.pct < 20;
  }

  getGCD() {
    return 1500; // Assuming a base GCD of 1.5 seconds
  }

  getTargetTimeToDie() {
    const target = this.getCurrentTarget();
    return target ? target.timeToDeath() : 0;
  }

  timeToAdds() {
    // This is a placeholder. In a real scenario, you'd implement logic to predict when adds will spawn.
    return 9999;
  }
}
