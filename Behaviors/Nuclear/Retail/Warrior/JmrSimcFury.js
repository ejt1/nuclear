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
  name = "Jmr SimC Warrior Fury";

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      new bt.Action(() => {
        if (this.getCurrentTarget() === null) {
          return bt.Status.Success;
        }
        return bt.Status.Failure;
      }),
      common.waitForCastOrChannel(),
      spell.cast("Battle Shout", () => !me.hasAura("Battle Shout")),
      spell.cast("Rallying Cry", () => me.pctHealth < 30),
      spell.cast("Victory Rush", () => me.pctHealth < 70),
      spell.cast("Enraged Regeneration", () => me.pctHealth < 60),
      spell.cast("Bloodthirst", () => me.pctHealth < 70 && me.hasVisibleAura("Enraged Regeneration")),
      spell.interrupt("Pummel", false),
      spell.interrupt("Storm Bolt", false),
      new bt.Decorator(
        () => this.shouldUseAvatar() && (me.hasVisibleAura("Recklessness") || me.hasVisibleAura("Avatar")),
        this.useTrinkets(),
        new bt.Action(() => bt.Status.Success)
      ),
      new bt.Decorator(
        () => this.shouldUseAvatar(),
        this.useRacials(),
        new bt.Action(() => bt.Status.Success)
      ),
      new bt.Decorator(
        () => this.hasTalent("Slayer's Dominance") && this.getEnemiesInRange(10) === 1,
        this.slayerSingleTarget(),
        new bt.Action(() => bt.Status.Success)
      ),
      new bt.Decorator(
        () => this.hasTalent("Slayer's Dominance") && this.getEnemiesInRange(10) > 1,
        this.slayerMultiTarget(),
        new bt.Action(() => bt.Status.Success)
      ),
      new bt.Decorator(
        () => this.hasTalent("Lightning Strikes") && this.getEnemiesInRange(10) === 1,
        this.thaneSingleTarget(),
        new bt.Action(() => bt.Status.Success)
      ),
      new bt.Decorator(
        () => this.hasTalent("Lightning Strikes") && this.getEnemiesInRange(10) > 1,
        this.thaneMultiTarget(),
        new bt.Action(() => bt.Status.Success)
      )
    );
  }



  useTrinkets() {
    return new bt.Selector(
      common.useEquippedItemByName("Skarmorak Shard"),
    );
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
      // actions.slayer_st=recklessness,if=(!talent.anger_management&cooldown.avatar.remains<1&talent.titans_torment)|talent.anger_management|!talent.titans_torment
      spell.cast("Recklessness", req => this.shouldUseRecklessness() && (!this.hasTalent("Anger Management") && spell.getCooldown("Avatar").timeleft < 1 && this.hasTalent("Titan's Torment")) || this.hasTalent("Anger Management") || !this.hasTalent("Titan's Torment")),
      // actions.slayer_st+=/avatar,if=(talent.titans_torment&(buff.enrage.up|talent.titanic_rage)&(debuff.champions_might.up|!talent.champions_might))|!talent.titans_torment
      spell.cast("Avatar", req => this.shouldUseAvatar() && (this.hasTalent("Titan's Torment") && (me.hasAura("Enrage") || this.hasTalent("Titanic Rage")) && (this.getCurrentTarget().hasAuraByMe("Champion's Might") || !this.hasTalent("Champion's Might"))) || !this.hasTalent("Titan's Torment")),
      // actions.slayer_st+=/thunderous_roar,if=buff.enrage.up
      spell.cast("Thunderous Roar", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      // actions.slayer_st+=/champions_spear,if=(buff.enrage.up&talent.titans_torment&cooldown.avatar.remains<gcd)|(buff.enrage.up&!talent.titans_torment)
      spell.cast("Champion's Spear", on => this.getCurrentTarget(), req => this.shouldUseChampionsSpear() && (me.hasAura("Enrage") && this.hasTalent("Titan's Torment") && spell.getCooldown("Avatar").timeleft < 1) || (me.hasAura("Enrage") && !this.hasTalent("Titan's Torment"))),
      // actions.slayer_st+=/odyns_fury,if=dot.odyns_fury_torment_mh.remains<1&(buff.enrage.up|talent.titanic_rage)&cooldown.avatar.remains
      spell.cast("Odyn's Fury", on => this.getCurrentTarget(), req => this.shouldUseOdynsFury() && (this.getDebuffRemainingTime("Odyn's Fury") < 1 && (me.hasAura("Enrage") || this.hasTalent("Titanic Rage")) && spell.getCooldown("Avatar").timeleft > 0)),
      // actions.slayer_st+=/execute,if=talent.ashen_juggernaut&buff.ashen_juggernaut.remains<=gcd&buff.enrage.up
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.hasTalent("Ashen Juggernaut") && this.getAuraRemainingTime("Ashen Juggernaut") <= 1.5 && me.hasAura("Enrage")),
      // actions.slayer_st+=/rampage,if=talent.bladestorm&cooldown.bladestorm.remains<=gcd&!debuff.champions_might.up
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.hasTalent("Bladestorm") && spell.getCooldown("Bladestorm").timeleft <= 1.5 && !this.getCurrentTarget().hasAuraByMe("Champion's Might")),
      // actions.slayer_st+=/bladestorm,if=buff.enrage.up&cooldown.avatar.remains>=9
      spell.cast("Bladestorm", on => this.getCurrentTarget(), req => me.hasAura("Enrage") && spell.getCooldown("Avatar").timeleft >= 9),
      // actions.slayer_st+=/onslaught,if=talent.tenderize&buff.brutal_finish.up
      spell.cast("Onslaught", on => this.getCurrentTarget(), req => this.hasTalent("Tenderize") && me.hasAura("Brutal Finish")),
      // actions.slayer_st+=/rampage,if=talent.anger_management
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.hasTalent("Anger Management")),
      // actions.slayer_st+=/crushing_blow
      spell.cast("Crushing Blow", on => this.getCurrentTarget()),
      // actions.slayer_st+=/onslaught,if=talent.tenderize
      spell.cast("Onslaught", on => this.getCurrentTarget(), req => this.hasTalent("Tenderize")),
      // actions.slayer_st+=/bloodbath,if=buff.enrage.up
      spell.cast("Bloodbath", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      // actions.slayer_st+=/raging_blow,if=talent.slaughtering_strikes&rage<110&talent.reckless_abandon
      spell.cast("Raging Blow", on => this.getCurrentTarget(), req => this.hasTalent("Slaughtering Strikes") && me.powerByType(PowerType.Rage) < 110 && this.hasTalent("Reckless Abandon")),
      // actions.slayer_st+=/execute,if=buff.enrage.up&debuff.marked_for_execution.up
      spell.cast("Execute", on => this.getCurrentTarget(), req => me.hasAura("Enrage") && this.getCurrentTarget().hasAuraByMe("Marked for Execution")),
      // actions.slayer_st+=/rampage,if=talent.reckless_abandon
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.hasTalent("Reckless Abandon")),
      // actions.slayer_st+=/bloodthirst,if=!talent.reckless_abandon&buff.enrage.up
      spell.cast("Bloodthirst", on => this.getCurrentTarget(), req => !this.hasTalent("Reckless Abandon") && me.hasAura("Enrage")),
      // actions.slayer_st+=/raging_blow
      spell.cast("Raging Blow", on => this.getCurrentTarget()),
      // actions.slayer_st+=/onslaught
      spell.cast("Onslaught", on => this.getCurrentTarget()),
      // actions.slayer_st+=/execute
      spell.cast("Execute", on => this.getCurrentTarget()),
      // actions.slayer_st+=/bloodthirst
      spell.cast("Bloodthirst", on => this.getCurrentTarget()),
      // actions.slayer_st+=/whirlwind,if=talent.meat_cleaver
      spell.cast("Whirlwind", on => this.getCurrentTarget(), req => this.hasTalent("Meat Cleaver")),
      // actions.slayer_st+=/slam
      spell.cast("Slam", on => this.getCurrentTarget()),
      // actions.slayer_st+=/storm_bolt,if=buff.bladestorm.up
      spell.cast("Storm Bolt", on => this.getCurrentTarget(), req => me.hasAura("Bladestorm"))
    );
  }

  slayerMultiTarget() {
    return new bt.Selector(
      // actions.slayer_mt=recklessness,if=(!talent.anger_management&cooldown.avatar.remains<1&talent.titans_torment)|talent.anger_management|!talent.titans_torment
      spell.cast("Recklessness", req => this.shouldUseRecklessness() && (Boolean(!this.hasTalent("Anger Management") && spell.getCooldown("Avatar").timeleft < 1 && this.hasTalent("Titan's Torment")) || this.hasTalent("Anger Management") || !this.hasTalent("Titan's Torment"))),
      // actions.slayer_mt+=/avatar,if=(talent.titans_torment&(buff.enrage.up|talent.titanic_rage)&(debuff.champions_might.up|!talent.champions_might))|!talent.titans_torment
      spell.cast("Avatar", req => this.shouldUseAvatar() && (Boolean(this.hasTalent("Titan's Torment") && (me.hasAura("Enrage") || this.hasTalent("Titanic Rage")) && (this.getCurrentTarget().hasAuraByMe("Champion's Might")) || !this.hasTalent("Champion's Might"))) || !this.hasTalent("Titan's Torment")),
      // actions.slayer_mt+=/thunderous_roar,if=buff.enrage.up
      spell.cast("Thunderous Roar", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      // actions.slayer_mt+=/champions_spear,if=(buff.enrage.up&talent.titans_torment&cooldown.avatar.remains<gcd)|(buff.enrage.up&!talent.titans_torment)
      spell.cast("Champion's Spear", on => this.getCurrentTarget(), req => this.shouldUseChampionsSpear() && (me.hasAura("Enrage") && this.hasTalent("Titan's Torment") && spell.getCooldown("Avatar").timeleft < 1) || (me.hasAura("Enrage") && !this.hasTalent("Titan's Torment"))),
      // actions.slayer_mt+=/odyns_fury,if=dot.odyns_fury_torment_mh.remains<1&(buff.enrage.up|talent.titanic_rage)&cooldown.avatar.remains
      spell.cast("Odyn's Fury", on => this.getCurrentTarget(), req => this.shouldUseOdynsFury() && (this.getDebuffRemainingTime("Odyn's Fury") < 1 && (me.hasAura("Enrage") || this.hasTalent("Titanic Rage")) && spell.getCooldown("Avatar").timeleft > 0)),
      // actions.slayer_mt+=/whirlwind,if=buff.meat_cleaver.stack=0&talent.meat_cleaver
      spell.cast("Whirlwind", on => this.getCurrentTarget(), req => me.getAuraStacks("Whirlwind") === 0 && this.hasTalent("Meat Cleaver")),
      // actions.slayer_mt+=/execute,if=talent.ashen_juggernaut&buff.ashen_juggernaut.remains<=gcd&buff.enrage.up
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.hasTalent("Ashen Juggernaut") && this.getAuraRemainingTime("Ashen Juggernaut") <= 1.5 && me.hasAura("Enrage")),
      // actions.slayer_mt+=/rampage,if=talent.bladestorm&cooldown.bladestorm.remains<=gcd&!debuff.champions_might.up
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.hasTalent("Bladestorm") && spell.getCooldown("Bladestorm").timeleft <= 1.5 && !this.getCurrentTarget().hasAuraByMe("Champion's Might")),
      // actions.slayer_mt+=/bladestorm,if=buff.enrage.up&cooldown.avatar.remains>=9
      spell.cast("Bladestorm", on => this.getCurrentTarget(), req => me.hasAura("Enrage") && spell.getCooldown("Avatar").timeleft >= 9),
      // actions.slayer_mt+=/onslaught,if=talent.tenderize&buff.brutal_finish.up
      spell.cast("Onslaught", on => this.getCurrentTarget(), req => this.hasTalent("Tenderize") && me.hasAura("Brutal Finish")),
      // actions.slayer_mt+=/rampage,if=talent.anger_management
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.hasTalent("Anger Management")),
      // actions.slayer_mt+=/crushing_blow
      spell.cast("Crushing Blow", on => this.getCurrentTarget()),
      // actions.slayer_mt+=/onslaught,if=talent.tenderize
      spell.cast("Onslaught", on => this.getCurrentTarget(), req => this.hasTalent("Tenderize")),
      // actions.slayer_mt+=/bloodbath,if=buff.enrage.up
      spell.cast("Bloodbath", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      // actions.slayer_mt+=/rampage,if=talent.reckless_abandon
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.hasTalent("Reckless Abandon")),
      // actions.slayer_mt+=/execute,if=buff.enrage.up&debuff.marked_for_execution.up
      spell.cast("Execute", on => this.getCurrentTarget(), req => me.hasAura("Enrage") && this.getCurrentTarget().hasAuraByMe("Marked for Execution")),
      // actions.slayer_mt+=/bloodbath
      spell.cast("Bloodbath", on => this.getCurrentTarget()),
      // actions.slayer_mt+=/raging_blow,if=talent.slaughtering_strikes
      spell.cast("Raging Blow", on => this.getCurrentTarget(), req => this.hasTalent("Slaughtering Strikes")),
      // actions.slayer_mt+=/onslaught
      spell.cast("Onslaught", on => this.getCurrentTarget()),
      // actions.slayer_mt+=/execute
      spell.cast("Execute", on => this.getCurrentTarget()),
      // actions.slayer_mt+=/bloodthirst
      spell.cast("Bloodthirst", on => this.getCurrentTarget()),
      // actions.slayer_mt+=/raging_blow
      spell.cast("Raging Blow", on => this.getCurrentTarget()),
      // actions.slayer_mt+=/whirlwind
      spell.cast("Whirlwind", on => this.getCurrentTarget()),
      // actions.slayer_mt+=/storm_bolt,if=buff.bladestorm.up
      spell.cast("Storm Bolt", on => this.getCurrentTarget(), req => me.hasAura("Bladestorm"))
    );
  }

  thaneSingleTarget() {
    return new bt.Selector(
      // actions.thane_st=recklessness,if=(!talent.anger_management&cooldown.avatar.remains<1&talent.titans_torment)|talent.anger_management|!talent.titans_torment
      spell.cast("Recklessness", req => this.shouldUseRecklessness() && (Boolean(!this.hasTalent("Anger Management") && spell.getCooldown("Avatar").timeleft < 1 && this.hasTalent("Titan's Torment")) || this.hasTalent("Anger Management") || !this.hasTalent("Titan's Torment"))),
      // actions.thane_st+=/thunder_blast,if=buff.enrage.up
      spell.cast("Thunder Blast", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      // actions.thane_st+=/avatar,if=(talent.titans_torment&(buff.enrage.up|talent.titanic_rage)&(debuff.champions_might.up|!talent.champions_might))|!talent.titans_torment
      spell.cast("Avatar", req => this.shouldUseAvatar() && (Boolean(this.hasTalent("Titan's Torment") && (me.hasAura("Enrage") || this.hasTalent("Titanic Rage")) && (this.getCurrentTarget().hasAuraByMe("Champion's Might") || !this.hasTalent("Champion's Might"))) || !this.hasTalent("Titan's Torment"))),
      // actions.thane_st+=/ravager
      spell.cast("Ravager", on => this.getCurrentTarget()),
      // actions.thane_st+=/thunderous_roar,if=buff.enrage.up
      spell.cast("Thunderous Roar", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      // actions.thane_st+=/champions_spear,if=buff.enrage.up&(cooldown.avatar.remains<gcd|!talent.titans_torment)
      spell.cast("Champion's Spear", on => this.getCurrentTarget(), req => this.shouldUseChampionsSpear() && (me.hasAura("Enrage") && (spell.getCooldown("Avatar").timeleft < 1 || !this.hasTalent("Titan's Torment")))),
      // actions.thane_st+=/odyns_fury,if=dot.odyns_fury_torment_mh.remains<1&(buff.enrage.up|talent.titanic_rage)&cooldown.avatar.remains
      spell.cast("Odyn's Fury", on => this.getCurrentTarget(), req => this.shouldUseOdynsFury() && (this.getDebuffRemainingTime("Odyn's Fury Torment") < 1 && (me.hasAura("Enrage") || this.hasTalent("Titanic Rage")) && spell.getCooldown("Avatar").timeleft > 0.1)),
      // actions.thane_st+=/execute,if=talent.ashen_juggernaut&buff.ashen_juggernaut.remains<=gcd&buff.enrage.up
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.hasTalent("Ashen Juggernaut") && this.getAuraRemainingTime("Ashen Juggernaut") <= 1.5 && me.hasAura("Enrage")),
      // actions.thane_st+=/rampage,if=talent.bladestorm&cooldown.bladestorm.remains<=gcd&!debuff.champions_might.up
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.hasTalent("Bladestorm") && spell.getCooldown("Bladestorm").timeleft <= 1.5 && !this.getCurrentTarget().hasAuraByMe("Champion's Might")),
      // actions.thane_st+=/bladestorm,if=buff.enrage.up&talent.unhinged
      spell.cast("Bladestorm", on => this.getCurrentTarget(), req => me.hasAura("Enrage") && this.hasTalent("Unhinged")),
      // actions.thane_st+=/rampage,if=talent.anger_management
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.hasTalent("Anger Management")),
      // actions.thane_st+=/crushing_blow
      spell.cast("Crushing Blow", on => this.getCurrentTarget()),
      // actions.thane_st+=/onslaught,if=talent.tenderize
      spell.cast("Onslaught", on => this.getCurrentTarget(), req => this.hasTalent("Tenderize")),
      // actions.thane_st+=/bloodbath
      spell.cast("Bloodbath", on => this.getCurrentTarget()),
      // actions.thane_st+=/rampage,if=talent.reckless_abandon
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.hasTalent("Reckless Abandon")),
      // actions.thane_st+=/raging_blow
      spell.cast("Raging Blow", on => this.getCurrentTarget()),
      // actions.thane_st+=/execute
      spell.cast("Execute", on => this.getCurrentTarget()),
      // actions.thane_st+=/bloodthirst,if=buff.enrage.up&(!buff.burst_of_power.up|!talent.reckless_abandon)
      spell.cast("Bloodthirst", on => this.getCurrentTarget(), req => me.hasAura("Enrage") && (!me.hasAura("Burst of Power") || !this.hasTalent("Reckless Abandon"))),
      // actions.thane_st+=/onslaught
      spell.cast("Onslaught", on => this.getCurrentTarget()),
      // actions.thane_st+=/bloodthirst
      spell.cast("Bloodthirst", on => this.getCurrentTarget()),
      // actions.thane_st+=/thunder_clap
      spell.cast("Thunder Clap", on => this.getCurrentTarget()),
      // actions.thane_st+=/whirlwind,if=talent.meat_cleaver
      spell.cast("Whirlwind", on => this.getCurrentTarget(), req => this.hasTalent("Meat Cleaver")),
      // actions.thane_st+=/slam
      spell.cast("Slam", on => this.getCurrentTarget())
    );
  }

  thaneMultiTarget() {
    return new bt.Selector(
      // actions.thane_mt=recklessness,if=(!talent.anger_management&cooldown.avatar.remains<1&talent.titans_torment)|talent.anger_management|!talent.titans_torment
      spell.cast("Recklessness", req => this.shouldUseRecklessness() && (Boolean(!this.hasTalent("Anger Management") && spell.getCooldown("Avatar").timeleft < 1 && this.hasTalent("Titan's Torment")) || this.hasTalent("Anger Management") || !this.hasTalent("Titan's Torment"))),
      // actions.thane_mt+=/thunder_blast,if=buff.enrage.up
      spell.cast("Thunder Blast", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      // actions.thane_mt+=/avatar,if=(talent.titans_torment&(buff.enrage.up|talent.titanic_rage)&(debuff.champions_might.up|!talent.champions_might))|!talent.titans_torment
      spell.cast("Avatar", req => this.shouldUseAvatar() && (Boolean(this.hasTalent("Titan's Torment") && (me.hasAura("Enrage") || this.hasTalent("Titanic Rage")) && (this.getCurrentTarget().hasAuraByMe("Champion's Might") || !this.hasTalent("Champion's Might"))) || !this.hasTalent("Titan's Torment"))),
      // actions.thane_mt+=/thunder_clap,if=buff.meat_cleaver.stack=0&talent.meat_cleaver
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => me.getAuraStacks("Whirlwind") === 0 && this.hasTalent("Meat Cleaver")),
      // actions.thane_mt+=/thunderous_roar,if=buff.enrage.up
      spell.cast("Thunderous Roar", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      // actions.thane_mt+=/ravager
      spell.cast("Ravager", on => this.getCurrentTarget()),
      // actions.thane_mt+=/champions_spear,if=buff.enrage.up
      spell.cast("Champion's Spear", on => this.getCurrentTarget(), req => this.shouldUseChampionsSpear() && me.hasAura("Enrage")),
      // actions.thane_mt+=/odyns_fury,if=dot.odyns_fury_torment_mh.remains<1&(buff.enrage.up|talent.titanic_rage)&cooldown.avatar.remains
      spell.cast("Odyn's Fury", on => this.getCurrentTarget(), req => this.shouldUseOdynsFury() && (this.getDebuffRemainingTime("Odyn's Fury Torment") < 1 && (me.hasAura("Enrage") || this.hasTalent("Titanic Rage")) && spell.getCooldown("Avatar").timeleft > 0.1)),
      // actions.thane_mt+=/execute,if=talent.ashen_juggernaut&buff.ashen_juggernaut.remains<=gcd&buff.enrage.up
      spell.cast("Execute", on => this.getCurrentTarget(), req => this.hasTalent("Ashen Juggernaut") && this.getAuraRemainingTime("Ashen Juggernaut") <= 1.5 && me.hasAura("Enrage")),
      // actions.thane_mt+=/rampage,if=talent.bladestorm&cooldown.bladestorm.remains<=gcd&!debuff.champions_might.up
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.hasTalent("Bladestorm") && spell.getCooldown("Bladestorm").timeleft <= 1.5 && !this.getCurrentTarget().hasAuraByMe("Champion's Might")),
      // actions.thane_mt+=/bladestorm,if=buff.enrage.up
      spell.cast("Bladestorm", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      // actions.thane_mt+=/rampage,if=talent.anger_management
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.hasTalent("Anger Management")),
      // actions.thane_mt+=/crushing_blow,if=buff.enrage.up
      spell.cast("Crushing Blow", on => this.getCurrentTarget(), req => me.hasAura("Enrage")),
      // actions.thane_mt+=/onslaught,if=talent.tenderize
      spell.cast("Onslaught", on => this.getCurrentTarget(), req => this.hasTalent("Tenderize")),
      // actions.thane_mt+=/bloodbath
      spell.cast("Bloodbath", on => this.getCurrentTarget()),
      // actions.thane_mt+=/rampage,if=talent.reckless_abandon
      spell.cast("Rampage", on => this.getCurrentTarget(), req => this.hasTalent("Reckless Abandon")),
      // actions.thane_mt+=/bloodthirst
      spell.cast("Bloodthirst", on => this.getCurrentTarget()),
      // actions.thane_mt+=/thunder_clap
      spell.cast("Thunder Clap", on => this.getCurrentTarget()),
      // actions.thane_mt+=/onslaught
      spell.cast("Onslaught", on => this.getCurrentTarget()),
      // actions.thane_mt+=/execute
      spell.cast("Execute", on => this.getCurrentTarget()),
      // actions.thane_mt+=/raging_blow
      spell.cast("Raging Blow", on => this.getCurrentTarget()),
      // actions.thane_mt+=/whirlwind
      spell.cast("Whirlwind", on => this.getCurrentTarget())
    );
  }

  shouldUseRecklessness() {
    const target = this.getCurrentTarget();
    return target.timeToDeath() > 15 && !me.hasAura("Smothering Shadows");
  }

  shouldUseAvatar() {
    const target = this.getCurrentTarget();
    return target.timeToDeath() > 15 && !me.hasAura("Smothering Shadows");
  }

  shouldUseChampionsSpear() {
    const target = this.getCurrentTarget();
    return target.timeToDeath() > 15 && !me.hasAura("Smothering Shadows");
  }

  shouldUseOdynsFury() {
    const target = this.getCurrentTarget();
    return target.timeToDeath() > 15 && !me.hasAura("Smothering Shadows");
  }

  shouldUseOnGCDRacials() {
    const target = this.getCurrentTarget();
    return !me.hasAura("Recklessness") &&
           target.timeToDeath() > 15 && !me.hasAura("Smothering Shadows") &&
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
    return (this.hasTalent("Massacre") && target.pctHealth < 35) || target.pctHealth < 20;
  }

  getCurrentTarget() {
    const targetPredicate = unit => common.validTarget(unit) && me.isWithinMeleeRange(unit) && me.isFacing(unit);
    const target = me.target;
    if (target !== null && targetPredicate(target)) {
      return target;
    }
    return combat.targets.find(targetPredicate) || null;
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
    return me.hasAura(talentName);
  }
}
