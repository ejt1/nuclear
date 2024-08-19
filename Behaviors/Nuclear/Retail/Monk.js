import { Behavior, BehaviorContext } from "../../../Core/Behavior";
import * as bt from '../../../Core/BehaviorTree';
import Specialization from '../../../Enums/Specialization';
import common from '../../../Core/Common';
import spell from "../../../Core/Spell";
import { me } from "../../../Core/ObjectManager";
import { MovementFlags } from "../../../Enums/Flags";

export class MonkMistweaverBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Monk.Mistweaver;
  version = wow.GameVersion.Retail;

  findClosestUnit(range) {
    const units = me.unitsAround(range);
    return units.length ? units.reduce((closest, unit) =>
      me.distanceTo(unit) < me.distanceTo(closest) ? unit : closest
    ) : null;
  }

  summonJadeSerpentStatue() {
    return spell.cast("Summon Jade Serpent Statue", () => this.findClosestUnit(15));
  }

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForCastOrChannel(),
        common.waitForTarget(),
        spell.cast("Spinning Crane Kick", ret => me.unitsAroundCount() > 1),
        spell.cast("Rising Sun Kick"),
        spell.cast("Blackout Kick"),
        spell.cast("Tiger Palm")
      )
    );
  }
}
