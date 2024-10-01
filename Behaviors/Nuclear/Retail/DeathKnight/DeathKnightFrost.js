import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from "@/Enums/Specialization";
import common from '@/Core/Common';
import spell from '@/Core/Spell';
import { me } from "@/Core/ObjectManager";
import { defaultCombatTargeting as Combat } from "@/Targeting/CombatTargeting";

const auras = {
  darkSuccor: 101568,
  killingMachine: 51124,
  rime: 59052,
  coldHeart: 281209,
  pillarOfFrost: 51271,
  deathAndDecay: 188290,
  icyTalons: 194879,
  unleashedFrenzy: 376907,
  razorice: 51714,
  frostFever: 55095,
  breathOfSindragosa: 152279,
};

export class DeathKnightFrostBehavior extends Behavior {
  name = "Frost DK PVE";
  context = BehaviorContext.Any; // PVP ?
  specialization = Specialization.DeathKnight.Frost;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Selector(
      common.waitForNotSitting(),
      common.waitForNotMounted(),
      common.waitForCastOrChannel(),
      spell.interrupt("Mind Freeze"),
      common.waitForTarget(),
      common.waitForFacing(),
      common.ensureAutoAttack(),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          spell.cast("Death Strike", ret => me.pctHealth < 95 && me.hasAura(auras.darkSuccor)),
          spell.cast("Death Strike", ret => me.pctHealth < 65 && me.power > 35),
          spell.cast("Frost Strike", ret => this.checkFrostStrikeKeepUpBuffs()),
          spell.cast("Howling Blast", on => me.target, ret => !me.target.hasAuraByMe(auras.frostFever)),
          new bt.Decorator(
            req => this.wantCooldowns() && this.doIKnowSindy() && (this.getSindyCooldown().ready || me.hasAura(auras.breathOfSindragosa)),
            new bt.Selector(
              spell.cast("Abomination Limb", on => me, ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit)),
              spell.cast("Remorseless Winter", on => me, ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit)),
              spell.cast("Rune Strike", ret => me.getReadyRunes() >= 2),
              spell.cast("Reaper's Mark", on => me.targetUnit, ret => spell.isSpellKnown("Reaper's Mark") && me.targetUnit && me.isWithinMeleeRange(me.targetUnit)),
              spell.cast("Pillar of Frost", on => me, ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit)),
              spell.cast("Death and Decay", ret => !(me.hasAura(auras.deathAndDecay))),
              spell.cast("Breath of Sindragosa", ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit)),
              spell.cast("Empower Rune Weapon", on => me, ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit) && me.getReadyRunes() < 3 && me.power < 70),
            )
          ),
          new bt.Decorator(
            req => this.wantCooldowns() && (!(this.doIKnowSindy()) || (this.doIKnowSindy() && (this.getSindyCooldown().timeleft > 45000))),
            new bt.Selector(
              spell.cast("Reaper's Mark", on => me.targetUnit, ret => spell.isSpellKnown("Reaper's Mark") && me.targetUnit && me.isWithinMeleeRange(me.targetUnit)),
              spell.cast("Pillar of Frost", on => me, ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit)),
              spell.cast("Abomination Limb", on => me, ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit)),
              spell.cast("Empower Rune Weapon", on => me, ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit) && me.getReadyRunes() < 5),
            )
          ),
          new bt.Decorator(
            req => this.shouldIDoRegularRotation(),
            new bt.Selector(
              spell.cast("Soul Reaper", on => me.target, ret => me.targetUnit.pctHealth < 40 && me.getReadyRunes() > 2),
              spell.cast("Remorseless Winter", on => me, ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit)),
              this.multiTargetRotation(),
              spell.cast("Rune Strike", ret => me.hasAura(auras.killingMachine)),
              spell.cast("Frost Strike", ret => spell.isSpellKnown('Shattered Frost') && me.targetUnit?.getAura(auras.razorice)?.stacks === 5 || me.getReadyRunes() < 2),
              spell.cast("Glacial Advance", ret => (!spell.isSpellKnown('Shattered Frost')) && me.targetUnit?.getAura(auras.razorice)?.stacks < 5 || me.getReadyRunes() < 2),
              spell.cast("Howling Blast", ret => me.hasAura(auras.rime)),
              spell.cast("Frost Strike", ret => me.power > 45),
              spell.cast("Rune Strike", ret => me.getReadyRunes() >= 2),
              spell.cast("Chains of Ice", on => me.targetUnit, ret => {
                const coldHeart = me.getAura(auras.coldHeart);
                return !!(coldHeart && coldHeart.stacks === 20);
              }),
              spell.cast("Horn of Winter", ret => me.targetUnit && me.power < 70 && me.getReadyRunes() <= 4),
            )
          )
        )
      )
    );
  }

  wantCooldowns() {
    return me.isWithinMeleeRange(me.target) && me.target && Combat.burstToggle;
  }

  multiTargetRotation() {
    return new bt.Selector(
      spell.cast("Frostscythe", on => me, ret => me.getUnitsAroundCount(8) >= 2 && me.targetUnit && me.isWithinMeleeRange(me.targetUnit) && me.isFacing(me.targetUnit) && !me.hasAura(auras.killingMachine)),
      spell.cast("Death and Decay", ret => me.getUnitsAroundCount(10) >= 2 && me.targetUnit && me.isWithinMeleeRange(me.targetUnit) && !me.hasAura(auras.deathAndDecay))
    );
  }

  checkFrostStrikeKeepUpBuffs() {
    if (me.targetUnit && me.isWithinMeleeRange(me.targetUnit)) {
      const icyTalons = me.getAura(auras.icyTalons);
      const unleashedFrenzy = me.getAura(auras.unleashedFrenzy);
      if (icyTalons && unleashedFrenzy && icyTalons.remaining > 2000 && unleashedFrenzy.remaining > 2000) {
        return false;
      }
    }
    return true;
  }

  doIKnowSindy() {
    return spell.isSpellKnown("Breath of Sindragosa");
  }

  getSindyCooldown() {
    return spell.getCooldown("Breath of Sindragosa");
  }

  /**
   * Checks if Breath of Sindragosa is either active or ready/almost ready.
   * @returns {boolean} - Returns true if Breath of Sindragosa is active or its cooldown is ready/almost ready.
   */
  shouldIDoRegularRotation() {
    // Check if Breath of Sindragosa is known
    if (!this.doIKnowSindy() || (this.doIKnowSindy() && !(this.wantCooldowns()))) {
      return true; // If not known, proceed with other abilities
    }

    // Check if the aura is active
    if (me.hasAura(auras.breathOfSindragosa)) {
      return false; // Breath of Sindragosa is active, don't cast other abilities
    }

    // Check if the cooldown is ready or almost ready (less than 10,000 ms remaining)
    const sindyCooldown = this.getSindyCooldown();
    if (sindyCooldown.ready || sindyCooldown.timeleft <= 10000) {
      return false; // Breath of Sindragosa is ready or almost ready
    }

    return true; // Breath of Sindragosa is neither active nor ready, proceed with other abilities
  }
}
