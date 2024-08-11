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
        spell.cast("Throw Glaive", null, null, ret => me.power > 45), // should be a range check such as NOT target.HasAura("Master of the Glaive")
        spell.cast("Essence Break", null, null, ret => true), // should check cds
        spell.cast("Eye Beam", null, null, ret => me.power > 49),
        spell.cast("Felblade", null, ret => true, null),
        spell.cast("Death Sweep", null, null, ret => this.isMetamorphosis() && me.power > 50),
        spell.cast("Blade Dance", null, null, ret => !this.isMetamorphosis() && me.power > 50),
        spell.cast("Chaos Strike", null, null, ret => me.power > 50),
        spell.cast("Throw Glaive", null, null, ret => me.power > 80),
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

  isMetamorphosis() {
    if (this.haAura(me.auras, "Metamorphosis")) {
      console.info("For it is ---- metamorphosis!" + Math.random() * Math.random());
      return true;
    }
    console.info("NOT --- metamorphosis!" + Math.random() * Math.random());
    return false;
  }
}
