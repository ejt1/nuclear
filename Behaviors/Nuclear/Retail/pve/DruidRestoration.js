import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { PowerType } from "@/Enums/PowerType";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";
import { defaultHealTargeting as heal } from "../../../../Targeting/HealTargeting";
import { ShapeshiftForm } from "../../../../Enums/UnitEnums";

export class DruidRestorationBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Druid.Restoration;
  version = wow.GameVersion.Retail;

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Selector(
        common.waitForNotMounted(),
        common.waitForCastOrChannel(),
        this.waitForForm(),

        this.panicHeal(),
        spell.cast("Swiftmend", req => this.findSwiftmendTarget()),
        spell.cast("Regrowth", req => me.hasVisibleAura("Clearcasting") && heal.getPriorityTarget()?.predictedHealthPercent < 90, on => heal.getPriorityTarget()),
        spell.cast("Wild Growth", req => this.wantWildGrowth()),
        spell.cast("Lifebloom", req => this.findLifebloomTarget()),
        spell.cast("Cenarion Ward", req => this.findCenarionWardTarget()),
        spell.cast("Regrowth", req => this.findRegrowthTarget()),
        spell.cast("Rejuvenation", req => this.findRejuvenationTarget()),
        spell.cast("Regrowth", on => heal.getPriorityTarget(), req => heal.getPriorityTarget()?.predictedHealthPercent < 80),
      )
    );
  }

  waitForForm() {
    return new bt.Action(() => {
      if (me.shapeshiftForm !== 0) {
        return bt.Status.Success;
      }
      return bt.Status.Failure;
    });
  }

  panicHeal() {
    return new bt.Decorator(
      req => heal.getPriorityTarget()?.pctHealth < 20,
      new bt.Sequence(
        spell.cast("Nature's Swiftness", on => me),
        spell.cast("Regrowth", on => heal.getPriorityTarget()),
        spell.cast("Ironbark", on => heal.getPriorityTarget()),
      )
    );
  }

  findRejuvenationTarget() {
    return this.findHealOverTimeTarget("Rejuvenation", unit => unit.predictedHealthPercent < 95);
  }

  findRegrowthTarget() {
    return this.findHealOverTimeTarget("Regrowth", unit => unit.predictedHealthPercent < 80);
  }

  findCenarionWardTarget() {
    if (heal.friends.Tanks.length > 0) {
      const tank = heal.friends.Tanks[0];
      if (tank.pctHealth < 90) {
        return tank;
      }
    }
    return false;
  }

  wantWildGrowth() {
    let damagedUnitsWithin30 = 0;
    for (const entry of heal.priorityList) {
      const unit = entry.unit;
      if (unit.pctHealth < 90 && me.distanceTo(unit) < 30) {
        ++damagedUnitsWithin30;
      }
    }
    return damagedUnitsWithin30 > 2;
  }

  findSwiftmendTarget() {
    for (const entry of heal.priorityList) {
      const unit = entry.unit;
      if (unit.pctHealth < 60 && (unit.hasAuraByMe("Rejuvenation") || unit.hasAuraByMe("Regrowth") || unit.hasAuraByMe("Wild Growth"))) {
        return unit;
      }
    }
    return false;
  }

  findLifebloomTarget() {
    let lifebloomCounts = 0;
    for (const entry of heal.priorityList) {
      const unit = entry.unit;
      if (unit.hasAuraByMe("Lifebloom")) {
        ++lifebloomCounts;
      }
    }
    if (lifebloomCounts >= 2) {
      return false;
    }
    for (const tank of heal.friends.Tanks) {
      if (tank.pctHealth < 90 && !tank.hasAuraByMe("Lifebloom")) {
        return tank;
      }
    }
    return false;
  }

  findHealOverTimeTarget(name, predicate) {
    for (const entry of heal.priorityList) {
      const unit = entry.unit;
      if (predicate(unit) && !unit.hasAuraByMe(name)) {
        return unit;
      }
    }
    return false;
  }
}
