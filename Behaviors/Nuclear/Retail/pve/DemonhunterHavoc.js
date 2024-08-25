import {Behavior, BehaviorContext} from "../../../../Core/Behavior";
import * as bt from '../../../../Core/BehaviorTree';
import Specialization from '../../../../Enums/Specialization';
import common from '../../../../Core/Common';
import spell from "../../../../Core/Spell";
import {me} from "../../../../Core/ObjectManager";

export class DemonhunterHavocBehavior extends Behavior {
  name = "Demon Hunter Havoc"
  context = BehaviorContext.Any; // PVP ?
  specialization = Specialization.DemonHunter.Havoc;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForTarget(),
        common.waitForCastOrChannel(),
        common.waitForFacing(),
        spell.cast("Blur", on => me, ret => me.pctHealth < 55),
        spell.cast("Darkness", on => me, ret => me.pctHealth < 35),
        spell.cast("The Hunt", on => me, ret => !me.isRooted() && me.pctHealth < 75),
        spell.cast("Throw Glaive", ret => me.power > 25 && me.targetUnit && !me.isWithinMeleeRange(me.targetUnit)),
        spell.cast("Throw Glaive", ret => me.power > 25 && !me.targetUnit?.hasAuraByMe("Master of the Glaive")),
        spell.cast("Eye Beam", ret => me.power > 49 && me.targetUnit && me.isWithinMeleeRange(me.targetUnit)),
        spell.cast("Essence Break", ret => me.targetUnit && me.pctHealth < 77),
        spell.cast("Metamorphosis", ret => this.checkMetamorphosis()),
        spell.cast("Felblade"),
        spell.cast("Blade Dance", on => me, this.checkBladeDance()),
        spell.cast("Chaos Strike", ret => me.power > 50),
        spell.cast("Throw Glaive", ret => me.power > 25 && wow.SpellBook.getSpellByName("Throw Glaive")?.charges.charges > 1),
        spell.cast("Sigil of Flame", ret => me.power < 70),
        spell.cast("Arcane Torrent", on => me)
      )
    );
  }

  checkMetamorphosis() {
    if (me.targetUnit) {
      const bladeDance = wow.SpellBook.getSpellByName("Blade Dance");
      const eyeBeam = wow.SpellBook.getSpellByName("Eye Beam");
      return bladeDance && bladeDance.cooldown.duration > 0 && eyeBeam && eyeBeam.cooldown.duration > 0;
    }
    return false
  };

  checkBladeDance() {
    if (me.targetUnit && me.power > 35 && me.isWithinMeleeRange(me.targetUnit)) {
      const essenceBreak = wow.SpellBook.getSpellByName("Essence Break");
      const eyeBeam = wow.SpellBook.getSpellByName("Eye Beam");
      return essenceBreak && essenceBreak.cooldown.duration > 3000 && eyeBeam && eyeBeam.cooldown.duration > 3000;
    }
    return false
  };


}
