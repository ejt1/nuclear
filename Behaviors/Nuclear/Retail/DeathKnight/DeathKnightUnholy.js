import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { defaultCombatTargeting as Combat } from "@/Targeting/CombatTargeting";
import Specialization from "@/Enums/Specialization";
import common from "@/Core/Common";
import Pet from "@/Core/Pet";
import Settings from "@/Core/Settings";

const auras = {
  darkSuccor: 101568,
  chainsOfIce: 45524,
  festeringWound: 194310,
  deathAndDecay: 188290,
  suddenDoom: 81340,
  plagueBringer: 390178,
  frostFever: 55095,
  bloodPlague: 55078,
  virulentPlague: 191587,
  deathRot: 377540,
  trollbaneChainsOfIce: 444826, // untested
}

export class DeathKnightUnholy extends Behavior {
  name = "Death Knight (Unholy) PVE";
  context = BehaviorContext.Any; // PvP or PvE
  specialization = Specialization.DeathKnight.Unholy
  version = wow.GameVersion.Retail;
  static settings = [
    {type: "checkbox", uid: "UnholyDKUseSmackyHands", text: "Use Smacky Hands", default: true},
  ];

  build() {
    return new bt.Selector(
      common.waitForNotSitting(),
      common.waitForNotMounted(),
      common.waitForCastOrChannel(),
      common.waitForTarget(),
      common.waitForFacing(),
      spell.cast("Raise Dead", on => me, req => !Pet.current),
      spell.interrupt("Mind Freeze"),
      spell.cast("Claw", on => me.target),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          common.waitForNotWaitingForArenaToStart(),
          common.waitForNotSitting(),
          common.waitForNotMounted(),
          common.waitForCastOrChannel(),
          spell.cast("Death Strike", ret => me.pctHealth < 95 && me.hasAura(auras.darkSuccor)),
          spell.cast("Death Strike", ret => me.pctHealth < 45 && me.power > 55),
          new bt.Decorator(
            ret => Combat.burstToggle && me.target && me.isWithinMeleeRange(me.target),
            this.burstDamage()
          ),
          new bt.Decorator(
            ret => me.target && me.isWithinMeleeRange(me.target) && me.getUnitsAroundCount(8) >= 2,
            this.aoeDamage()
          ),
          this.singleTargetDamage()
        )
      )
    );
  }

  // Merged Burst Damage
  burstDamage() {
    return new bt.Selector(
      spell.cast("Army of the Dead", ret => true),
      this.useTrinkets(),
      spell.cast("Summon Gargoyle", ret => true),
      this.useAbomLimb(),
      spell.cast("Dark Transformation", ret => true),
      spell.cast("Unholy Assault", ret => true),
      spell.cast("Apocalypse", ret => true, ret => me.target && me.targetUnit.getAuraStacks(auras.festeringWound) >= 4),
    );
  }

  // Sustained Damage
  singleTargetDamage() {
    return new bt.Selector(
      spell.cast("Soul Reaper", on => me.target, ret => me.targetUnit.pctHealth < 36 && me.getReadyRunes() > 2),
      spell.cast("Death Coil", on => me.target, ret => this.shouldDeathCoil(60)),
      spell.cast("Outbreak", on => me.target, ret => this.shouldCastOutbreak()),
      spell.cast("Festering Strike", on => me.target, ret => me.target && me.targetUnit.getAuraStacks(auras.festeringWound) < 3),
      spell.cast("Scourge Strike", on => me.target, ret => me.target && !(me.hasAura(auras.plagueBringer))),
      spell.cast("Death and Decay", ret => this.shouldDeathAndDecay()),
      spell.cast("Death Coil", on => me.target, ret => this.isDeathRotAboutToExpire()),
      spell.cast("Scourge Strike", ret => true, ret => me.target && me.targetUnit.getAuraStacks(auras.festeringWound) >= 3),
      spell.cast("Death Coil", on => me.target, ret => this.shouldDeathCoil(60))
    );
  }

  // Sustained Damage
  aoeDamage() {
    return new bt.Selector(
      spell.cast("Scourge Strike", on => me.target, ret => me.target && !(me.hasAura(auras.plagueBringer))),
      spell.cast("Scourge Strike", on => me.target, ret => me.target && me.target.hasAura(auras.trollbaneChainsOfIce)),
      spell.cast("Army of the Dead", ret => true),
      spell.cast("Outbreak", on => me.target, ret => this.shouldCastOutbreak()),
      spell.cast("Epidemic", on => me.target, ret => me.target && me.hasAura(auras.suddenDoom)),
      spell.cast("Unholy Assault", on => this.findTargetWithAtLeast2Wounds(), ret => this.findTargetWithAtLeast2Wounds() !== undefined),
      spell.cast("Vile Contagion", on => this.findTargetWithMostWounds(), ret => this.findTargetWithMostWounds() !== undefined),
      spell.cast("Epidemic", on => me.target, ret => me.target && me.getReadyRunes() < 2),
      spell.cast("Death and Decay", ret => this.shouldDeathAndDecay()),
      spell.cast("Festering Strike", on => this.findTargetWithLessThan2Wounds(), ret => this.findTargetWithLessThan2Wounds() !== undefined),
      this.useTrinkets(),
      spell.cast("Epidemic", on => me.target, ret => !(me.hasAura(auras.deathAndDecay))),
    );
  }

  findTargetWithLessThan2Wounds() {
    const enemies = me.getEnemies(8);

    for (const enemy of enemies) {
      const festeringWounds = enemy.getAura(auras.festeringWound);
      if (me.isFacing(enemy) && (!festeringWounds || festeringWounds.stacks <= 1)) {
        return enemy;
      }
    }

    return undefined
  }

  findTargetWithAtLeast2Wounds() {
    const enemies = me.getEnemies(8);

    for (const enemy of enemies) {
      const festeringWounds = enemy.getAura(auras.festeringWound);
      if (me.isFacing(enemy) && festeringWounds && festeringWounds.stacks > 2) {
        return enemy;
      }
    }

    return undefined
  }

  findTargetWithMostWounds() {
    const enemies = me.getEnemies(8);
    let targetWithMostWounds = undefined;
    let maxWounds = 0;

    for (const enemy of enemies) {
      const festeringWounds = enemy.getAura(auras.festeringWound);
      if (me.isFacing(enemy) && festeringWounds && festeringWounds.stacks > maxWounds) {
        targetWithMostWounds = enemy;
        maxWounds = festeringWounds.stacks;
      }
    }

    return targetWithMostWounds;
  }




  shouldDeathCoil(minPowerForCoil) {
    return me.power > minPowerForCoil || (me.power > (minPowerForCoil - 20) && me.hasAura(auras.suddenDoom));
  }

  shouldDeathAndDecay() {
    return me.targetUnit && me.isWithinMeleeRange(me.targetUnit) && !me.hasAura(auras.deathAndDecay)
  }

  apocalypseOnCooldown() {
    const apocalypse = wow.SpellBook.getSpellByName("Apocalypse");
    return apocalypse && apocalypse.cooldown.duration > 0;
  }

  useTrinkets() {
    return new bt.Selector(
      common.useEquippedItemByName("Mark of Khardros"),
    );
  }

  useAbomLimb() {
    if (Settings.UnholyDKUseSmackyHands === true) {
      return spell.cast("Abomination Limb", on => me, ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit));
    }
    return bt.Status.Failure;
  }

  shouldCastOutbreak() {
    if (!me.target) {
      return false;
    }
    return !me.targetUnit.hasAura(auras.virulentPlague) || !me.targetUnit.hasAura(auras.bloodPlague) || !me.targetUnit.hasAura(auras.frostFever);
  }

  isDeathRotAboutToExpire() {
    if (!me.target) {
      return false;
    }

    const deathRot = me.target.getAura(auras.deathRot);
    return !!(deathRot && deathRot.remaining < 2000);

  }
}
