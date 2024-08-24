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
  fieryBrand: 207771,
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
        spell.cast("Reaver's Glaive", on => me.target, ret => {
          const thrillOfTheFight = me.getAura(auras.thrillOfTheFight);
          return !thrillOfTheFight || thrillOfTheFight.remainingTime <= 3000;
        }),
        spell.cast("Demon's Bite", on => me.target, ret =>
          me.hasAura(auras.artOfTheGlaive)
        ),
        spell.cast("Chaos Strike", on => me.target, ret =>
          me.hasAura(auras.artOfTheGlaive)
        ),
        spell.cast("The Hunt", on => me.target),
        spell.cast("Sigil of Spite", on => me),
        spell.cast("Fiery Brand", on => me.target, ret => {
          // Logic for using Fiery Brand defensively or when close to 2 stacks
          // You might need to track stacks separately if not provided by the game
          return true; // Placeholder, implement actual logic
        }),
        spell.cast("Soul Carver", on => me.target),
        spell.cast("Fel Devastation", on => me, ret => {
          const thrillOfTheFight = me.hasAura(auras.thrillOfTheFight);
          const fieryBrand = me.targetUnit.getAura(auras.fieryBrand);

          // Cast Fel Devastation if:
          // 1. We have Thrill of the Fight, OR
          // 2. Fiery Brand is active on the target and has more than 2 seconds remaining
          return (fieryBrand && fieryBrand.remaining > 2000) == true
        }),
        spell.cast("Sigil of Flame", on => me, ret => {
          // Implement logic to avoid overcapping Fury
          return true; // Placeholder, implement actual logic
        }),
        spell.cast("Immolation Aura", on => me),
        spell.cast("Felblade", on => me.target, ret => {
          const soulFragments = me.getAura(auras.soulFragments);
          const unitsAroundCount = me.getUnitsAroundCount(8);
          return (unitsAroundCount === 1 && soulFragments && soulFragments.stacks >= 5 && me.fury < 40) ||
            (unitsAroundCount > 1 && soulFragments && soulFragments.stacks >= 4 && me.fury < 40);
        }),
        spell.cast("Spirit Bomb", on => me, ret => {
          const fragments = me.getAura(auras.soulFragments);
          const unitsAroundCount = me.getUnitsAroundCount(8);
          return fragments && (
            (unitsAroundCount === 1 && fragments.stacks >= 5) ||
            (unitsAroundCount > 1 && fragments.stacks >= 4)
          );
        }),
        spell.cast("Demon's bite", on => me.target, ret => {
          const soulFragments = me.getAura(auras.soulFragments);
          return !soulFragments || soulFragments.stacks < 4;
        }),
        spell.cast(344862, on => me.target, ret => {
          const soulFragments = me.getAura(auras.soulFragments);
          return soulFragments === undefined
        }),
        spell.cast("Throw Glaive", on => me.target)
      )
    );
  }
}
