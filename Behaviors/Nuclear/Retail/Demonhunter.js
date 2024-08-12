import {Behavior, BehaviorContext} from "../../../Core/Behavior";
import * as bt from '../../../Core/BehaviorTree';
import Specialization from '../../../Core/Specialization';
import common from '../../../Core/Common';
import spell from "../../../Core/Spell";
import {me} from "../../../Core/ObjectManager";

export class DemonhunterHavocBehavior extends Behavior {
  context = BehaviorContext.Any; // PVP ?
  specialization = Specialization.DemonHunter.Havoc;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForTarget(),
        common.waitForCastOrChannel(),
        spell.cast("Throw Glaive", ret => me.power > 25 && !me.targetUnit?.hasAuraByMe("Master of the Glaive")),
        spell.cast("Essence Break", ret => me.target && me.targetUnit.pctHealth < 77),
        spell.cast("Eye Beam", ret => me.power > 49), // check cds
        spell.cast("Felblade"),
        spell.cast("Blade Dance", me, this.checkBladeDance()),
        spell.cast("Chaos Strike", ret => me.power > 50),
        //spell.cast("Throw Glaive", ret => me.power > 25 && wow.SpellBook.getSpellByName("Throw Glaive")?.charges > 1),
      )
    );
  }

  checkBladeDance() {
    if (me.target && me.power > 35 && me.isWithinMeleeRange(me.target)) {
      const essenceBreak = wow.SpellBook.getSpellByName("Essence Break");
      const eyeBeam = wow.SpellBook.getSpellByName("Eye Beam");
      return essenceBreak && essenceBreak.cooldown.duration > 3000 && eyeBeam && eyeBeam.cooldown.duration > 3000;
    }
    return false
  };



}
