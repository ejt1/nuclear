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
import { defaultHealTargeting as heal } from "@/Targeting/HealTargeting";

const auras = {
  consecration: 188370,
  shininglight: 327510,
  avengingwrath: 31884
}

export class PaladinProtectionnBehavior extends Behavior {
  name = "Protection Paladin";
  context = BehaviorContext.Any;
  specialization = Specialization.Paladin.Protection;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Selector(
      spell.interrupt("Rebuke"),
      spell.cast("Shield of the Righteous", req => combat.targets.some(unit => me.isWithinMeleeRange(unit) && me.isFacing(unit, 30))),
      spell.cast("Hand of Reckoning", on => combat.targets.find(unit => unit.inCombat && unit.target && !unit.isTanking())),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          common.waitForNotMounted(),
          common.waitForCastOrChannel(),
          spell.cast("Consecration", () => {
            const consecrationAura = me.auras.find(aura => aura.spellId === auras.consecration);
            const auraExpiring = !consecrationAura || (consecrationAura.remaining < 1500 && consecrationAura.remaining !== 0);
            const targetInRange = combat.targets.some(unit => me.isWithinMeleeRange(unit) || unit.distanceTo(me) < 14);
            return auraExpiring && targetInRange;
          }),
          spell.cast("Word of Glory", on => heal.friends.All.find(unit => unit.pctHealth < 70), req => me.hasAura(auras.shininglight)),
          spell.cast("Lay on Hands", on => heal.friends.All.find(unit => unit.pctHealth < 20)),
          spell.cast("Blessing of Protection", on => heal.friends.All.find(unit =>
            unit.pctHealth < 50 &&
            unit.guid !== me.guid &&
            combat.targets.some(enemy =>
              enemy.targetUnit &&
              enemy.targetUnit.guid === unit.guid &&
              enemy.isWithinMeleeRange(unit)
            )
          )),
          spell.cast("Blessing of Freedom", on => heal.friends.All.some(unit => unit.isStunned() || unit.isRooted())),
          spell.cast("Avenger's Shield", on => combat.targets
            .filter(unit => unit.isCastingOrChanneling && unit.isInterruptible && me.isFacing(unit))
            .sort((a, b) => b.distanceTo(me) - a.distanceTo(me))[0]),
          spell.cast("Hammer of Wrath",
            on => combat.targets.find(unit =>
              (unit.pctHealth < 20 || me.hasAura(auras.avengingwrath)) &&
              me.isFacing(unit)
            ),
            { skipUsableCheck: true }
          ),
          spell.cast("Avenger's Shield", on => combat.targets.find(unit => me.isFacing(unit) && !unit.isTanking())),
          spell.cast("Judgment", on => combat.targets.find(unit => me.isFacing(unit) && !unit.isTanking())),
          spell.cast("Judgment", on => combat.bestTarget),
          spell.cast("Avenger's Shield", on => combat.bestTarget),
          spell.cast("Blessed Hammer", req => combat.targets.some(unit => me.isWithinMeleeRange(unit))),
          spell.cast("Consecration", req => combat.targets.some(unit => me.isWithinMeleeRange(unit))),
        )
      )
    );
  }
}
