import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { defaultCombatTargeting as Combat } from "@/Targeting/CombatTargeting";
import Specialization from "@/Enums/Specialization";
import common from "@/Core/Common";

const auras = {
  chainsOfIce: 45524,
  festeringWound: 194310,
  deathAndDecay: 188290,
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
        common.waitForTarget(),
        common.waitForFacing(),
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
      spell.cast("Army of the Dead", ret => !me.hasAura("Army of the Dead")),
      spell.cast("Chains of Ice", on => me.target, ret => me.target && !me.targetUnit.hasAura(auras.chainsOfIce)),
      spell.cast("Dark Transformation", ret => true),
      spell.cast("Summon Gargoyle", ret => true),
      spell.cast("Death and Decay", ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit) && !me.hasAura(auras.deathAndDecay)),
      spell.cast("Abomination Limb", ret => true),
      spell.cast("Unholy Assault", ret => true),
      spell.cast("Apocalypse", ret => true),
      spell.cast("Scourge Strike", on => me.target, ret => me.target && me.targetUnit.hasAura(auras.festeringWound)),
      spell.cast("Death Coil", on => me.target, ret => me.power > 60),
      spell.cast("Festering Strike", on => me.target, ret => me.target && me.targetUnit.getAuraStacks(auras.festeringWound) < 5)
    );
  }

  // Sustained Damage
  sustainedDamage() {
    return new bt.Selector(
      spell.cast("Chains of Ice", on => me.target, ret => me.target && !me.targetUnit.hasAura(auras.chainsOfIce)),
      spell.cast("Outbreak", on => me.target, ret => me.target && !me.targetUnit.hasAura("Virulent Plague")),
      spell.cast("Festering Strike", on => me.target, ret => me.target && me.targetUnit.getAuraStacks(auras.festeringWound) < 5),
      spell.cast("Death and Decay", ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit) && !me.hasAura(auras.deathAndDecay)),
      spell.cast("Scourge Strike", on => me.target, ret => me.target && me.targetUnit.hasAura(auras.festeringWound)),
      spell.cast("Death Coil", on => me.target, ret => me.power > 60)
    );
  }
}
