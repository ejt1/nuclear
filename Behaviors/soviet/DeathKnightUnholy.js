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
  trollbaneChainsOfIce: 444826, // untested
  festeringScythe: 458123,
}

export class DeathKnightUnholy extends Behavior {
  name = "Death Knight (Unholy) PVE";
  context = BehaviorContext.Any; // PvP or PvE
  specialization = Specialization.DeathKnight.Unholy
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
            ret => Combat.burstToggle && me.target && me.isWithinMeleeRange(me.target),
            this.burstDamage()
          ),
          new bt.Decorator(
            ret => me.target && me.isWithinMeleeRange(me.target) && me.getEnemies(12).length >= 2,
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
      // actions.st=soul_reaper,if=target.health.pct<=35
      spell.cast("Soul Reaper", on => me.target, ret => me.target && me.targetUnit.pctHealth <= 35 && this.canSpendRunes()),
      // actions.st+=/wound_spender,if=debuff.chains_of_ice_trollbane_slow.up
      spell.cast("Outbreak", on => me.target, ret => this.shouldCastOutbreak()),
      spell.cast("Scourge Strike", on => this.findTargetWithTrollbaneChainsOfIce(), ret => this.findTargetWithTrollbaneChainsOfIce() !== undefined && this.canSpendRunes()),
      // actions.st+=/any_dnd,if=talent.unholy_ground&!buff.death_and_decay.up&(pet.apoc_ghoul.active|pet.abomination.active|pet.gargoyle.active)
      spell.cast("Death and Decay", ret => !me.hasAura(auras.deathAndDecay) && this.hasMagusOfTheDead()),
      // actions.st+=/death_coil,if=!variable.pooling_runic_power&variable.spend_rp|fight_remains<10
      spell.cast("Death Coil", on => me.target, ret => this.shouldDeathCoil(80) || me.hasVisibleAura(auras.suddenDoom)),
      // actions.st+=/festering_strike,if=debuff.festering_wound.stack<4&(!variable.pop_wounds|buff.festering_scythe.react)
      spell.cast("Rune Strike", on => this.findTargetWithLessThan2Wounds(), ret => this.findTargetWithLessThan2Wounds() !== undefined && (me.hasVisibleAura(auras.festeringScythe) || me.targetUnit.getAuraStacks(auras.festeringWound) < 4)),
      // actions.st+=/wound_spender,if=debuff.festering_wound.stack>=1&cooldown.unholy_assault.remains<20&talent.unholy_assault
      spell.cast("Scourge Strike", on => this.findTargetWithMostWounds(), ret => this.findTargetWithMostWounds() !== undefined && this.canSpendRunes()),
      // actions.st+=/death_coil,if=!variable.pooling_runic_power
      spell.cast("Death Coil", on => me.target, ret => this.shouldDeathCoil(80)),
      // actions.st+=/wound_spender,if=!variable.pop_wounds&debuff.festering_wound.stack>=4
      spell.cast("Scourge Strike", on => this.findTargetWithAtLeast2Wounds(), ret => this.findTargetWithAtLeast2Wounds() !== undefined && me.targetUnit.getAuraStacks(auras.festeringWound) >= 4 && this.canSpendRunes()),
    );
  }

  // Sustained Damage
  aoeDamage() {
    return new bt.Selector(
      //actions.cds_aoe+=/outbreak,if=dot.virulent_plague.ticks_remain<5&dot.virulent_plague.refreshable&(!talent.unholy_blight|talent.unholy_blight&cooldown.dark_transformation.remains)&(!talent.raise_abomination|talent.raise_abomination&cooldown.raise_abomination.remains)
      spell.cast("Outbreak", on => me.target, ret => this.shouldCastOutbreak()),
      new bt.Decorator(
        ret => me.target && me.isWithinMeleeRange(me.target) && me.getEnemies(12).length >= 2 && (me.hasAura(auras.deathAndDecay) || this.enemiesWithFesteringWoundsCount() >= 3),
        this.aoeBurst()
      ),
      new bt.Decorator(
        ret => me.target && me.isWithinMeleeRange(me.target) && me.getEnemies(12).length >= 2 && !me.hasAura(auras.deathAndDecay) && spell.getCooldown("Death and Decay").timeleft < 10,
        this.aoeSetup()
      ),
      // actions.aoe=festering_strike,if=buff.festering_scythe.react
      spell.cast("Rune Strike", on => me.target, ret => me.target && me.hasAura(auras.festeringScythe)),
      // actions.aoe+=/wound_spender,target_if=max:debuff.festering_wound.stack,if=debuff.festering_wound.stack>=1&buff.death_and_decay.up&talent.bursting_sores&cooldown.apocalypse.remains>variable.apoc_timing
      spell.cast("Scourge Strike", on => this.findTargetWithMostWounds(), ret => this.findTargetWithMostWounds() !== undefined && me.hasAura(auras.deathAndDecay) && me.hasAura("Bursting Sores") && this.canSpendRunes()),
      // actions.aoe+=/death_coil,if=!variable.pooling_runic_power&active_enemies<variable.epidemic_targets
      spell.cast("Death Coil", on => me.target, ret => me.getEnemies(12).length < 3),
      // actions.aoe+=/epidemic,if=!variable.pooling_runic_power
      spell.cast("Epidemic", on => me.target, ret => true),
      // actions.aoe+=/wound_spender,target_if=debuff.chains_of_ice_trollbane_slow.up
      spell.cast("Scourge Strike", on => this.findTargetWithTrollbaneChainsOfIce(), ret => this.findTargetWithTrollbaneChainsOfIce() !== undefined && this.canSpendRunes()),
      // actions.aoe+=/festering_strike,target_if=max:debuff.festering_wound.stack,if=cooldown.apocalypse.remains<variable.apoc_timing|buff.festering_scythe.react
      spell.cast("Rune Strike", on => this.findTargetWithMostWounds(), ret => this.findTargetWithMostWounds() !== undefined && me.hasVisibleAura(auras.festeringScythe)),
      // actions.aoe+=/festering_strike,target_if=min:debuff.festering_wound.stack,if=debuff.festering_wound.stack<2
      spell.cast("Rune Strike", on => this.findTargetWithLessThan2Wounds(), ret => this.findTargetWithLessThan2Wounds() !== undefined),
      // actions.aoe+=/wound_spender,target_if=max:debuff.festering_wound.stack,if=debuff.festering_wound.stack>=1&cooldown.apocalypse.remains>gcd|buff.vampiric_strike.react&dot.virulent_plague.ticking
      spell.cast("Scourge Strike", on => this.findTargetWithMostWounds(), ret => this.findTargetWithMostWounds() !== undefined && this.canSpendRunes()),
    );
  }

  aoeSetup() {
    return new bt.Selector(
      // actions.aoe_setup=festering_strike,if=buff.festering_scythe.react
      spell.cast("Rune Strike", on => me.target, ret => me.target && me.hasAura(auras.festeringScythe)),
      // actions.aoe_setup+=/any_dnd,if=!death_and_decay.ticking&(!talent.bursting_sores&!talent.vile_contagion|death_knight.fwounded_targets=active_enemies|death_knight.fwounded_targets>=8|raid_event.adds.exists&raid_event.adds.remains<=11&raid_event.adds.remains>5|!buff.death_and_decay.up&talent.defile)
      spell.cast("Death and Decay", ret => !me.hasAura(auras.deathAndDecay)),
      // actions.aoe_setup+=/wound_spender,target_if=debuff.chains_of_ice_trollbane_slow.up
      spell.cast("Scourge Strike", on => this.findTargetWithTrollbaneChainsOfIce(), ret => this.findTargetWithTrollbaneChainsOfIce() !== undefined && this.canSpendRunes()),
      // actions.aoe_setup+=/festering_strike,target_if=min:debuff.festering_wound.stack,if=!talent.vile_contagion
      spell.cast("Rune Strike", on => this.findTargetWithLessThan2Wounds(), ret => this.findTargetWithLessThan2Wounds() !== undefined),
      // actions.aoe_setup+=/festering_strike,target_if=max:debuff.festering_wound.stack,if=cooldown.vile_contagion.remains<5|death_knight.fwounded_targets=active_enemies&debuff.festering_wound.stack<=4
      spell.cast("Rune Strike", on => this.findTargetWithMostWounds(), ret => this.findTargetWithMostWounds() !== undefined && this.enemiesWithFesteringWoundsCount() === me.getEnemies(12).length),
      // actions.aoe_setup+=/death_coil,if=!variable.pooling_runic_power&buff.sudden_doom.react&active_enemies<variable.epidemic_targets
      spell.cast("Death Coil", on => me.target, ret => me.hasAura(auras.suddenDoom) && me.getEnemies(12).length < 3),
      // actions.aoe_setup+=/epidemic,if=!variable.pooling_runic_power&buff.sudden_doom.react
      spell.cast("Epidemic", on => me.target, ret => me.hasAura(auras.suddenDoom)),
      // actions.aoe_setup+=/festering_strike,target_if=min:debuff.festering_wound.stack,if=cooldown.apocalypse.remains<gcd&debuff.festering_wound.stack=0|death_knight.fwounded_targets<active_enemies
      spell.cast("Rune Strike", on => this.findTargetWithLessThan2Wounds(), ret => this.findTargetWithLessThan2Wounds() !== undefined && this.enemiesWithFesteringWoundsCount() < me.getEnemies(12).length),
      // actions.aoe_setup+=/death_coil,if=!variable.pooling_runic_power&active_enemies<variable.epidemic_targets
      spell.cast("Death Coil", on => me.target, ret => me.getEnemies(10).length < 3),
      // actions.aoe_setup+=/epidemic,if=!variable.pooling_runic_power
      spell.cast("Epidemic", on => me.target, ret => true),
    );
  }

  aoeBurst() {
    return new bt.Selector(
      // actions.aoe=festering_strike,if=buff.festering_scythe.react
      spell.cast("Rune Strike", on => me.target, ret => me.target && me.hasAura(auras.festeringScythe)),
      // actions.aoe+=/wound_spender,target_if=max:debuff.festering_wound.stack,if=debuff.festering_wound.stack>=1&buff.death_and_decay.up&talent.bursting_sores
      spell.cast("Scourge Strike", on => this.findTargetWithMostWounds, ret => this.findTargetWithMostWounds() !== undefined && me.hasAura(auras.deathAndDecay) && this.canSpendRunes()),
      // actions.aoe+=/death_coil,if=!variable.pooling_runic_power&active_enemies<variable.epidemic_targets
      //spell.cast("Death Coil", on => me.target, ret => me.getUnitsAroundCount(8) < 3),
      // actions.aoe+=/epidemic,if=!variable.pooling_runic_power
      spell.cast("Epidemic", on => me.target, ret => true),
      // actions.aoe+=/wound_spender,target_if=debuff.chains_of_ice_trollbane_slow.up
      spell.cast("Scourge Strike", on => this.findTargetWithTrollbaneChainsOfIce(), ret => this.findTargetWithTrollbaneChainsOfIce() !== undefined && this.canSpendRunes()),
      // actions.aoe+=/festering_strike,target_if=max:debuff.festering_wound.stack,if=cooldown.apocalypse.remains<variable.apoc_timing|buff.festering_scythe.react
      spell.cast("Rune Strike", on => this.findTargetWithMostWounds(), ret => this.findTargetWithMostWounds() !== undefined && this.apocalypseOnCooldown()),
      // actions.aoe+=/festering_strike,target_if=min:debuff.festering_wound.stack,if=debuff.festering_wound.stack<2
      spell.cast("Rune Strike", on => this.findTargetWithLessThan2Wounds(), ret => this.findTargetWithLessThan2Wounds() !== undefined),
      // actions.aoe+=/wound_spender,target_if=max:debuff.festering_wound.stack,if=debuff.festering_wound.stack>=1&cooldown.apocalypse.remains>gcd|buff.vampiric_strike.react&dot.virulent_plague.ticking
      spell.cast("Scourge Strike", on => this.findTargetWithMostWounds(), ret => this.findTargetWithMostWounds() !== undefined && this.canSpendRunes()),
    );
  }

  // can spend runes if festeringScythe aura has less than 19 stacks and we have at least 2 runes
  canSpendRunes() {
    const fsStacks = me.getAuraStacks(459238);
    const runes = me.powerByType(PowerType.Runes);

    if (fsStacks !== undefined && fsStacks >= 18 && runes <= 2) {
      return false;
    }
    return true;
  }

  // epidemic targets return 4 if has Improved Death Coil, otherwise 3
  epidemicTargets() {
    return me.hasAura(377580) ? 4 : 3;
  }

  findTargetWithLessThan2Wounds() {
    const enemies = me.getEnemies(8);

    for (const enemy of enemies) {
      const festeringWounds = enemy.getAuraByMe(auras.festeringWound);
      if (me.isFacing(enemy) && (!festeringWounds || festeringWounds.stacks <= 1)) {
        return enemy;
      }
    }

    return undefined
  }

  findTargetWithAtLeast2Wounds() {
    const enemies = me.getEnemies(8);

    for (const enemy of enemies) {
      const festeringWounds = enemy.getAuraByMe(auras.festeringWound);
      if (me.isFacing(enemy) && festeringWounds && festeringWounds.stacks > 2) {
        return enemy;
      }
    }

    return undefined
  }

  hasMagusOfTheDead() {
    let hasMagus = false;
    objMgr.objects.forEach(obj => {
      if (obj instanceof wow.CGUnit &&
        obj.unsafeName === "Magus of the Dead" &&
        ((obj.createdBy && obj.createdBy.equals(me.guid)) ||
          (obj.demonCreator && obj.demonCreator.equals(me.guid)))) {
        hasMagus = true;
        return false;
      }
    });
    return hasMagus;
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

  findTargetWithMostWounds() {
    const enemies = me.getEnemies(8);
    let targetWithMostWounds = undefined;
    let maxWounds = 0;

    for (const enemy of enemies) {
      const festeringWounds = enemy.getAuraByMe(auras.festeringWound);
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
    return !me.targetUnit.hasAuraByMe(auras.virulentPlague) || !me.targetUnit.hasAuraByMe(auras.bloodPlague) || !me.targetUnit.hasAuraByMe(auras.frostFever);
  }

  isDeathRotAboutToExpire() {
    if (!me.target) {
      return false;
    }

    const deathRot = me.target.getAuraByMe(auras.deathRot);
    return !!(deathRot && deathRot.remaining < 2000);

  }
}
