import { Behavior, BehaviorContext } from "../../../Core/Behavior";
import * as bt from '../../../Core/BehaviorTree';
import Specialization from '../../../Core/Specialization';
import common from '../../../Core/Common';
import spell from "../../../Core/Spell";
import { me } from "../../../Core/ObjectManager";

export class MonkMistweaverBehavior extends Behavior {
    context = BehaviorContext.Any;
    specialization = Specialization.Monk.Mistweaver;
    version = wow.GameVersion.Retail;

    build() {
        return new bt.Decorator(
            ret => !spell.isGlobalCooldown(),
            new bt.Selector(
                common.waitForTarget(),
                common.waitForCastOrChannel(),
                spell.cast("Spinning Crane Kick", ret => me.unitsAroundCount() > 1),
                spell.cast("Rising Sun Kick"),
                spell.cast("Blackout Kick"),
                spell.cast("Tiger Palm"),
            )
        );
    }
}
