import { Behavior, BehaviorContext } from "../../../Core/Behavior";
import * as bt from '../../../Core/BehaviorTree';
import Specialization from '../../../Enums/Specialization';
import common from '../../../Core/Common';
import spell from "../../../Core/Spell";
import { me } from "../../../Core/ObjectManager";

export class MonkMistweaverBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Monk.Mistweaver;
  version = wow.GameVersion.Retail;

  findClosestUnit(range) {
    const units = me.unitsAround(range);
    if (units.length === 0) return null;

    return units.reduce((closest, unit) => {
      const distance = me.distanceTo(unit);
      return distance < me.distanceTo(closest) ? unit : closest;
    });
  }

  summonJadeSerpentStatue() {
    return spell.cast("Summon Jade Serpent Statue", () => this.findClosestUnit(15));
  }

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        this.summonJadeSerpentStatue(),
        spell.apply("Renewing Mist", me),
        common.waitForCastOrChannel(),
        common.waitForTarget(),
        spell.cast("Spinning Crane Kick", ret => me.unitsAroundCount() > 1),
        spell.cast("Rising Sun Kick"),
        spell.cast("Blackout Kick"),
        spell.cast("Tiger Palm"),
      )
    );
  }
}
