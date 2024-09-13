import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { MovementFlags } from "@/Enums/Flags";
import { DispelPriority } from "@/Data/Dispels";
import { WoWDispelType } from "@/Enums/Auras";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";

const auras = {
    consecration: 188370,
}

export class PaladinProtectionnBehavior extends Behavior {
    name = "Protection Paladin";
    context = BehaviorContext.Any;
    specialization = Specialization.Paladin.Protection;
    version = wow.GameVersion.Retail;

    build() {
        return new bt.Decorator(
            ret => !spell.isGlobalCooldown(),
            new bt.Selector(
                common.waitForNotMounted(),
                common.waitForCastOrChannel(),
                common.waitForTarget(),
                spell.interrupt("Rebuke"),
                spell.cast("Flash of Light", req => me.pctHealth < 80),
                spell.cast("Consecration", req => !me.isMoving() && !me.hasAura(auras.consecration)),
                spell.cast("Avenger's Shield", on => combat.targets.find(unit => unit.isCastingOrChanneling && unit.isInterruptible)),
                spell.cast("Shield of the Righteous"),
                spell.cast("Hammer of Wrath", on => combat.targets.find(unit => unit.pctHealth < 20)),
                spell.cast("Avenger's Shield"),
                spell.cast("Judgment"),
                spell.cast("Crusader Strike"),
            )
        );
    }
}
