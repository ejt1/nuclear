import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import { me } from "@/Core/ObjectManager";
import { PowerType } from "@/Enums/PowerType";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";
import { defaultHealTargeting as heal } from "@/Targeting/HealTargeting";
import Settings from "@/Core/Settings";

const HEALING_RAIN_RADIUS = 11;
const HEALING_STREAM_TOTEM_RANGE = 30;

export class ShamanRestorationBehavior extends Behavior {
  name = "Restoration Shaman";
  context = BehaviorContext.Any;
  specialization = Specialization.Shaman.Restoration;
  version = wow.GameVersion.Retail;

  static settings = [
    { type: "slider", uid: "RestoShamanEmergencyHealingThreshold", text: "Emergency Healing Threshold", min: 0, max: 100, default: 30 },
    { type: "slider", uid: "RestoShamanAncestralGuidanceThreshold", text: "Ancestral Guidance Threshold", min: 0, max: 100, default: 40 },
    { type: "slider", uid: "RestoShamanAscendanceThreshold", text: "Ascendance Threshold", min: 0, max: 100, default: 40 },
    { type: "slider", uid: "RestoShamanRiptideThreshold", text: "Riptide Threshold", min: 0, max: 100, default: 70 },
    { type: "slider", uid: "RestoShamanHealingSurgeThreshold", text: "Healing Surge Threshold", min: 0, max: 100, default: 50 },
    { type: "slider", uid: "RestoShamanHealingWaveThreshold", text: "Healing Wave Threshold", min: 0, max: 100, default: 50 },
    { type: "slider", uid: "RestoShamanPrimordialWaveThreshold", text: "Primordial Wave Threshold", min: 0, max: 100, default: 40 },
    { type: "slider", uid: "RestoShamanChainHealThreshold", text: "Chain Heal Threshold", min: 0, max: 100, default: 60 },
  ];

  build() {
    return new bt.Selector(
      spell.interrupt("Wind Shear"),
      spell.cast("Earth Shield", on => this.getTank()),
      new bt.Decorator(
        common.waitForTarget(),
        common.ensureAutoAttack()
      ),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          common.waitForNotMounted(),
          common.waitForCastOrChannel(),
          this.emergencyHealing(),
          this.healingRotation(),
          this.damageRotation()
        )
      )
    );
  }

  emergencyHealing() {
    return new bt.Selector(
      spell.cast("Nature's Swiftness"),
      spell.cast("Healing Wave", on => this.getLowestHealthAlly(), req => me.hasAura("Nature's Swiftness")),
      spell.cast("Primordial Wave", on => this.getLowestHealthAlly(), req => this.getLowestHealthPercentage() < Settings.RestoShamanPrimordialWaveThreshold),
      spell.cast("Spirit Link Totem", on => this.getLowestHealthAlly(), req => this.getDamagedAlliesCount(12) >= 3),
      spell.cast("Healing Tide Totem"),
      spell.cast("Ancestral Guidance", req => this.getLowestHealthPercentage() < Settings.RestoShamanAncestralGuidanceThreshold),
      spell.cast("Ascendance", req => this.getLowestHealthPercentage() < Settings.RestoShamanAscendanceThreshold)
    );
  }

  healingRotation() {
    return new bt.Selector(
      spell.cast("Riptide", on => this.getAllyNeedingRiptide()),
      spell.cast("Chain Heal", on => this.getLowestHealthAlly(), req => this.getDamagedAlliesCount() >= 3 && this.getAverageDamagedHealthPercentage() < Settings.RestoShamanChainHealThreshold),
      spell.cast("Healing Surge", on => this.getLowestHealthAlly(), req => this.getLowestHealthPercentage() < Settings.RestoShamanHealingSurgeThreshold),
      spell.cast("Healing Wave", on => this.getLowestHealthAlly(), req => this.getLowestHealthPercentage() < Settings.RestoShamanHealingWaveThreshold),
      spell.cast("Healing Rain", on => this.getBestHealingRainTarget()),
      spell.cast("Healing Stream Totem", req => !this.isHealingStreamTotemNearby()),
      spell.cast("Wellspring", on => this.getLowestHealthAlly()),
      spell.cast("Downpour", on => this.getBestDownpourTarget())
    );
  }

  damageRotation() {
    return new bt.Selector(
      spell.cast("Flame Shock", on => combat.bestTarget, req => !combat.bestTarget.hasAura("Flame Shock")),
      spell.cast("Lava Burst", on => combat.bestTarget),
      spell.cast("Chain Lightning", on => combat.bestTarget, req => this.getEnemiesInRange(10) >= 3),
      spell.cast("Lightning Bolt", on => combat.bestTarget)
    );
  }

  getTank() {
    return heal.friends.Tanks[0] || null;
  }

  getLowestHealthAlly() {
    return heal.friends.All.sort((a, b) => a.pctHealth - b.pctHealth)[0] || null;
  }

  getLowestHealthPercentage() {
    const lowestHealthAlly = this.getLowestHealthAlly();
    return lowestHealthAlly ? lowestHealthAlly.pctHealth * 100 : 100;
  }

  getAllyNeedingRiptide() {
    return heal.friends.All.find(ally => 
      ally.pctHealth < Settings.RestoShamanRiptideThreshold && !ally.hasAura("Riptide")
    ) || null;
  }

  getDamagedAlliesCount(range = 40) {
    return heal.friends.All.filter(ally => 
      ally.pctHealth < 100 && ally.distanceTo(me) <= range
    ).length;
  }

  getAverageDamagedHealthPercentage() {
    const damagedAllies = heal.friends.All.filter(ally => ally.pctHealth < 100);
    if (damagedAllies.length === 0) return 100;
    const totalHealth = damagedAllies.reduce((sum, ally) => sum + ally.pctHealth, 0);
    return (totalHealth / damagedAllies.length) * 100;
  }

  getBestHealingRainTarget() {
    return heal.friends.All.reduce((best, current) => {
      const alliesNear = this.getAlliesInRange(current, HEALING_RAIN_RADIUS);
      if (alliesNear.length > (best ? this.getAlliesInRange(best, HEALING_RAIN_RADIUS).length : 0)) {
        return current;
      }
      return best;
    }, null);
  }

  isHealingStreamTotemNearby() {
    // This is a simplified check. In a real implementation, you'd need to check for actual totem objects.
    return me.hasAura("Healing Stream Totem");
  }

  getBestDownpourTarget() {
    return this.getBestHealingRainTarget(); // Simplified, you might want to refine this based on specific Downpour mechanics
  }

  getAlliesInRange(unit, range) {
    return heal.friends.All.filter(ally => ally.distanceTo(unit) <= range);
  }

  getEnemiesInRange(range) {
    return combat.targets.filter(enemy => enemy.distanceTo(me) <= range);
  }
}
