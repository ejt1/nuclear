import { me } from "../../Core/ObjectManager";
import { Behavior, BehaviorContext } from "../../Core/Behavior";
import * as bt from '../../Core/BehaviorTree';
import Specialization from '../../Enums/Specialization';
import common from '../../Core/Common';
import spell from "../../Core/Spell";
import { defaultCombatTargeting } from "../../Targeting/CombatTargeting";

export class DefaultBehavior extends Behavior {
  name = "Nuclear Default";
  context = BehaviorContext.Any;
  specialization = Specialization.All;
  version = 1;

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForNotSitting(),
      common.waitForCastOrChannel(),
      common.waitForTarget(),
      common.waitForFacing(),
      new bt.Action(() => {
        const spellId = wow.SpellBook.singleButtonAssistantSpellId;
        if (spellId > 0) {
          console.info(spellId);
          const target = defaultCombatTargeting.bestTarget ? defaultCombatTargeting.bestTarget : me.target
          return spell.cast(spellId, on => target).execute({});
        }
        return bt.Status.Failure;
      })
    );
  }
}
