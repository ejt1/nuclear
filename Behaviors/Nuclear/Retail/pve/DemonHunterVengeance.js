import { Behavior, BehaviorContext } from "../../../../Core/Behavior";
import * as bt from '../../../../Core/BehaviorTree';
import Specialization from '../../../../Enums/Specialization';
import common from '../../../../Core/Common';
import spell from "../../../../Core/Spell";
import { me } from "../../../../Core/ObjectManager";

const auras = {
  soulFragments: 203981,
  thrillOfTheFight: 347746,
  fieryBrand: 207744,
  artOfTheGlaive: 444661, // Added Art of the Glaive aura ID
};

export class DemonhunterVengeanceBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.DemonHunter.Vengeance;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForCastOrChannel(),
        common.waitForTarget(),
        common.waitForFacing(),
        this.dynamicRotation(),
      )
    );
  }

  dynamicRotation() {
    return new bt.Selector(
      ret => me.getUnitsAround(8).length > 1 ? this.aoeRotation() : this.singleTargetRotation()
    );
  }

  singleTargetRotation() {
    return new bt.Sequence(
      this.useReaversGlaive(),
      this.useFracture(),
      this.useSoulCleave(),
      this.useSigilOfSpite(),
      this.useFieryBrand(),
      this.useSoulCarver(),
      this.useFelDevastation(),
      this.useSigilOfFlame(),
      this.immolationAura(),
      this.useFelblade(),
      this.spiritBomb(),
      this.useFractureForFragments(),
      this.useSoulCleave(),
      this.useFelblade(),
      this.useFracture(),
      this.useThrowGlaive()
    );
  }

  aoeRotation() {
    return new bt.Sequence(
      this.useReaversGlaive(),
      this.useFracture(),
      this.useSoulCleave(),
      this.useSoulCarver(),
      this.useSigilOfSpite(),
      this.useSigilOfFlame(),
      this.useFelDevastation(true),
      this.immolationAura(),
      this.useFelblade(true),
      this.spiritBomb(true),
      this.useFractureForFragments(true),
      this.useSoulCleave(),
      this.useFracture(),
      this.useFelblade(),
      this.useThrowGlaive()
    );
  }

  useReaversGlaive() {
    return spell.cast("Reaver's Glaive", on => me.target, ret => {
      const thrillOfTheFight = me.getAura(auras.thrillOfTheFight);
      const artOfTheGlaive = me.getAura(auras.artOfTheGlaive);

      // Cast Reaver's Glaive when Thrill of the Fight has less than 3 seconds remaining or isn't active
      // or when Art of the Glaive is active (Reaver's Glaive will be cast automatically)
      return (thrillOfTheFight && thrillOfTheFight.remaining < 3000) || !thrillOfTheFight || artOfTheGlaive;
    });
  }

  useFracture() {
    return spell.cast("Fracture", on => me.target, ret => {
      const artOfTheGlaive = me.getAura(auras.artOfTheGlaive);
      const soulFragments = me.getAura(auras.soulFragments);
      const currentFragments = soulFragments ? soulFragments.count : 0;

      // If Art of the Glaive is active, prioritize Fracture to generate more Soul Fragments.
      // Check if casting Fracture will help reach the needed Soul Fragments for a Spirit Bomb or enhanced Soul Cleave.
      const neededFragments = artOfTheGlaive ? 4 : 5; // Depending on the context, we may need 4 or 5 fragments.
      const canGenerate = (neededFragments - currentFragments) <= 2;

      // Cast Fracture if it can help generate the necessary Soul Fragments or if Art of the Glaive is active.
      return canGenerate || artOfTheGlaive;
    });
  }


  useSoulCleave() {
    return spell.cast("Soul Cleave", on => me, ret => {
      const artOfTheGlaive = me.getAura(auras.artOfTheGlaive);

      // Use Soul Cleave with priority if Art of the Glaive is active, to benefit from the enhancement
      return artOfTheGlaive;
    });
  }


  useSigilOfSpite() {
    return spell.cast("Sigil of Spite", on => me.target, ret => true); // Use on cooldown
  }

  useFieryBrand() {
    return spell.cast("Fiery Brand", on => me.target, ret => true); // Use Fiery Brand
  }

  useSoulCarver() {
    return spell.cast("Soul Carver", on => me.target, ret => true); // Use on cooldown
  }

  useFelDevastation(isAoE = false) {
    return spell.cast("Fel Devastation", on => me.target, ret => {
      const thrillOfTheFight = me.getAura(auras.thrillOfTheFight);
      const fieryBrand = me.getAura(auras.fieryBrand);
      return thrillOfTheFight && fieryBrand && fieryBrand.remains > 2;
    });
  }

  useSigilOfFlame() {
    return spell.cast("Sigil of Flame", on => me.target, ret => {
      const sigilOfFlameAura = me.getAura("Sigil of Flame");
      return !sigilOfFlameAura || sigilOfFlameAura.charges === 1;
    });
  }

  immolationAura() {
    return spell.cast("Immolation Aura", on => me, ret => true); // Use on cooldown
  }

  useFelblade(isAoE = false) {
    return spell.cast("Felblade", on => me.target, ret => {
      const soulFragments = me.getAura(auras.soulFragments);
      return soulFragments && soulFragments.count >= (isAoE ? 4 : 5) && me.getResource("Fury") < 40;
    });
  }

  spiritBomb(isAoE = false) {
    return spell.cast("Spirit Bomb", on => me, ret => {
      const soulFragments = me.getAura(auras.soulFragments);
      return soulFragments && soulFragments.count >= (isAoE ? 4 : 5);
    });
  }

  useFractureForFragments(isAoE = false) {
    return spell.cast("Fracture", on => me.target, ret => {
      const soulFragments = me.getAura(auras.soulFragments);
      const currentFragments = soulFragments ? soulFragments.count : 0;
      const neededFragments = isAoE ? 4 : 5;
      const canGenerate = (neededFragments - currentFragments) <= 2;

      // Ensure enough fragments for Art of the Glaive by checking if casting Fracture will help reach the threshold
      return canGenerate;
    });
  }


  useThrowGlaive() {
    return spell.cast("Throw Glaive", on => me.target, ret => {
      return me.distanceTo(me.target) > 10;
    });
  }
}
