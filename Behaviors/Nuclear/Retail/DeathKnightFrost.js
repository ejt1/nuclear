import {Behavior, BehaviorContext} from "../../../Core/Behavior";
import * as bt from '../../../Core/BehaviorTree';
import Specialization from '../../../Core/Specialization';
import common from '../../../Core/Common';
import spell from "../../../Core/Spell";
import {me} from "../../../Core/ObjectManager";

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
        spell.cast("Death Strike", ret =>  me.pctHealth < 95 && me.hasAura(101568)), // dark succor
        spell.cast("Death Strike", ret => me.pctHealth < 65 && me.power > 35),
        spell.cast("Remorseless Winter", on => me),
        spell.cast("Rune Strike", ret =>  me.hasAura(51124)), // killing machine aura
        spell.cast("Howling Blast", ret =>  me.hasAura(59052)), // Rime aura
        spell.cast("Frost Strike", ret => me.power > 45),
        spell.cast("Rune Strike"),
      )
    );
  }


}
