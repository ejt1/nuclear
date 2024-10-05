import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";
import Pet from "@/Core/Pet";
import { DispelPriority } from "@/Data/Dispels"
import { WoWDispelType } from "@/Enums/Auras";


const auras = {
  huntersPrey: 378215,
  beastCleave: 268877,
  barbedShot: 246851
}

export class HunterBeastMasteryBehavior extends Behavior {
  name = "Beast Mastery Hunter";
  context = BehaviorContext.Any;
  specialization = Specialization.Hunter.BeastMastery;
  version = wow.GameVersion.Retail;
  static settings = [
  ];

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      spell.cast("Growl", on => combat.targets.find(unit => unit.isTanking())),
      spell.cast("Claw", on => combat.bestTarget),
      spell.cast("Smack", on => combat.bestTarget),
      spell.interrupt("Counter Shot"),
      common.waitForCastOrChannel(),
      spell.cast("Bestial Wrath", on => me, req => spell.getCharges("Barbed Shot") < 2 && combat.bestTarget),
      spell.cast("Revive Pet", on => me, req => !Pet.isAlive()),
      spell.cast("Call Pet 3", on => me, req => !Pet.current),
      spell.cast("Mend Pet", on => me, req => Pet.current && Pet.current.pctHealth < 100),
      spell.cast("Misdirection", on => Pet.current, req => combat.targets.filter(unit => unit.isTanking()).length > 1),
      Pet.follow(req => !me.target),
      Pet.attack(on => combat.targets.find(unit => unit.isTanking())),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          spell.cast("Intimidation", on => combat.targets.find(unit => unit.isCastingOrChanneling)),
          spell.cast("Implosive Trap", on => combat.targets.find(unit => unit.isCastingOrChanneling)),
          spell.cast("Exhilaration", on => me, req => (Pet.current && Pet.current.pctHealth < 20) || me.pctHealth < 70),
          spell.cast("Barbed Shot", on => combat.bestTarget, req => {
            const barbedShotAura = me.getAura(auras.barbedShot);
            return !barbedShotAura || barbedShotAura.remaining < 1500 || spell.getCharges("Barbed Shot") == 2;
          }),
          spell.cast("Dire Beast", on => combat.bestTarget, req => me.pctPower < 80),
          spell.dispel("Tranquilizing Shot", false, DispelPriority.Low, false, WoWDispelType.Enrage, WoWDispelType.Magic),
          spell.cast("Explosive Shot", on => combat.targets.find(unit => combat.getUnitsAroundUnit(unit, 10).length > 1 && !unit.isMoving()), req => combat.targets.length > 1),
          spell.cast("Dire Beast: Hawk", on => combat.targets.find(unit => combat.getUnitsAroundUnit(unit, 10).length > 1 && !unit.isMoving())),
          spell.cast("Multi-Shot", on => combat.bestTarget, req => {
            const beastCleaveAura = me.getAura(auras.beastCleave);
            return combat.getUnitsAroundUnit(Pet.current, 8).length > 1 && (!beastCleaveAura || beastCleaveAura.remaining < 1200);
          }),
          spell.cast("Kill Shot", on => me.hasVisibleAura(auras.huntersPrey) ? combat.bestTarget : combat.targets.find(unit => unit.pctHealth < 20), { skipUsableCheck: true }),
          spell.cast("Kill Command", on => combat.bestTarget),
          spell.cast("Cobra Shot", on => combat.bestTarget),
          spell.cast("Steady Shot", on => combat.bestTarget, { skipMovingCheck: true }),
        )
      )
    );
  }
}
