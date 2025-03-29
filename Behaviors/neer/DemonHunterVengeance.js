import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";

export class DemonHunterVengeanceBehavior extends Behavior {
  name = "Demon Hunter [Vengeance]";
  context = BehaviorContext.Any;
  specialization = Specialization.DemonHunter.Vengeance;
  static settings = [
  ];

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForCastOrChannel(),
      spell.cast("Torment", on => combat.targets.find(t => t.target && !t.isTanking())),
      spell.interrupt("Disrupt"),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          spell.cast("Immolation Aura", on => me, req => me.target && me.isWithinMeleeRange(me.target)),
          spell.cast("Sigil of Flame", on => me.target),
          spell.cast("Fel Devastation", on => me, req => !me.isMoving() && combat.targets.filter(t => me.isFacing(t, 90)).length > 0),
          spell.cast("Spirit bomb", on => me, req => this.soulFragments() >= 4),
          spell.cast("Fiery Brand", on => me.target),
          spell.cast("Fracture", on => me.target, req => this.soulFragments() < 4),
          spell.cast("Soul Cleave", on => me.target, req => this.soulFragments() == 0 || me.pctPower == 100),
          spell.cast("Throw Glaive", on => me.target),
          common.waitForTarget(),
          common.ensureAutoAttack(),
        )
      )
    );
  }

  soulFragments() {
    const aura = me.getAuraByMe("Soul Fragments");
    return aura ? aura.stacks : 0;
  }
}
