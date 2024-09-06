import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { MovementFlags } from "@/Enums/Flags";
import { DispelPriority } from "@/Data/Dispels";
import { WoWDispelType } from "@/Enums/Auras";

export class PriestHolyBehavior extends Behavior {
  name = "Holy Priest";
  context = BehaviorContext.Any;
  specialization = Specialization.Priest.Holy;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForNotMounted(),
        common.waitForCastOrChannel(),
        spell.dispel("Purify", true, DispelPriority.Low, false, WoWDispelType.Magic),
        common.waitForTarget(),
      )
    );
  }
}
