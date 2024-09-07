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
  name = "Jmr SimC Warrior Arms";

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForTarget(),
      common.waitForCastOrChannel(),
      spell.cast("Battle Shout", () => !me.hasAura("Battle Shout")),
      spell.cast("Rallying Cry", () => me.pctHealth < 30),
      spell.cast("Die by the Sword", () => me.pctHealth < 30),
      spell.cast("Victory Rush", () => me.pctHealth < 70),
      spell.interrupt("Pummel", false),
      spell.interrupt("Storm Bolt", false),
      this.useTrinkets(),
      this.useRacials(),
      new bt.Decorator(
        () => !this.hasTalent("Slayer's Dominance") && this.getEnemiesInRange(8) > 2 && me.isWithinMeleeRange(this.getCurrentTarget()),
        this.colossusAoe(),
        new bt.Action(() => bt.Status.Success)
      ),
      new bt.Decorator(
        () => !this.hasTalent("Slayer's Dominance") && this.getEnemiesInRange(8) >= 1 && this.isExecutePhase() && me.isWithinMeleeRange(this.getCurrentTarget()),
        this.colossusExecute(),
        new bt.Action(() => bt.Status.Success)
      ),
      new bt.Decorator(
        () => !this.hasTalent("Slayer's Dominance") && this.getEnemiesInRange(8) === 2 && !this.isExecutePhase() && me.isWithinMeleeRange(this.getCurrentTarget()),
        this.colossusSweep(),
        new bt.Action(() => bt.Status.Success)
      ),
      new bt.Decorator(
        () => !this.hasTalent("Slayer's Dominance") && this.getEnemiesInRange(8) === 1 && me.isWithinMeleeRange(this.getCurrentTarget()),
        this.colossusSt(),
        new bt.Action(() => bt.Status.Success)
      ),
      new bt.Decorator(
        () => this.hasTalent("Slayer's Dominance") && this.getEnemiesInRange(8) > 2 && me.isWithinMeleeRange(this.getCurrentTarget()),
        this.slayerAoe(),
        new bt.Action(() => bt.Status.Success)
      ),
      new bt.Decorator(
        () => this.hasTalent("Slayer's Dominance") && this.getEnemiesInRange(8) >= 1 && this.isExecutePhase() && me.isWithinMeleeRange(this.getCurrentTarget()),
        this.slayerExecute(),
        new bt.Action(() => bt.Status.Success)
      ),
      new bt.Decorator(
        () => this.hasTalent("Slayer's Dominance") && this.getEnemiesInRange(8) === 2 && !this.isExecutePhase() && me.isWithinMeleeRange(this.getCurrentTarget()),
        this.slayerSweep(),
        new bt.Action(() => bt.Status.Success)
      ),
      new bt.Decorator(
        () => this.hasTalent("Slayer's Dominance") && this.getEnemiesInRange(8) === 1 && me.isWithinMeleeRange(this.getCurrentTarget()),
        this.slayerSt(),
        new bt.Action(() => bt.Status.Success)
      )
    );
  }

  useTrinkets() {
    return new bt.Selector(
      // Implement trinket usage logic here
    );
  }

  useRacials() {
    return new bt.Selector(
      spell.cast("Light's Judgment", on => this.getCurrentTarget(), req => !this.getCurrentTarget().hasAuraByMe("Colossus Smash") && spell.getCooldown("Mortal Strike").timeleft > 0),
      spell.cast("Bag of Tricks", on => this.getCurrentTarget(), req => !this.getCurrentTarget().hasAuraByMe("Colossus Smash") && spell.getCooldown("Mortal Strike").timeleft > 0),
      spell.cast("Berserking", on => this.getCurrentTarget(), req => me.hasAura("Avatar") && (this.getTargetTimeToDie() > 180 || (this.getTargetTimeToDie() < 180 && this.isExecutePhase()) || this.getTargetTimeToDie() < 20)),
      spell.cast("Blood Fury", on => this.getCurrentTarget(), req => this.getCurrentTarget().hasAuraByMe("Colossus Smash")),
      spell.cast("Fireblood", on => this.getCurrentTarget(), req => this.getCurrentTarget().hasAuraByMe("Colossus Smash")),
      spell.cast("Ancestral Call", on => this.getCurrentTarget(), req => this.getCurrentTarget().hasAuraByMe("Colossus Smash"))
    );
  }

  colossusAoe() {
    return new bt.Selector(
      // actions.colossus_aoe=cleave,if=buff.collateral_damage.up&buff.merciless_bonegrinder.up
      spell.cast("Cleave", on => this.getCurrentTarget(), req => (me.hasAura("Sweeping Strikes") || me.hasAura("Collateral Damage")) && me.hasAura("Merciless Bonegrinder")),
      // actions.colossus_aoe+=/thunder_clap,if=!dot.rend.remains
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 4),
      // actions.colossus_aoe+=/thunderous_roar
      spell.cast("Thunderous Roar"),
      // actions.colossus_aoe+=/avatar
      spell.cast("Avatar", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.colossus_aoe+=/ravager
      spell.cast("Ravager", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.colossus_aoe+=/sweeping_strikes
      spell.cast("Sweeping Strikes"),
      // actions.colossus_aoe+=/skullsplitter,if=buff.sweeping_strikes.up
      spell.cast("Skullsplitter", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      // actions.colossus_aoe+=/warbreaker
      spell.cast("Warbreaker"),
      // actions.colossus_aoe+=/bladestorm,if=talent.unhinged|talent.merciless_bonegrinder
      spell.cast("Bladestorm", on => this.getCurrentTarget(), req => this.shouldUseCooldowns() && (this.hasTalent("Unhinged") || this.hasTalent("Merciless Bonegrinder"))),
      // actions.colossus_aoe+=/champions_spear
      spell.cast("Champion's Spear", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.colossus_aoe+=/colossus_smash
      spell.cast("Colossus Smash"),
      // actions.colossus_aoe+=/cleave
      spell.cast("Cleave", on => this.getCurrentTarget()),
      // actions.colossus_aoe+=/demolish,if=buff.sweeping_strikes.up
      spell.cast("Demolish", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      // actions.colossus_aoe+=/bladestorm,if=talent.unhinged
      spell.cast("Bladestorm", on => this.getCurrentTarget(), req => this.hasTalent("Unhinged")),
      // actions.colossus_aoe+=/overpower
      spell.cast("Overpower", on => this.getCurrentTarget()),
      // actions.colossus_aoe+=/mortal_strike,if=buff.sweeping_strikes.up
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      // actions.colossus_aoe+=/overpower,if=buff.sweeping_strikes.up
      spell.cast("Overpower", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      // actions.colossus_aoe+=/execute,if=buff.sweeping_strikes.up
      spell.cast("Execute", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      // actions.colossus_aoe+=/thunder_clap
      spell.cast("Thunder Clap", on => this.getCurrentTarget()),
      // actions.colossus_aoe+=/mortal_strike
      spell.cast("Mortal Strike", on => this.getCurrentTarget()),
      // actions.colossus_aoe+=/execute
      spell.cast("Execute", on => this.getCurrentTarget()),
      // actions.colossus_aoe+=/bladestorm
      spell.cast("Bladestorm", on => this.getCurrentTarget()),
      // actions.colossus_aoe+=/whirlwind
      spell.cast("Whirlwind", on => this.getCurrentTarget()),
    );
  }

  colossusExecute() {
    return new bt.Selector(
      // actions.colossus_execute=sweeping_strikes,if=active_enemies=2
      spell.cast("Sweeping Strikes", on => this.getCurrentTarget(), req => this.getEnemiesInRange(8) === 2),
      // actions.colossus_execute+=/rend,if=dot.rend.remains<=gcd&!talent.bloodletting
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 4 && !this.hasTalent("Bloodletting")),
      // actions.colossus_execute+=/thunderous_roar
      spell.cast("Thunderous Roar"),
      // actions.colossus_execute+=/champions_spear
      spell.cast("Champion's Spear", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.colossus_execute+=/ravager,if=cooldown.colossus_smash.remains<=gcd
      spell.cast("Ravager", on => this.getCurrentTarget(), req => this.shouldUseCooldowns() && spell.getCooldown("Colossus Smash").timeleft <= this.getGCD()),
      // actions.colossus_execute+=/avatar
      spell.cast("Avatar", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.colossus_execute+=/colossus_smash
      spell.cast("Colossus Smash"),
      // actions.colossus_execute+=/warbreaker
      spell.cast("Warbreaker"),
      // actions.colossus_execute+=/demolish,if=debuff.colossus_smash.up
      spell.cast("Demolish", on => this.getCurrentTarget(), req => this.getCurrentTarget().hasAuraByMe("Colossus Smash")),
      // actions.colossus_execute+=/mortal_strike,if=debuff.executioners_precision.stack=2&!dot.ravager.remains&(buff.lethal_blows.stack=2|!set_bonus.tww1_4pc)
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => this.getDebuffStacks("Executioners Precision") === 2 && !this.getCurrentTarget().hasAuraByMe("Ravager") && (this.getAuraStacks("Lethal Blows") === 2) || !me.hasAura("453637")),
      // actions.colossus_execute+=/execute,if=rage>=40
      spell.cast("Execute", on => this.getCurrentTarget(), req => me.powerByType(PowerType.Rage) >= 40),
      // actions.colossus_execute+=/skullsplitter
      spell.cast("Skullsplitter", on => this.getCurrentTarget()),
      // actions.colossus_execute+=/overpower
      spell.cast("Overpower", on => this.getCurrentTarget()),
      // actions.colossus_execute+=/bladestorm
      spell.cast("Bladestorm"),
      // actions.colossus_execute+=/execute
      spell.cast("Execute", on => this.getCurrentTarget()),
      // actions.colossus_execute+=/mortal_strike
      spell.cast("Mortal Strike", on => this.getCurrentTarget()),
    );
  }

  colossusSweep() {
    return new bt.Selector(
      // actions.colossus_sweep=sweeping_strikes
      spell.cast("Sweeping Strikes"),
      // actions.colossus_sweep+=/rend,if=dot.rend.remains<=gcd&buff.sweeping_strikes.up
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 4 && me.hasAura("Sweeping Strikes")),
      // actions.colossus_sweep+=/thunderous_roar
      spell.cast("Thunderous Roar"),
      // actions.colossus_sweep+=/champions_spear
      spell.cast("Champion's Spear", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.colossus_sweep+=/ravager,if=cooldown.colossus_smash.ready
      spell.cast("Ravager", on => this.getCurrentTarget(), req => this.shouldUseCooldowns() && spell.getCooldown("Colossus Smash").timeleft <= this.getGCD()),
      // actions.colossus_sweep+=/avatar
      spell.cast("Avatar", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.colossus_sweep+=/colossus_smash
      spell.cast("Colossus Smash"),
      // actions.colossus_sweep+=/warbreaker
      spell.cast("Warbreaker"),
      // actions.colossus_sweep+=/overpower,if=action.overpower.charges=2&talent.dreadnaught|buff.sweeping_strikes.up
      spell.cast("Overpower", on => this.getCurrentTarget(), req => spell.getCharges("Overpower") === 2 || me.hasAura("Sweeping Strikes")),
      // actions.colossus_sweep+=/mortal_strike,if=buff.sweeping_strikes.up
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      // actions.colossus_sweep+=/skullsplitter,if=buff.sweeping_strikes.up
      spell.cast("Skullsplitter", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      // actions.colossus_sweep+=/demolish,if=buff.sweeping_strikes.up&debuff.colossus_smash.up
      spell.cast("Demolish", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes") && this.getCurrentTarget().hasAuraByMe("Colossus Smash")),
      // actions.colossus_sweep+=/mortal_strike,if=buff.sweeping_strikes.down
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => !me.hasAura("Sweeping Strikes")),
      // actions.colossus_sweep+=/demolish,if=buff.avatar.up|debuff.colossus_smash.up&cooldown.avatar.remains>=35
      spell.cast("Demolish", on => this.getCurrentTarget(), req => me.hasAura("Avatar") || this.getCurrentTarget().hasAuraByMe("Colossus Smash") && spell.getCooldown("Avatar").timeleft >= 35),
      // actions.colossus_sweep+=/execute,if=buff.recklessness_warlords_torment.up|buff.sweeping_strikes.up
      spell.cast("Execute", on => this.getCurrentTarget(), req => me.hasAura("Recklessness Warlords Torment") || me.hasAura("Sweeping Strikes")),
      // actions.colossus_sweep+=/overpower,if=charges=2|buff.sweeping_strikes.up
      spell.cast("Overpower", on => this.getCurrentTarget(), req => spell.getCharges("Overpower") === 2 || me.hasAura("Sweeping Strikes")),
      // actions.colossus_sweep+=/execute
      spell.cast("Execute", on => this.getCurrentTarget()),
      // actions.colossus_sweep+=/thunder_clap,if=dot.rend.remains<=8&buff.sweeping_strikes.down
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 8 && !me.hasAura("Sweeping Strikes")),
      // actions.colossus_sweep+=/rend,if=dot.rend.remains<=5
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 5),
      // actions.colossus_sweep+=/cleave,if=talent.fervor_of_battle
      spell.cast("Cleave", on => this.getCurrentTarget(), req => this.hasTalent("Fervor of Battle")),
      // actions.colossus_sweep+=/whirlwind,if=talent.fervor_of_battle
      spell.cast("Whirlwind", on => this.getCurrentTarget(), req => this.hasTalent("Fervor of Battle")),
      // actions.colossus_sweep+=/slam
      spell.cast("Slam", on => this.getCurrentTarget()),
    );
  }

  colossusSt() {
    return new bt.Selector(
      // actions.colossus_st=rend,if=dot.rend.remains<=gcd
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 4),
      // actions.colossus_st+=/thunderous_roar
      spell.cast("Thunderous Roar"),
      // actions.colossus_st+=/champions_spear
      spell.cast("Champion's Spear", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.colossus_st+=/ravager,if=cooldown.colossus_smash.remains<=gcd
      spell.cast("Ravager", on => this.getCurrentTarget(), req => this.shouldUseCooldowns() && spell.getCooldown("Colossus Smash").timeleft <= this.getGCD()),
      // actions.colossus_st+=/avatar,if=raid_event.adds.in>15
      spell.cast("Avatar", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.colossus_st+=/colossus_smash
      spell.cast("Colossus Smash"),
      // actions.colossus_st+=/warbreaker
      spell.cast("Warbreaker"),
      // actions.colossus_st+=/mortal_strike
      spell.cast("Mortal Strike", on => this.getCurrentTarget()),
      // actions.colossus_st+=/demolish
      spell.cast("Demolish", on => this.getCurrentTarget()),
      // actions.colossus_st+=/skullsplitter
      spell.cast("Skullsplitter", on => this.getCurrentTarget()),
      // actions.colossus_st+=/overpower,if=charges=2
      spell.cast("Overpower", on => this.getCurrentTarget(), req => spell.getCharges("Overpower") === 2),
      // actions.colossus_st+=/execute
      spell.cast("Execute", on => this.getCurrentTarget()),
      // actions.colossus_st+=/overpower
      spell.cast("Overpower", on => this.getCurrentTarget()),
      // actions.colossus_st+=/rend,if=dot.rend.remains<=gcd*5
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 5),
      // actions.colossus_st+=/slam
      spell.cast("Slam", on => this.getCurrentTarget()),
    );
  }

  slayerAoe() {
    return new bt.Selector(
      // actions.slayer_aoe=thunder_clap,if=!dot.rend.remains
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 4),
      // actions.slayer_aoe+=/sweeping_strikes
      spell.cast("Sweeping Strikes"),
      // actions.slayer_aoe+=/thunderous_roar
      spell.cast("Thunderous Roar"),
      // actions.slayer_aoe+=/avatar
      spell.cast("Avatar", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.slayer_aoe+=/champions_spear
      spell.cast("Champion's Spear", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.slayer_aoe+=/warbreaker
      spell.cast("Warbreaker"),
      // actions.slayer_aoe+=/colossus_smash
      spell.cast("Colossus Smash"),
      // actions.slayer_aoe+=/cleave
      spell.cast("Cleave", on => this.getCurrentTarget()),
      // actions.slayer_aoe+=/overpower,if=buff.sweeping_strikes.up
      spell.cast("Overpower", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      // actions.slayer_aoe+=/execute,if=buff.sudden_death.up&buff.imminent_demise.stack<3
      spell.cast("Execute", on => this.getCurrentTarget(), req => me.hasAura("Sudden Death") && this.getAuraStacks("Imminent Demise") < 3),
      // actions.slayer_aoe+=/bladestorm
      spell.cast("Bladestorm"),
      // actions.slayer_aoe+=/skullsplitter,if=buff.sweeping_strikes.up
      spell.cast("Skullsplitter", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      // actions.slayer_aoe+=/execute,if=buff.sweeping_strikes.up&debuff.executioners_precision.stack<2
      spell.cast("Execute", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes") && this.getDebuffStacks("Executioners Precision") < 2),
      // actions.slayer_aoe+=/mortal_strike,if=buff.sweeping_strikes.up&debuff.executioners_precision.stack=2
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes") && this.getDebuffStacks("Executioners Precision") === 2),
      // actions.slayer_aoe+=/execute,if=debuff.marked_for_execution.up
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.getDebuffStacks("Marked for Execution") === 3),
      // actions.slayer_aoe+=/mortal_strike,if=buff.sweeping_strikes.up
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      // actions.slayer_aoe+=/overpower,if=talent.dreadnaught
      spell.cast("Overpower", on => this.getCurrentTarget(), req => this.hasTalent("Dreadnaught")),
      // actions.slayer_aoe+=/thunder_clap
      spell.cast("Thunder Clap"),
      // actions.slayer_aoe+=/overpower
      spell.cast("Overpower", on => this.getCurrentTarget()),
      // actions.slayer_aoe+=/execute
      spell.cast("Execute", on => this.getCurrentTarget()),
      // actions.slayer_aoe+=/mortal_strike
      spell.cast("Mortal Strike", on => this.getCurrentTarget()),
      // actions.slayer_aoe+=/whirlwind
      spell.cast("Whirlwind", on => this.getCurrentTarget(), req => this.hasTalent("Fervor of Battle")),
      // actions.slayer_aoe+=/skullsplitter
      spell.cast("Skullsplitter", on => this.getCurrentTarget(), req => me.powerByType(PowerType.Rage) < 85),
      // actions.slayer_aoe+=/slam
      spell.cast("Slam"),
      // actions.slayer_aoe+=/storm_bolt,if=buff.bladestorm.up
      spell.cast("Storm Bolt", on => this.getCurrentTarget(), req => me.hasAura("Bladestorm"))
    );
  }

slayerExecute() {
    return new bt.Selector(
      // actions.slayer_execute=sweeping_strikes,if=active_enemies=2
      spell.cast("Sweeping Strikes", on => this.getCurrentTarget(), req => this.getEnemiesInRange(8) === 2),
      // actions.slayer_execute+=/rend,if=dot.rend.remains<=gcd&!talent.bloodletting
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 4 && !this.hasTalent("Bloodletting")),
      // actions.slayer_execute+=/thunderous_roar
      spell.cast("Thunderous Roar"),
      // actions.slayer_execute+=/champions_spear
      spell.cast("Champion's Spear", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.slayer_execute+=/avatar
      spell.cast("Avatar", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.slayer_execute+=/warbreaker
      spell.cast("Warbreaker"),
      // actions.slayer_execute+=/colossus_smash
      spell.cast("Colossus Smash"),
      // actions.slayer_execute+=/execute,if=buff.juggernaut.remains<=gcd
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.getAuraRemainingTime("Juggernaut") <= 1.5),
      // actions.slayer_execute+=/bladestorm,if=debuff.executioners_precision.stack=2&debuff.colossus_smash.remains>4|debuff.executioners_precision.stack=2&cooldown.colossus_smash.remains>15|!talent.executioners_precision
      spell.cast("Bladestorm", on => this.getCurrentTarget(), req => this.getDebuffStacks("Executioners Precision") === 2 && this.getDebuffRemainingTime("Colossus Smash") > 4 || this.getDebuffStacks("Executioners Precision") === 2 && spell.getCooldown("Colossus Smash").timeleft > 15 || !this.hasTalent("Executioners Precision")),
      // actions.slayer_execute+=/mortal_strike,if=debuff.executioners_precision.stack=2&(buff.lethal_blows.stack=2|!set_bonus.tww1_4pc)
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => this.getDebuffStacks("Executioners Precision") === 2 && (this.getAuraStacks("Lethal Blows") === 2) || !me.hasAura("453637")),
      // actions.slayer_execute+=/skullsplitter,if=rage<85
      spell.cast("Skullsplitter", on => this.getCurrentTarget(), req => me.powerByType(PowerType.Rage) < 85),
      // actions.slayer_execute+=/overpower,if=buff.opportunist.up&rage<80&buff.martial_prowess.stack<2
      spell.cast("Overpower", on => this.getCurrentTarget(), req => me.hasAura("Opportunist") && me.powerByType(PowerType.Rage) < 80 && this.getAuraStacks("Martial Prowess") < 2),
      // actions.slayer_execute+=/execute
      spell.cast("Execute", on => this.getCurrentTarget()),
      // actions.slayer_execute+=/overpower
      spell.cast("Overpower", on => this.getCurrentTarget()),
      // actions.slayer_execute+=/mortal_strike,if=!talent.executioners_precision
      spell.cast("Mortal Strike", on => this.getCurrentTarget(), req => !this.hasTalent("Executioners Precision")),
      // actions.slayer_execute+=/storm_bolt,if=buff.bladestorm.up
      spell.cast("Storm Bolt", on => this.getCurrentTarget(), req => me.hasAura("Bladestorm"))
    );
  }

  slayerSweep() {
    return new bt.Selector(
      // actions.slayer_sweep=thunderous_roar
      spell.cast("Thunderous Roar"),
      // actions.slayer_sweep+=/sweeping_strikes
      spell.cast("Sweeping Strikes"),
      // actions.slayer_sweep+=/rend,if=dot.rend.remains<=gcd
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 4),
      // actions.slayer_sweep+=/champions_spear
      spell.cast("Champion's Spear", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.slayer_sweep+=/avatar
      spell.cast("Avatar", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.slayer_sweep+=/colossus_smash
      spell.cast("Colossus Smash"),
      // actions.slayer_sweep+=/warbreaker
      spell.cast("Warbreaker"),
      // actions.slayer_sweep+=/skullsplitter,if=buff.sweeping_strikes.up
      spell.cast("Skullsplitter", on => this.getCurrentTarget(), req => me.hasAura("Sweeping Strikes")),
      // actions.slayer_sweep+=/execute,if=debuff.marked_for_execution.stack=3
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.getDebuffStacks("Marked for Execution") === 3),
      // actions.slayer_sweep+=/bladestorm
      spell.cast("Bladestorm"),
      // actions.slayer_sweep+=/overpower,if=talent.dreadnaught|buff.opportunist.up
      spell.cast("Overpower", on => this.getCurrentTarget(), req => this.hasTalent("Dreadnaught") || me.hasAura("Opportunist")),
      // actions.slayer_sweep+=/mortal_strike
      spell.cast("Mortal Strike", on => this.getCurrentTarget()),
      // actions.slayer_sweep+=/cleave,if=talent.fervor_of_battle
      spell.cast("Cleave", on => this.getCurrentTarget(), req => this.hasTalent("Fervor of Battle")),
      // actions.slayer_sweep+=/execute
      spell.cast("Execute", on => this.getCurrentTarget()),
      // actions.slayer_sweep+=/overpower
      spell.cast("Overpower", on => this.getCurrentTarget()),
      // actions.slayer_sweep+=/thunder_clap,if=dot.rend.remains<=8&buff.sweeping_strikes.down
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 8 && !me.hasAura("Sweeping Strikes")),
      // actions.slayer_sweep+=/rend,if=dot.rend.remains<=5
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 5),
      // actions.slayer_sweep+=/whirlwind,if=talent.fervor_of_battle
      spell.cast("Whirlwind", on => this.getCurrentTarget(), req => this.hasTalent("Fervor of Battle")),
      // actions.slayer_sweep+=/slam
      spell.cast("Slam"),
      // actions.slayer_sweep+=/storm_bolt,if=buff.bladestorm.up
      spell.cast("Storm Bolt", on => this.getCurrentTarget(), req => me.hasAura("Bladestorm"))
    );
  }

  slayerSt() {
    return new bt.Selector(
      // actions.slayer_st=rend,if=dot.rend.remains<=gcd
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 4),
      // actions.slayer_st+=/thunderous_roar
      spell.cast("Thunderous Roar"),
      // actions.slayer_st+=/champions_spear
      spell.cast("Champion's Spear", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.slayer_st+=/avatar
      spell.cast("Avatar", on => this.getCurrentTarget(), req => this.shouldUseCooldowns()),
      // actions.slayer_st+=/colossus_smash
      spell.cast("Colossus Smash"),
      // actions.slayer_st+=/warbreaker
      spell.cast("Warbreaker"),
      // actions.slayer_st+=/execute,if=debuff.marked_for_execution.stack=3
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.getDebuffStacks("Marked for Execution") === 3),
      // actions.slayer_st+=/bladestorm
      spell.cast("Bladestorm"),
      // actions.slayer_st+=/overpower,if=buff.opportunist.up
      spell.cast("Overpower", on => this.getCurrentTarget(), req => me.hasAura("Opportunist")),
      // actions.slayer_st+=/mortal_strike
      spell.cast("Mortal Strike", on => this.getCurrentTarget()),
      // actions.slayer_st+=/skullsplitter
      spell.cast("Skullsplitter", on => this.getCurrentTarget()),
      // actions.slayer_st+=/execute
      spell.cast("Execute", on => this.getCurrentTarget()),
      // actions.slayer_st+=/overpower
      spell.cast("Overpower", on => this.getCurrentTarget()),
      // actions.slayer_st+=/rend,if=dot.rend.remains<=gcd*5
      spell.cast("Rend", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 5),
      // actions.slayer_st+=/cleave,if=buff.martial_prowess.down
      spell.cast("Cleave", on => this.getCurrentTarget(), req => !me.hasAura("Martial Prowess")),
      // actions.slayer_st+=/slam
      spell.cast("Slam"),
      // actions.slayer_st+=/storm_bolt,if=buff.bladestorm.up
      spell.cast("Storm Bolt", on => this.getCurrentTarget(), req => me.hasAura("Bladestorm"))
    );
  }

  getCurrentTarget() {
    if (me.targetUnit && me.isWithinMeleeRange(me.targetUnit)) {
      return me.targetUnit;
    } else {
      return combat.targets.find(unit => unit.inCombat && unit.distanceTo(me) <= 8) || null;
    }
  }

  getEnemiesInRange(range) {
    return me.getUnitsAroundCount(range);
  }

  shouldUseCooldowns() {
    const target = this.getCurrentTarget();
    return target.timeToDeath() > 20;
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
    return me.hasAura(talentName);
  }

  isExecutePhase() {
    const target = this.getCurrentTarget();
    if (target && target.distanceTo(me) <= 8) {
    return (this.hasTalent("Massacre") && target.pctHealth < 35) || target.pctHealth < 20;
    }
  }

  getGCD() {
    return 1.5;
  }

  getTargetTimeToDie() {
    const target = this.getCurrentTarget();
    return target ? target.timeToDeath() : 0;
  }

  timeToAdds() {
    // This is a placeholder. In a real scenario, you'd implement logic to predict when adds will spawn.
    return 9999;
  }

  hasTalent(talentName) {
    return me.hasAura(talentName);
  }
}
