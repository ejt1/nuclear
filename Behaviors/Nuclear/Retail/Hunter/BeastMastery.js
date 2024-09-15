import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";
import Pet from "@/Core/Pet";

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
      common.waitForCastOrChannel(),
      spell.cast("Call Pet 1", on => me, req => !Pet.current),
      spell.cast("Revive Pet", on => me, req => !Pet.isAlive()),
      Pet.follow(req => !me.target),
      common.waitForTarget(),
      Pet.attack(on => me.target),
      spell.cast("Growl", on => combat.targets.find(unit => unit.isTanking())),
      spell.cast("Claw"),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          spell.cast("Kill Command"),
          spell.cast("Cobra Shot"),
          spell.cast("Barbed Shot")
        )
      )
    );
  }
}
