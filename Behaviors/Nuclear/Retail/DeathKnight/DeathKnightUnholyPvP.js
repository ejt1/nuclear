import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { defaultCombatTargeting as Combat } from "@/Targeting/CombatTargeting";
import Specialization from "@/Enums/Specialization";
import common from "@/Core/Common";

const auras = {
  darkSuccor: 101568,
  chainsOfIce: 45524,
  festeringWound: 194310,
  deathAndDecay: 188290,
  suddenDoom: 81340,
  virulentPlague: 191587,
}

export class DeathKnightUnholy extends Behavior {
  name = "Death Knight (Unholy) PvP";
  context = BehaviorContext.Any; // PvP or PvE
  specialization = Specialization.DeathKnight.Unholy
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForNotWaitingForArenaToStart(),
        common.waitForNotSitting(),
        common.waitForNotMounted(),
        common.waitForCastOrChannel(),
        spell.interrupt("Mind Freeze", true),
        spell.interrupt("Leap", true),
        common.waitForTarget(),
        spell.cast("Claw"),
        common.waitForFacing(),
        spell.cast("Death Strike", ret => me.pctHealth < 95 && me.hasAura(auras.darkSuccor)),
        spell.cast("Death Strike", ret => me.pctHealth < 45 && me.power > 55),
        spell.interrupt("Gnaw", true),
        new bt.Decorator(
          ret => Combat.burstToggle,
          this.burstDamage()
        ),
        this.sustainedDamage(),
      )
    );
  }

  // Merged Burst Damage
  burstDamage() {
    return new bt.Selector(
      spell.cast("Army of the Dead", ret => true),
      //spell.cast("Chains of Ice", on => me.target, ret => me.target && me.targetUnit.isPlayer() && !me.targetUnit.hasAura(auras.chainsOfIce)),
      spell.cast("Summon Gargoyle", ret => true),
      spell.cast("Abomination Limb", ret => true),
      spell.cast("Unholy Assault", ret => true),
      spell.cast("Apocalypse", ret => true, ret => me.target && me.targetUnit.getAuraStacks(auras.festeringWound) >= 4),
      //spell.cast("Death and Decay", ret => this.shouldDeathAndDecay()),
      spell.cast("Dark Transformation", ret => true),
      spell.cast("Death Coil", on => me.target, ret => this.shouldDeathCoil(90) && me.targetUnit.hasAura(auras.festeringWound) >= 3 && this.apocalypseOnCooldown()),
      spell.cast("Scourge Strike", on => me.target, ret => me.target && me.targetUnit.hasAura(auras.festeringWound) && this.apocalypseOnCooldown()),
      spell.cast("Death Coil", on => me.target, ret => this.shouldDeathCoil(60) && (this.apocalypseOnCooldown() || me.getReadyRunes() < 2)),
      spell.cast("Festering Strike", on => me.target, ret => me.target && me.targetUnit.getAuraStacks(auras.festeringWound) < 5),
    );
  }

  // Sustained Damage
  sustainedDamage() {
    return new bt.Selector(
      //spell.cast("Chains of Ice", on => me.target, ret => me.target && me.targetUnit.isPlayer() && !me.targetUnit.hasAura(auras.chainsOfIce)),
      spell.cast("Outbreak", on => me.target, ret => me.target && !me.targetUnit.hasAura(auras.virulentPlague)),
      //spell.cast("Death and Decay", ret => this.shouldDeathAndDecay()),
      spell.cast("Festering Strike", on => me.target, ret => me.target && me.targetUnit.getAuraStacks(auras.festeringWound) < 5),
      spell.cast("Scourge Strike", on => me.target, ret => me.target && me.targetUnit.hasAura(auras.festeringWound)),
      spell.cast("Death Coil", on => me.target, ret => this.shouldDeathCoil(60))
    );
  }

  shouldDeathCoil(minPowerForCoil) {
    return me.power > minPowerForCoil || (me.power > (minPowerForCoil - 20) && me.hasAura(auras.suddenDoom));
  }

  shouldDeathAndDecay() {
    me.targetUnit && me.isWithinMeleeRange(me.targetUnit) && !me.hasAura(auras.deathAndDecay)
  }

  apocalypseOnCooldown() {
    const apocalypse = wow.SpellBook.getSpellByName("Apocalypse");
    return apocalypse && apocalypse.cooldown.duration > 0;
  }
}
