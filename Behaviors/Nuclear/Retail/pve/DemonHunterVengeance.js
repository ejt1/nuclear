import { Behavior, BehaviorContext } from "../../../../Core/Behavior";
import * as bt from '../../../../Core/BehaviorTree';
import Specialization from '../../../../Enums/Specialization';
import common from '../../../../Core/Common';
import spell from "../../../../Core/Spell";
import { me } from "../../../../Core/ObjectManager";

const auras = {
  soulFragments: 203981,
  thrillOfTheFight: 999999, // Replace with actual aura ID
  artOfTheGlaive: 999998, // Replace with actual aura ID
  fieryBrand: 204021,
}

export class DemonhunterVengeanceBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.DemonHunter.Vengeance;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForTarget(),
        common.waitForCastOrChannel(),
        common.waitForFacing(),
        this.reaversGlaive(),
        this.fractureBuff(),
        this.soulCleaveBuff(),
        this.theHunt(),
        this.sigilOfSpite(),
        this.fieryBrand(),
        this.soulCarver(),
        this.felDevastation(),
        this.sigilOfFlame(),
        this.immolationAura(),
        this.felblade(),
        this.spiritBomb(),
        this.fracture(),
        this.soulCleave(),
        this.throwGlaive()
      )
    );
  }

   reaversGlaive() {
    return spell.cast("Reaver's Glaive", on => me.target, ret => {
      const thrillOfTheFight = me.getAura(auras.thrillOfTheFight);
      return !thrillOfTheFight || thrillOfTheFight.remainingTime <= 3000;
    });
  }

   fractureBuff() {
    return spell.cast("Demon's Bite", on => me.target, ret =>
      me.hasAura(auras.artOfTheGlaive)
    );
  }

   soulCleaveBuff() {
    return spell.cast("Chaos Strike", on => me.target, ret =>
      me.hasAura(auras.artOfTheGlaive)
    );
  }

   theHunt() {
    return spell.cast("The Hunt", on => me.target);
  }

   sigilOfSpite() {
    return spell.cast("Sigil of Spite", on => me);
  }

   fieryBrand() {
    return spell.cast("Fiery Brand", on => me.target, ret => {
      // Logic for using Fiery Brand defensively or when close to 2 stacks
      // You might need to track stacks separately if not provided by the game
      return true; // Placeholder, implement actual logic
    });
  }

   soulCarver() {
    return spell.cast("Soul Carver", on => me.target);
  }

   felDevastation() {
    return spell.cast("Fel Devastation", on => me, ret => {
      const thrillOfTheFight = me.hasAura(auras.thrillOfTheFight);
      const fieryBrand = me.targetUnit.getAura(auras.fieryBrand);
      return fieryBrand && fieryBrand.remaining > 2000;
    });
  }

   sigilOfFlame() {
    return spell.cast("Sigil of Flame", on => me, ret => {
      // Implement logic to avoid overcapping Fury
      return true; // Placeholder, implement actual logic
    });
  }

   immolationAura() {
    return spell.cast("Immolation Aura", on => me);
  }

   felblade() {
    return spell.cast("Felblade", on => me.target, ret => {
      const soulFragments = me.getAura(auras.soulFragments);
      const unitsAroundCount = me.getUnitsAroundCount(8);
      return (unitsAroundCount === 1 && soulFragments && soulFragments.stacks >= 5 && me.fury < 40) ||
             (unitsAroundCount > 1 && soulFragments && soulFragments.stacks >= 4 && me.fury < 40);
    });
  }

   spiritBomb() {
    return spell.cast("Spirit Bomb", on => me, ret => {
      const fragments = me.getAura(auras.soulFragments);
      const unitsAroundCount = me.getUnitsAroundCount(8);
      return fragments && (
        (unitsAroundCount === 1 && fragments.stacks >= 5) ||
        (unitsAroundCount > 1 && fragments.stacks >= 4)
      );
    });
  }

   fracture() {
    return spell.cast("Demon's bite", on => me.target, ret => {
      const soulFragments = me.getAura(auras.soulFragments);
      return !soulFragments || soulFragments.stacks < 4;
    });
  }

   soulCleave() {
    return spell.cast(228477, on => me.target, ret => {
      const soulFragments = me.getAura(auras.soulFragments);
      return !soulFragments || soulFragments.stacks === 0;
    });
  }

   throwGlaive() {
    return spell.cast("Throw Glaive", on => me.target);
  }
}
