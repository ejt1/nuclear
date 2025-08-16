import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import spell from "@/Core/Spell";
import objMgr, { me } from "@/Core/ObjectManager";
import { defaultCombatTargeting as Combat } from "@/Targeting/CombatTargeting";
import Specialization from "@/Enums/Specialization";
import common from "@/Core/Common";
import Pet from "@/Core/Pet";
import Settings from "@/Core/Settings";
import { PowerType } from "@/Enums/PowerType";

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
  trollbaneChainsOfIce: 444826,
  festeringScythe: 458123,
  legionOfSouls: 383269,
  rottenTouch: 390275,
}

export class DeathKnightUnholy extends Behavior {
  name = "Death Knight (Unholy) PVE";
  context = BehaviorContext.Any; // PvP or PvE
  specialization = Specialization.DeathKnight.Unholy
  static settings = [
  ];

  build() {
    return new bt.Selector(
      common.waitForNotSitting(),
      common.waitForNotMounted(),
      common.waitForCastOrChannel(),
      common.waitForTarget(),
      common.waitForFacing(),
      spell.cast("Raise Ally", on => objMgr.objects.get(wow.GameUI.mouseoverGuid), req => this.mouseoverIsDeadFriend()),
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
            ret => me.target && me.isWithinMeleeRange(me.target) && me.getEnemies(12).length >= 2,
            this.aoeDamage()
          ),
          this.singleTargetDamage()
        )
      )
    );
  }

  // CD Priority - Cooldown usage priority
  cooldownPriority() {
    return new bt.Selector(
      // Cast Legion of Souls
      spell.cast("Army of the Dead", ret => true),
      // Cast Rune Strike if we have fewer than 4 festering wounds after Legion of Souls during burst
      spell.cast("Rune Strike", on => me.target, ret => me.target && me.targetUnit.getAuraStacks(auras.festeringWound) < 4),
      // Cast Apocalypse - moved from rotation priorities
      spell.cast("Apocalypse", on => me.target, ret => me.target && me.targetUnit.getAuraStacks(auras.festeringWound) >= 4),
      // Cast Apocalypse the target with the lowest Festering Wounds (AoE)
      spell.cast("Apocalypse", on => this.findTargetWithLeastWounds(), ret => this.findTargetWithLeastWounds() !== undefined),
      // Cast Unholy Assault
      spell.cast("Unholy Assault", ret => true),
      // Use Tempered Potion (or any other damage potion) - placeholder for future implementation
      // Use Cursed Stone Idol (or any other stat trinket) - placeholder for future implementation
      this.useTrinkets(),
    );
  }

  // Base Priority - Single Target Damage rotation
  singleTargetDamage() {
    return new bt.Selector(
      // Follow the cooldown priority below if any of your cooldowns are ready
      new bt.Decorator(
        ret => this.hasCooldownsReady(),
        this.cooldownPriority()
      ),
      // Cast Outbreak if no Virulent Plague or if Apocalypse has >7s left on its CD and Virulent Plague is not up
      spell.cast("Outbreak", on => me.target, ret => this.shouldCastOutbreak() || this.shouldCastOutbreakForApocalypse()),
      // Cast Scourge Strike if Trollbane's Chains of Ice is up
      spell.cast("Scourge Strike", on => this.findTargetWithTrollbaneChainsOfIce(), ret => this.findTargetWithTrollbaneChainsOfIce() !== undefined),
      // Cast Festering Scythe if it procs
      spell.cast("Festering Scythe", on => me.target, ret => me.hasAura(auras.festeringScythe)),
      // Cast Soul Reaper if the target is going to be <35% hp in <5 seconds
      spell.cast("Soul Reaper", on => me.target, ret => me.target && me.targetUnit.pctHealth <= 35),
      // Cast Death Coil if you have >80 Runic Power, or Sudden Doom is up
      spell.cast("Death Coil", on => me.target, ret => me.power > 80 || me.hasAura(auras.suddenDoom)),
      // Cast Rune Strike if target has less than 2 festering wounds
      spell.cast("Rune Strike", on => me.target, ret => me.target && me.targetUnit.getAuraStacks(auras.festeringWound) < 2),
      // Cast Scourge Strike if Rotten Touch is active and you have any Festering Wounds
      spell.cast("Scourge Strike", on => me.target, ret => me.hasAura(auras.rottenTouch) && me.target && me.targetUnit.getAuraStacks(auras.festeringWound) > 0),
      // Cast Festering Strike if you have 2 or fewer Festering Wounds
      spell.cast("Rune Strike", on => me.target, ret => me.target && me.targetUnit.getAuraStacks(auras.festeringWound) <= 2),
      // Cast Scourge Strike if Plaguebringer is not active
      spell.cast("Scourge Strike", on => me.target, ret => !me.hasAura(auras.plagueBringer)),
      // Cast Death Coil if Death Rot is about to expire
      spell.cast("Death Coil", on => me.target, ret => this.isDeathRotAboutToExpire()),
      // Cast Scourge Strike if you have 3 or more Festering Wounds
      spell.cast("Scourge Strike", on => me.target, ret => me.target && me.targetUnit.getAuraStacks(auras.festeringWound) >= 3),
      // Cast Death Coil
      spell.cast("Death Coil", on => me.target, ret => me.power >= 40),
    );
  }

  // AoE Damage - Combined Build and Burst Priority
  aoeDamage() {
    return new bt.Selector(
      // Follow the cooldown priority if any cooldowns are ready
      new bt.Decorator(
        ret => this.hasCooldownsReady(),
        this.cooldownPriority()
      ),
      // Cast Festering Scythe if it procs
      spell.cast("Festering Scythe", on => me.target, ret => me.hasAura(auras.festeringScythe)),
      // Cast Scourge Strike if Trollbane's Chains of Ice is up
      spell.cast("Scourge Strike", on => this.findTargetWithTrollbaneChainsOfIce(), ret => this.findTargetWithTrollbaneChainsOfIce() !== undefined),
      // Use trinkets during burst windows
      new bt.Decorator(
        ret => this.shouldUseBurstPriority(),
        this.useTrinkets()
      ),
      // Cast Scourge Strike if Plaguebringer is about to expire or is not active
      spell.cast("Scourge Strike", on => me.target, ret => !me.hasAura(auras.plagueBringer) || this.isPlaguebringerAboutToExpire()),
      // Cast Outbreak if no Virulent Plague or if Apocalypse has >7s left on its CD and Virulent Plague is not on every target
      spell.cast("Outbreak", on => me.target, ret => this.shouldCastOutbreak() || this.shouldCastOutbreakForApocalypse()),
      // Cast Death Coil if Sudden Doom is up
      spell.cast("Death Coil", on => me.target, ret => me.hasAura(auras.suddenDoom)),
      // Cast Rune Strike if target has less than 2 festering wounds
      spell.cast("Rune Strike", on => me.target, ret => me.target && me.targetUnit.getAuraStacks(auras.festeringWound) < 2),
      // Cast Death Coil if you have 4 or fewer Runes, or Sudden Doom is up
      spell.cast("Death Coil", on => me.target, ret => me.powerByType(PowerType.Runes) <= 4 || me.hasAura(auras.suddenDoom)),
      // Cast Death and Decay if it is not already active
      spell.cast("Death and Decay", ret => !me.hasAura(auras.deathAndDecay)),
      // Cast Scourge Strike if any targets have Festering Wounds
      spell.cast("Scourge Strike", on => this.findTargetWithFesteringWounds(), ret => this.findTargetWithFesteringWounds() !== undefined),
      // Cast Death Coil if no targets have Festering Wounds
      spell.cast("Death Coil", on => me.target, ret => this.enemiesWithFesteringWoundsCount() === 0),
      // Cast Scourge Strike
      spell.cast("Scourge Strike", on => me.target, ret => me.target),
      // Cast Death Coil
      spell.cast("Death Coil", on => me.target, ret => me.power >= 40),
      // Cast Festering Strike the target with the least Festering Wounds
      spell.cast("Rune Strike", on => this.findTargetWithLeastWounds(), ret => this.findTargetWithLeastWounds() !== undefined),
    );
  }

  mouseoverIsDeadFriend() {
    const mouseover = objMgr.objects.get(wow.GameUI.mouseoverGuid);
    if (mouseover && mouseover instanceof wow.CGUnit) {
      return mouseover.deadOrGhost &&
        !mouseover.canAttack &&
        mouseover.guid !== me.guid &&
        me.withinLineOfSight(mouseover);
    }
    return false;
  }


  findTargetWithTrollbaneChainsOfIce() {
    const enemies = me.getEnemies(8);

    for (const enemy of enemies) {
      const chainsOfIce = enemy.getAuraByMe(auras.trollbaneChainsOfIce);
      if (me.isFacing(enemy) && chainsOfIce) {
        return enemy;
      }
    }

    return undefined
  }

  enemiesWithFesteringWoundsCount() {
    const enemies = me.getEnemies(8);
    let count = 0;

    for (const enemy of enemies) {
      const festeringWounds = enemy.getAuraByMe(auras.festeringWound);
      if (me.isFacing(enemy) && festeringWounds && festeringWounds.stacks > 0) {
        count++;
      }
    }

    return count;
  }

  useTrinkets() {
    return new bt.Selector(
      common.useEquippedItemByName("Mark of Khardros"),
    );
  }

  shouldCastOutbreak() {
    if (!me.target) {
      return false;
    }
    // Only check for Virulent Plague - the main DoT applied by Outbreak in current patch
    return !me.targetUnit.hasAuraByMe(auras.virulentPlague);
  }

  shouldCastOutbreakForApocalypse() {
    if (!me.target) {
      return false;
    }
    // Cast Outbreak if Apocalypse has >7s left on its CD and Virulent Plague is not up
    const apocalypseCooldown = spell.getCooldown("Apocalypse");
    return apocalypseCooldown && apocalypseCooldown.timeleft > 7000 && !me.targetUnit.hasAuraByMe(auras.virulentPlague);
  }

  hasCooldownsReady() {
    // Check if any major cooldowns are ready and burst toggle is enabled
    return Combat.burstToggle && (
      !spell.isOnCooldown("Legion of Souls") ||
      !spell.isOnCooldown("Apocalypse") ||
      !spell.isOnCooldown("Unholy Assault")
    );
  }

  isDeathRotAboutToExpire() {
    if (!me.target) {
      return false;
    }

    const deathRot = me.target.getAuraByMe(auras.deathRot);
    return !!(deathRot && deathRot.remaining < 2000);
  }

  shouldUseBurstPriority() {
    // Follow the Burst priority if Death and Decay or Legion of Souls is active
    return me.hasAura(auras.deathAndDecay) || me.hasAura(auras.legionOfSouls);
  }

  // Consolidated target finding method
  findTargetByWoundCriteria(criteria) {
    const enemies = me.getEnemies(8);
    let bestTarget = undefined;
    let bestValue = criteria === 'most' ? 0 : 999;

    for (const enemy of enemies) {
      if (!me.isFacing(enemy)) continue;

      const festeringWounds = enemy.getAuraByMe(auras.festeringWound);
      const woundCount = festeringWounds ? festeringWounds.stacks : 0;
      const chainsOfIce = enemy.getAuraByMe(auras.trollbaneChainsOfIce);

      switch (criteria) {
        case 'most':
          if (woundCount > bestValue) {
            bestTarget = enemy;
            bestValue = woundCount;
          }
          break;
        case 'least':
          if (woundCount < bestValue) {
            bestTarget = enemy;
            bestValue = woundCount;
          }
          break;
        case 'trollbane':
          if (chainsOfIce) return enemy;
          break;
        case 'any_wounds':
          if (woundCount > 0) return enemy;
          break;
      }
    }

    return bestTarget;
  }

  findTargetWithLeastWounds() {
    return this.findTargetByWoundCriteria('least');
  }

  findTargetWithFesteringWounds() {
    return this.findTargetByWoundCriteria('any_wounds');
  }

  isPlaguebringerAboutToExpire() {
    const plaguebringer = me.getAura(auras.plagueBringer);
    return !!(plaguebringer && plaguebringer.remaining < 3000);
  }
}
