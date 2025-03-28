import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { PowerType } from "@/Enums/PowerType";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";

export class WarriorFuryBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Druid.Balance;

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForNotMounted(),
        common.waitForTarget(),
        common.waitForCastOrChannel(),
        common.waitForFacing(),

        spell.cast("Moonfire", this.findMoonfireTarget),
        spell.cast("Sunfire", this.findSunfireTarget),

        spell.cast("Starsurge", on => me.target, req => me.powerByType(PowerType.LunarPower) > 50),
        spell.cast("Starfire", this.inLunar),
        spell.cast("Wrath", this.inSolar),
        spell.cast("Wrath", on => me.target),
      )
    );
  }

  findMoonfireTarget() {
    const moonFireTarget = combat.targets.find(unit => !unit.hasAuraByMe("Moonfire"));
    return moonFireTarget ? moonFireTarget : false;
  }

  findSunfireTarget() {
    const moonFireTarget = combat.targets.find(unit => !unit.hasAuraByMe("Sunfire"));
    return moonFireTarget ? moonFireTarget : false;
  }

  inLunar() {
    return me.auras.find(aura => aura.name.includes("Eclipse (Lunar)") && aura.remaining > 1000) !== undefined;
  }

  inSolar() {
    return me.auras.find(aura => aura.name.includes("Eclipse (Solar)") && aura.remaining > 1000) !== undefined;
  }
}
