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
        spell.cast("Throw Glaive", ret => me.power > 45), // should be a range check such as NOT target.HasAura("Master of the Glaive")
        spell.cast("Essence Break", ret => true), // should check cds
        spell.cast("Eye Beam", ret => me.power > 49),
        spell.cast("Felblade", ret => true),
        spell.cast("Blade Dance", me, ret => me.power > 45),
        spell.cast("Chaos Strike", ret => me.power > 50),
        spell.cast("Throw Glaive", ret => me.power > 80),
      )
    );
  }

  haAura(auras, name) {
    // should change to hasAuras by Me, and check hasCaster & caster guid === me?
    return auras.some(aura => aura.name === name);
  }

  getAura(auras, name) {
    for (let aura of auras) {
      if (aura.name === name) {
        return aura;
      }
    }
    return null; // Return null if the aura is not found
  }

}
