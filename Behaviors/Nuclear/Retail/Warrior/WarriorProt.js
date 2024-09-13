import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { PowerType } from "@/Enums/PowerType";

export class WarriorProtectionBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Warrior.Protection;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForTarget(),
      common.waitForCastOrChannel(),
      spell.cast("Battle Shout", () => !me.hasAura("Battle Shout")),
      spell.cast("Rallying Cry", () => me.pctHealth < 30),
      spell.cast("Victory Rush", () => me.pctHealth < 70),
      new bt.Decorator(
        () => Boolean(me.isWithinMeleeRange(me.target)),
        new bt.Selector(
          this.useCooldowns(),
          this.useDefensives(),
          new bt.Decorator(
            () => Boolean(me.getUnitsAroundCount(8) >= 3),
            this.aoeRotation()
          ),
          this.genericRotation()
        )
      )
    );
  }

  useCooldowns() {
    return new bt.Selector(
      spell.cast("Avatar", () => Boolean(!me.hasAura("Thunder Blast") || me.getAuraStacks("Thunder Blast") <= 2)),
      spell.cast("Shield Wall", () => Boolean(me.hasAura("Immovable Object") && !me.hasAura("Avatar"))),
      spell.cast("Blood Fury"),
      spell.cast("Berserking"),
      spell.cast("Arcane Torrent"),
      spell.cast("Lights Judgment"),
      spell.cast("Fireblood"),
      spell.cast("Ancestral Call"),
      spell.cast("Bag of Tricks"),
      spell.cast("Potion", () => Boolean(me.hasAura("Avatar") || (me.hasAura("Avatar") && me.targetUnit.health.pct <= 20))),
      spell.cast("Last Stand", () => Boolean(this.shouldUseLastStand()) && !me.hasAura("Shield Wall")),
      spell.cast("Ravager"),
      spell.cast("Demoralizing Shout", () => Boolean(me.hasAura("Booming Voice"))),
      spell.cast("Spear of Bastion"),
      spell.cast("Thunderous Roar"),
      spell.cast("Shield Charge")
    );
  }

  useDefensives() {
    return new bt.Selector(
      spell.cast("Ignore Pain", () => Boolean(me.powerByType(PowerType.Rage) >= 90)),
      spell.cast("Shield Block", () => Boolean(this.getAuraRemainingTime("Shield Block") <= 10000)),
      spell.cast("Shield Wall", () => Boolean(me.health.pct <= 30)),
      spell.cast("Last Stand", () => Boolean(me.health.pct <= 30) && !me.hasAura("Shield Wall")),
    );
  }

  aoeRotation() {
    return new bt.Selector(
      spell.cast("Thunder Blast", () => Boolean(this.getAuraRemainingTime("Rend") <= 1000)),
      spell.cast("Thunder Clap", () => Boolean(this.getAuraRemainingTime("Rend") <= 1000)),
      spell.cast("Thunder Blast", () => Boolean(me.hasAura("Violent Outburst") && me.getUnitsAroundCount(8) >= 2 && me.hasAura("Avatar") && me.hasAura("Unstoppable Force"))),
      spell.cast("Thunder Clap", () => Boolean(me.hasAura("Violent Outburst") && me.getUnitsAroundCount(8) >= 4 && me.hasAura("Avatar") && me.hasAura("Unstoppable Force") && me.hasAura("Crashing Thunder"))),
      spell.cast("Thunder Clap", () => Boolean(me.hasAura("Violent Outburst") && me.getUnitsAroundCount(8) > 6 && me.hasAura("Avatar") && me.hasAura("Unstoppable Force"))),
      spell.cast("Revenge", () => Boolean(me.powerByType(PowerType.Rage) >= 70 && me.hasAura("Seismic Reverberation") && me.getUnitsAroundCount(8) >= 3)),
      spell.cast("Shield Slam", () => Boolean(me.powerByType(PowerType.Rage) <= 60 || me.hasAura("Violent Outburst") && me.getUnitsAroundCount(8) <= 4 && me.hasAura("Crashing Thunder"))),
      spell.cast("Thunder Blast"),
      spell.cast("Thunder Clap"),
      spell.cast("Revenge", () => Boolean(me.powerByType(PowerType.Rage) >= 30 || me.powerByType(PowerType.Rage) >= 40 && me.hasAura("Barbaric Training")))
    );
  }

  genericRotation() {
    return new bt.Selector(
      spell.cast("Thunder Blast", () => Boolean(me.getAuraStacks("Thunder Blast") === 2 && me.getAuraStacks("Burst of Power") <= 1 && me.hasAura("Avatar") && me.hasAura("Unstoppable Force"))),
      spell.cast("Shield Slam", () => Boolean(me.getAuraStacks("Burst of Power") === 2 && me.getAuraStacks("Thunder Blast") <= 1 || me.hasAura("Violent Outburst") || me.powerByType(PowerType.Rage) <= 70 && !me.hasAura("Lightning Strikes"))),
      spell.cast("Execute", () => Boolean(me.powerByType(PowerType.Rage) >= 70 || me.powerByType(PowerType.Rage) >= 40 && spell.getCooldown("Shield Slam").remaining && !me.hasAura("Lightning Strikes") || me.powerByType(PowerType.Rage) >= 50 && spell.getCooldown("Shield Slam").remaining || me.hasAura("Sudden Death") && me.hasAura("Sudden Death"))),
      spell.cast("Shield Slam"),
      spell.cast("Thunder Blast", () => Boolean(this.getAuraRemainingTime("Rend") <= 2 && !me.hasAura("Violent Outburst"))),
      spell.cast("Thunder Blast"),
      spell.cast("Thunder Clap", () => Boolean(this.getAuraRemainingTime("Rend") <= 2 && !me.hasAura("Violent Outburst"))),
      spell.cast("Thunder Blast", () => Boolean(me.getUnitsAroundCount(8) >= 1 || spell.getCooldown("Shield Slam").remaining && !me.hasAura("Violent Outburst"))),
      spell.cast("Thunder Clap", () => Boolean(me.getUnitsAroundCount(8) >= 1 || spell.getCooldown("Shield Slam").remaining && !me.hasAura("Violent Outburst"))),
      //spell.cast("Revenge", () => Boolean(me.powerByType(PowerType.Rage) >= 80 && me.targetUnit.health.pct > 20 || me.hasAura("Revenge") && me.targetUnit.health.pct <= 20 && me.powerByType(PowerType.Rage) <= 18 && spell.getCooldown("Shield Slam").remaining || me.hasAura("Revenge") && me.targetUnit.health.pct > 20 || me.powerByType(PowerType.Rage) >= 80 && me.targetUnit.health.pct > 35 || me.hasAura("Revenge") && me.targetUnit.health.pct <= 35 && me.powerByType(PowerType.Rage) <= 18 && spell.getCooldown("Shield Slam").remaining || me.hasAura("Revenge") && me.targetUnit.health.pct > 35 && me.hasAura("Massacre"))),
      spell.cast("Execute"),
      spell.cast("Revenge"),
      spell.cast("Thunder Blast", () => Boolean(me.getUnitsAroundCount(8) >= 1 || spell.getCooldown("Shield Slam").remaining && me.hasAura("Violent Outburst"))),
      spell.cast("Thunder Clap", () => Boolean(me.getUnitsAroundCount(8) >= 1 || spell.getCooldown("Shield Slam").remaining && me.hasAura("Violent Outburst"))),
      spell.cast("Devastate")
    );
  }

  shouldUseLastStand() {
    return (
      (me.targetUnit.health.pct >= 90 && me.hasTalent("Unnerving Focus")) ||
      (me.targetUnit.health.pct <= 20 && me.hasTalent("Unnerving Focus")) ||
      me.hasAura("Bolster") ||
      me.health.pct <= 30
    );
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

  timeToAdds() {
    return 9999;
  }
}