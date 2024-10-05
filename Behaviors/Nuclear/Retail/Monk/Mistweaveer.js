import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";
import { defaultHealTargeting as heal } from "@/Targeting/HealTargeting";
import { WoWDispelType } from "@/Enums/Auras";
import Settings from "@/Core/Settings";

const auras = {
  renewingMist: 119611,
  sheilunsGift: 399510,
  ancientTeachings: 388026,
  teachingsOfTheMonastery: 202090,
  manaTea: 115867,
  envelopingMist: 124682,
  chiJi: 343820,
  danceOfChiji: 438443
}

export class MonkMistweaverBehavior extends Behavior {
  name = "Mistweaveer";
  context = BehaviorContext.Any;
  specialization = Specialization.Monk.Mistweaver;
  version = wow.GameVersion.Retail;

  static settings = [
    {
      header: "Single Target Healing",
      options: [
        { type: "slider", uid: "MWMonkLifeCocoonPercent", text: "Life Cocoon Percent", min: 0, max: 100, default: 50 },
        { type: "slider", uid: "MWMonkEnvelopingMistPercent", text: "Enveloping Mist Percent", min: 0, max: 100, default: 80 },
        { type: "slider", uid: "MWMonkVivifyPercent", text: "Vivify Percent", min: 0, max: 100, default: 80 },
        { type: "slider", uid: "MWMonkExpelHarmPercent", text: "Expel Harm Percent", min: 0, max: 100, default: 50 },
      ]
    },
    {
      header: "AoE Healing",
      options: [
        { type: "slider", uid: "MWMonkSheilunsGiftPercent", text: "Sheilun's Gift Percent", min: 0, max: 100, default: 80 },
        { type: "slider", uid: "MWMonkSheilunsGiftCount", text: "Sheilun's Gift Minimum Targets", min: 1, max: 10, default: 3 },
        { type: "slider", uid: "MWMonkRevivalPercent", text: "Revival Percent", min: 0, max: 100, default: 50 },
        { type: "slider", uid: "MWMonkRevivalCount", text: "Revival Minimum Targets", min: 1, max: 10, default: 4 },
        { type: "slider", uid: "MWMonkChiJiPercent", text: "Chi-Ji Percent", min: 0, max: 100, default: 80 },
        { type: "slider", uid: "MWMonkChiJiCount", text: "Chi-Ji Minimum Targets", min: 1, max: 10, default: 2 },
        { type: "slider", uid: "MWMonkCelestialConduitPercent", text: "Celestial Conduit Percent", min: 0, max: 100, default: 70 },
        { type: "slider", uid: "MWMonkCelestialConduitCount", text: "Celestial Conduit Minimum Targets", min: 1, max: 10, default: 3 },
      ]
    }
  ];

  stopManaTeaAtFullMana() {
    return new bt.Decorator(
      ret => {
        const isManaTea = me.currentChannel === 115294;
        const isFullMana = me.pctPower === 100;
        return isManaTea && isFullMana;
      },
      new bt.Action(() => {
        me.stopCasting();
      })
    );
  }

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForNotSitting(),
      this.stopManaTeaAtFullMana(),
      common.waitForCastOrChannel(),
      spell.interrupt("Spear Hand Strike"),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          spell.dispel("Detox", true, 1, false, WoWDispelType.Magic),
          spell.cast("Jadefire stomp", on => combat.bestTarget, req => !me.hasAura(auras.ancientTeachings) && me.isWithinMeleeRange(combat.bestTarget)),
          spell.cast("Renewing Mist", on => heal.priorityList.find(unit => !unit.hasAura(auras.renewingMist))),
          spell.cast("Sheilun's Gift",
            on => heal.priorityList.find(unit => unit.pctHealth < Settings.MWMonkSheilunsGiftPercent),
            req => heal.priorityList.filter(unit => unit.pctHealth < Settings.MWMonkSheilunsGiftPercent).length >= Settings.MWMonkSheilunsGiftCount &&
              me.getAuraStacks(auras.sheilunsGift) > 4
          ),
          spell.cast("Celestial Conduit", on => me, req => heal.priorityList.filter(unit => unit.pctHealth < Settings.MWMonkCelestialConduitPercent).length >= Settings.MWMonkCelestialConduitCount),
          spell.cast("Invoke Chi-Ji, the Red Crane", on => me, req => heal.priorityList.filter(unit => unit.pctHealth < Settings.MWMonkChiJiPercent).length >= Settings.MWMonkChiJiCount),
          spell.cast("Revival", on => me, req => heal.priorityList.filter(unit => unit.pctHealth < Settings.MWMonkRevivalPercent).length >= Settings.MWMonkRevivalCount),
          spell.cast("Life Cocoon", on => heal.priorityList.find(unit => unit.pctHealth < Settings.MWMonkLifeCocoonPercent)),
          spell.cast("Enveloping Mist",
            on => heal.priorityList.find(unit =>
              (unit.pctHealth < Settings.MWMonkEnvelopingMistPercent && !unit.hasAuraByMe(auras.envelopingMist)) ||
              (me.getAuraStacks(auras.chiJi) === 3 && !unit.hasAuraByMe(auras.envelopingMist))
            )
          ),
          spell.cast("Vivify", on => heal.priorityList.find(unit => unit.pctHealth < Settings.MWMonkVivifyPercent)),
          spell.cast("Mana Tea", on => me, req => me.getAuraStacks(auras.manaTea) > 10 && me.pctPower < 80),
          spell.cast("Thunder Focus Tea", on => me),
          spell.cast("Spinning Crane Kick", on => me, req => combat.getUnitsAroundUnit(me, 10).length >= 4 || me.hasAura(auras.danceOfChiji) && me.isWithinMeleeRange(combat.bestTarget)),
          spell.cast("Rising Sun Kick", on => combat.bestTarget),
          spell.cast("Chi Burst", on => combat.bestTarget),
          spell.cast("Touch of Death", on => combat.targets.find(unit => unit.health < me.health && me.isWithinMeleeRange(unit)), { skipUsableCheck: true }),
          spell.cast("Expel Harm", on => me, req => me.pctHealth < Settings.MWMonkExpelHarmPercent),
          spell.cast("Blackout Kick", on => combat.bestTarget, req => me.hasAura(auras.teachingsOfTheMonastery)),
          spell.cast("Tiger Palm", on => combat.bestTarget),
        )
      )
    );
  }
}
