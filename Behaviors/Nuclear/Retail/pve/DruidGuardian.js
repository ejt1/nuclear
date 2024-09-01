import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { PowerType } from "@/Enums/PowerType";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";

const auras = {
  ironfur: 192081,
  galacticguardian: 213708
}

export class DruidGuardianBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Druid.Guardian;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          common.waitForTarget(),
          common.waitForCastOrChannel(),
          common.waitForFacing(),
          spell.cast("Ironfur", on => me, req => this.shouldCastIronfur()),
          spell.cast("Frenzied Regeneration", on => me, req => this.shouldCastFrenziedRegeneration()),
          spell.interrupt("Skull Bash"),
          spell.cast("Heart of the Wild"),
          spell.applyAura("Moonfire", me.target, false),
          spell.cast("Thrash", on => me.target),
          spell.cast("Mangle", on => me.target, req => me.powerByType(PowerType.Rage) < 90),
          //spell.cast("Berserk"),
          //spell.cast("Lunar Beam", on => me.target),
          spell.cast("Rage of the Sleeper"),
          spell.cast("Raze", on => me.target),
          spell.cast("Moonfire", this.findMoonfireTarget),
          spell.cast("Moonfire", on => me.target, req => me.getAura(auras.galacticguardian)?.remaining < 2000),
          spell.cast("Swipe", on => me, req => combat.targets.filter(unit => unit.distanceTo(me) <= 8).length > 1),
        )
      )
    );
  }

  shouldCastIronfur() {
    const currentStacks = me.getAura(auras.ironfur)?.stacks || 0;
    const desiredStacks = Math.min(3, Math.ceil((100 - me.pctHealth) / 20));
    return currentStacks < desiredStacks || me.powerByType(PowerType.Rage) == 100;
  }

  shouldCastFrenziedRegeneration() {
    const charges = spell.getCharges("Frenzied Regeneration");
    return (charges === 2 && me.pctHealth < 80) || (charges === 1 && me.pctHealth < 40);
  }

  findMoonfireTarget() {
    const moonFireTarget = combat.targets.find(unit => !unit.hasAuraByMe("Moonfire"));
    return moonFireTarget ? moonFireTarget : false;
  }
}
