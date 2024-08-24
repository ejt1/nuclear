import {Behavior, BehaviorContext} from "../../../../Core/Behavior";
import * as bt from '../../../../Core/BehaviorTree';
import Specialization from '../../../../Enums/Specialization';
import common from '../../../../Core/Common';
import spell from "../../../../Core/Spell";
import {me} from "../../../../Core/ObjectManager";

export class DeathKnightFrostBehavior extends Behavior {
  context = BehaviorContext.Any; // PVP ?
  specialization = Specialization.DeathKnight.Frost;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForTarget(),
        common.waitForCastOrChannel(),
        common.waitForFacing(),
        spell.cast("Death Strike", ret => me.pctHealth < 95 && me.hasAura(101568)), // dark succor
        spell.cast("Death Strike", ret => me.pctHealth < 65 && me.power > 35),
        spell.cast("Frost Strike", ret => this.checkFrostStrikeKeepUpBuffs()),
        spell.cast("Pillar of Frost", on => me, ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit)),
        spell.cast("Abomination Limb", on => me, ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit)),
        spell.cast("Remorseless Winter", on => me, ret => me.targetUnit && me.isWithinMeleeRange(me.targetUnit)),
        spell.cast("Frostscythe", on => me, ret => me.getUnitsAroundCount(8) >= 2 && me.targetUnit && me.isWithinMeleeRange(me.targetUnit) && me.isFacing(me.targetUnit) && !me.hasAura(51124)),
        spell.cast("Death and Decay", ret => me.getUnitsAroundCount(10) >= 2 && me.targetUnit && me.isWithinMeleeRange(me.targetUnit) && me.hasAura(51271)), // Pillar of Frost
        spell.cast("Rune Strike", ret => me.hasAura(51124)), // killing machine aura
        spell.cast("Howling Blast", ret => me.hasAura(59052)), // Rime aura
        spell.cast("Chains of Ice", on => me.targetUnit, ret => {
          const coldHeart = me.getAura(281209);
          return !!(coldHeart && coldHeart.stacks === 20);
        }),
        spell.cast("Frost Strike", ret => me.power > 45),
        spell.cast("Rune Strike"),
        spell.cast("Horn of Winter", ret => me.targetUnit && me.power < 70),
       )
    );
  }

  checkFrostStrikeKeepUpBuffs() {
    if (me.targetUnit && me.isWithinMeleeRange(me.targetUnit)) {
      const icyTalons = me.getAura(194879); // Icy Talons
      const unleashedFrenzy = me.getAura(376907) // Unleashed frenzy
      if (icyTalons && unleashedFrenzy && icyTalons.remaining > 2000 && unleashedFrenzy.remaining > 2000) {
        return false;
      }
    }
    return true;
  };

}
