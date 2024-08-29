import { Behavior, BehaviorContext } from "../../../Core/Behavior";
import * as bt from '../../../Core/BehaviorTree';
import Specialization from '../../../Enums/Specialization';
import common from '../../../Core/Common';
import spell from "../../../Core/Spell";
import { me } from "../../../Core/ObjectManager";

export class WarriorFuryBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Warrior.Fury;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown() && !me.isMounted,
      new bt.Selector(
        common.waitForNotMounted(),
        common.waitForTarget(),
        common.waitForCastOrChannel(),
        common.waitForFacing(),

        spell.cast("Battle Shout", on => me, req => !me.hasAuraByMe("Battle Shout")),

        spell.cast("Victory Rush", ret => me.pctHealth < 70),
        new bt.Decorator(
          ret => this.isEnraged(),
          new bt.Selector(
            spell.cast("Thunder Clap", ret => me.hasAuraByMe("Thunder Blast")),
            spell.cast("Avatar"),
            spell.cast("Recklessness"),
            spell.cast("Blood Fury"),
            spell.cast("Thunderous Roar"),
            spell.cast("Odyn's Fury"),
            spell.cast("Bladestorm"),
          )
        ),
        spell.cast("Rampage", ret => !this.isEnraged()),
        spell.cast("Crushing Blow"),
        spell.cast("Bloodbath"),
        spell.cast("Raging Blow", ret => this.isEnraged() || me.power < 110),
        spell.cast("Rampage"),
        spell.cast("Execute", ret => me.hasAuraByMe("Sudden Death")),
        spell.cast("Bloodthirst"),
        spell.cast("Thunder Clap"),
        spell.cast("Whirlwind"),
      )
    );
  }

  isEnraged() {
    const enrage = me.auras.find(aura => aura.dispelType === 9);
    return enrage !== undefined && enrage.remaining > 600;
  }
}
