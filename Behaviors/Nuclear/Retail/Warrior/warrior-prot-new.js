import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { PowerType } from "@/Enums/PowerType";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";

export class WarriorProtNewBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Warrior.Protection;
  version = wow.GameVersion.Retail;
  name = "SimC Warrior Protection";

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForTarget(),
      common.waitForCastOrChannel(),
      this.startCombat(),
      this.useCooldowns(),
      this.useDefensives(),
      new bt.Decorator(
        () => Boolean(this.getEnemiesInRange(8) >= 3),
        this.aoeRotation()
      ),
      this.genericRotation()
    );
  }

  startCombat() {
    return new bt.Selector(
      spell.cast("Charge", on => me.targetUnit && me.distanceTo(me.targetUnit) > 8 && me.distanceTo(me.targetUnit) <= 25, req => wow.frameTime === 0)
    );
  }

  useCooldowns() {
    return new bt.Selector(
      spell.cast("Avatar"),
      spell.cast("Shield Wall", on => this.getCurrentTarget(), req => me.hasTalent("Immovable Object") && !me.hasAura("Avatar")),
      spell.cast("Blood Fury"),
      spell.cast("Berserking"),
      spell.cast("Arcane Torrent"),
      spell.cast("Lights Judgment"),
      spell.cast("Fireblood"),
      spell.cast("Ancestral Call"),
      spell.cast("Bag of Tricks"),
      // spell.cast("Potion", on => this.getCurrentTarget(), req => me.hasAura("Avatar") || (me.hasAura("Avatar") && this.getCurrentTarget().health.pct <= 20)),
      spell.cast("Last Stand", on => this.getCurrentTarget(), req => this.shouldUseLastStand()),
      spell.cast("Ravager"),
      spell.cast("Demoralizing Shout", on => this.getCurrentTarget(), req => me.hasTalent("Booming Voice")),
      spell.cast("Champions Spear"),
      spell.cast("Thunderous Roar"),
      spell.cast("Shield Charge")
    );
  }

  useDefensives() {
    return new bt.Selector(
      spell.cast("Shield Block", on => this.getCurrentTarget(), req => this.getAuraRemainingTime("Shield Block") <= 10000),
      spell.cast("Ignore Pain", on => this.getCurrentTarget(), req => me.powerByType(PowerType.Rage) >= 70)
      // Commented out detailed rage management as requested
      /*
      spell.cast("Ignore Pain", on => this.getCurrentTarget(), req => {
        const rage = me.powerByType(PowerType.Rage);
        const rageDeficit = 100 - rage;
        return (
          this.getCurrentTarget().health.pct >= 20 && (
            (rageDeficit <= 15 && spell.getCooldown("Shield Slam").ready) ||
            (rageDeficit <= 40 && spell.getCooldown("Shield Charge").ready && me.hasTalent("Champions Bulwark")) ||
            (rageDeficit <= 20 && spell.getCooldown("Shield Charge").ready) ||
            (rageDeficit <= 30 && spell.getCooldown("Demoralizing Shout").ready && me.hasTalent("Booming Voice")) ||
            (rageDeficit <= 20 && spell.getCooldown("Avatar").ready) ||
            (rageDeficit <= 45 && spell.getCooldown("Demoralizing Shout").ready && me.hasTalent("Booming Voice") && me.hasAura("Last Stand") && me.hasTalent("Unnerving Focus")) ||
            (rageDeficit <= 30 && spell.getCooldown("Avatar").ready && me.hasAura("Last Stand") && me.hasTalent("Unnerving Focus")) ||
            rageDeficit <= 20 ||
            (rageDeficit <= 40 && spell.getCooldown("Shield Slam").ready && me.hasAura("Violent Outburst") && me.hasTalent("Heavy Repercussions") && me.hasTalent("Impenetrable Wall")) ||
            (rageDeficit <= 55 && spell.getCooldown("Shield Slam").ready && me.hasAura("Violent Outburst") && me.hasAura("Last Stand") && me.hasTalent("Unnerving Focus") && me.hasTalent("Heavy Repercussions") && me.hasTalent("Impenetrable Wall")) ||
            (rageDeficit <= 17 && spell.getCooldown("Shield Slam").ready && me.hasTalent("Heavy Repercussions")) ||
            (rageDeficit <= 18 && spell.getCooldown("Shield Slam").ready && me.hasTalent("Impenetrable Wall"))
          ) || 
          ((rage >= 70 || (me.getAuraStacks("Seeing Red") === 7 && rage >= 35)) && 
           spell.getCooldown("Shield Slam").remaining <= 1 && 
           this.getAuraRemainingTime("Shield Block") >= 4 && 
           me.hasSetBonus(31, 2))
        );
      })
      */
    );
  }

  aoeRotation() {
    return new bt.Selector(
      spell.cast("Thunder Blast", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 1000),
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 1000),
      spell.cast("Thunder Blast", on => this.getCurrentTarget(), req => me.hasAura("Violent Outburst") && this.getEnemiesInRange(8) >= 2 && me.hasAura("Avatar") && me.hasTalent("Unstoppable Force")),
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => me.hasAura("Violent Outburst") && this.getEnemiesInRange(8) >= 4 && me.hasAura("Avatar") && me.hasTalent("Unstoppable Force") && me.hasTalent("Crashing Thunder")),
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => me.hasAura("Violent Outburst") && this.getEnemiesInRange(8) > 6 && me.hasAura("Avatar") && me.hasTalent("Unstoppable Force")),
      spell.cast("Revenge", on => this.getCurrentTarget(), req => me.powerByType(PowerType.Rage) >= 70 && me.hasTalent("Seismic Reverberation") && this.getEnemiesInRange(8) >= 3),
      spell.cast("Shield Slam", on => this.getCurrentTarget(), req => me.powerByType(PowerType.Rage) <= 60 || (me.hasAura("Violent Outburst") && this.getEnemiesInRange(8) <= 4 && me.hasTalent("Crashing Thunder"))),
      spell.cast("Thunder Blast", on => this.getCurrentTarget()),
      spell.cast("Thunder Clap", on => this.getCurrentTarget()),
      spell.cast("Revenge", on => this.getCurrentTarget(), req => me.powerByType(PowerType.Rage) >= 30 || (me.powerByType(PowerType.Rage) >= 40 && me.hasTalent("Barbaric Training")))
    );
  }

  genericRotation() {
    return new bt.Selector(
      spell.cast("Thunder Blast", on => this.getCurrentTarget(), req => (me.getAuraStacks("Thunder Blast") === 2 && me.getAuraStacks("Burst of Power") <= 1 && me.hasAura("Avatar") && me.hasTalent("Unstoppable Force")) || (me.powerByType(PowerType.Rage) <= 70 && me.hasTalent("Demolish"))),
      spell.cast("Shield Slam", on => this.getCurrentTarget(), req => (me.getAuraStacks("Burst of Power") === 2 && me.getAuraStacks("Thunder Blast") <= 1) || me.hasAura("Violent Outburst") || (me.powerByType(PowerType.Rage) <= 70 && me.hasTalent("Demolish"))),
      spell.cast("Execute", on => this.getCurrentTarget(), req => me.powerByType(PowerType.Rage) >= 70 || (me.powerByType(PowerType.Rage) >= 40 && spell.getCooldown("Shield Slam").remaining && me.hasTalent("Demolish")) || (me.powerByType(PowerType.Rage) >= 50 && spell.getCooldown("Shield Slam").remaining) || (me.hasAura("Sudden Death") && me.hasTalent("Sudden Death"))),
      spell.cast("Shield Slam", on => this.getCurrentTarget()),
      spell.cast("Thunder Blast", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 2000 && !me.hasAura("Violent Outburst")),
      spell.cast("Thunder Blast", on => this.getCurrentTarget()),
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => this.getDebuffRemainingTime("Rend") <= 2000 && !me.hasAura("Violent Outburst")),
      spell.cast("Thunder Blast", on => this.getCurrentTarget(), req => this.getEnemiesInRange(8) > 1 || (spell.getCooldown("Shield Slam").remaining && !me.hasAura("Violent Outburst"))),
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => this.getEnemiesInRange(8) > 1 || (spell.getCooldown("Shield Slam").remaining && !me.hasAura("Violent Outburst"))),
      spell.cast("Revenge", on => this.getCurrentTarget(), req => this.shouldUseRevenge()),
      spell.cast("Execute", on => this.getCurrentTarget()),
      spell.cast("Revenge", on => this.getCurrentTarget(), req => this.getCurrentTarget().health.pct > 20),
      spell.cast("Thunder Blast", on => this.getCurrentTarget(), req => this.getEnemiesInRange(8) >= 1 || (spell.getCooldown("Shield Slam").remaining && me.hasAura("Violent Outburst"))),
      spell.cast("Thunder Clap", on => this.getCurrentTarget(), req => this.getEnemiesInRange(8) >= 1 || (spell.getCooldown("Shield Slam").remaining && me.hasAura("Violent Outburst"))),
      spell.cast("Devastate", on => this.getCurrentTarget())
    );
  }

  shouldUseLastStand() {
    const target = this.getCurrentTarget();
    return (
      (target && target.health.pct >= 90 && me.hasTalent("Unnerving Focus")) ||
      (target && target.health.pct <= 20 && me.hasTalent("Unnerving Focus")) ||
      me.hasTalent("Bolster") ||
      me.hasSetBonus(30, 2) ||
      me.hasSetBonus(30, 4)
    );
  }

  shouldUseRevenge() {
    const target = this.getCurrentTarget();
    const rage = me.powerByType(PowerType.Rage);
    return (
      (rage >= 80 && target.health.pct > 20) ||
      (me.hasAura("Revenge") && target.health.pct <= 20 && rage <= 18 && spell.getCooldown("Shield Slam").remaining) ||
      (me.hasAura("Revenge") && target.health.pct > 20) ||
      (rage >= 80 && target.health.pct > 35) ||
      (me.hasAura("Revenge") && target.health.pct <= 35 && rage <= 18 && spell.getCooldown("Shield Slam").remaining) ||
      (me.hasAura("Revenge") && target.health.pct > 35 && me.hasTalent("Massacre"))
    );
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

  getEnemiesInRange(range) {
    return me.getUnitsAroundCount(range);
  }

  getCurrentTarget() {
    if (me.targetUnit && me.isWithinMeleeRange(me.targetUnit)) {
      return me.targetUnit;
    } else {
      return combat.targets.find(unit => unit.inCombat && unit.distanceTo(me) <= 10);
    }
  }
}
