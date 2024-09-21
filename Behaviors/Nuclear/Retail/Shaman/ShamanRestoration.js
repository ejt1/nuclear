import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import objMgr, { me } from "@/Core/ObjectManager";
import { PowerType } from "@/Enums/PowerType";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";
import { defaultHealTargeting as heal } from "@/Targeting/HealTargeting";
import Settings from "@/Core/Settings";
import { DispelPriority } from "@/Data/Dispels";
import { WoWDispelType } from "@/Enums/Auras";

const HEALING_RAIN_RADIUS = 11;
const HEALING_STREAM_TOTEM_RANGE = 30;
const HEALING_RAIN_COOLDOWN = 5000; // 500ms cooldown, adjust as needed

export class ShamanRestorationBehavior extends Behavior {
  name = "Restoration Shaman";
  context = BehaviorContext.Any;
  specialization = Specialization.Shaman.Restoration;
  version = wow.GameVersion.Retail;
  lastHealingStreamTotemCast = 0;
  lastHealingRainCast = 0;
  lastHealingStreamTotemCast = 0;
  //static HEALING_STREAM_TOTEM_COOLDOWN = 18000;
  static HEALING_STREAM_TOTEM_NAME = "Healing Stream Totem";

  static settings = [
    { type: "slider", uid: "RestoShamanEmergencyHealingThreshold", text: "Emergency Healing Threshold", min: 0, max: 100, default: 30 },
    { type: "slider", uid: "RestoShamanAncestralGuidanceThreshold", text: "Ancestral Guidance Threshold", min: 0, max: 100, default: 40 },
    { type: "slider", uid: "RestoShamanAscendanceThreshold", text: "Ascendance Threshold", min: 0, max: 100, default: 40 },
    { type: "slider", uid: "RestoShamanSpiritLinkThreshold", text: "Spirit Link Totem Threshold", min: 0, max: 100, default: 30 },
    { type: "slider", uid: "RestoShamanRiptideThreshold", text: "Riptide Threshold", min: 0, max: 100, default: 70 },
    { type: "slider", uid: "RestoShamanHealingSurgeThreshold", text: "Healing Surge Threshold", min: 0, max: 100, default: 50 },
    { type: "slider", uid: "RestoShamanHealingWaveThreshold", text: "Healing Wave Threshold", min: 0, max: 100, default: 50 },
    { type: "slider", uid: "RestoShamanPrimordialWaveThreshold", text: "Primordial Wave Threshold", min: 0, max: 100, default: 40 },
    { type: "slider", uid: "RestoShamanChainHealThreshold", text: "Chain Heal Threshold", min: 0, max: 100, default: 60 },
  ];

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForCastOrChannel(),
      spell.cast("Skyfury", on => me, req => !me.hasVisibleAura("Skyfury") && !me.hasVisibleAura("Ghost Wolf")),
      spell.cast("Water Shield", on => me, req => !me.hasVisibleAura("Water Shield") && !me.hasVisibleAura("Ghost Wolf")),
      spell.cast("Earth Shield", on => me, req => !me.hasVisibleAura("Earth Shield") && !me.hasVisibleAura("Ghost Wolf")),
      spell.cast("Earthliving Weapon", on => me, req => !me.hasAura(382022) && !me.hasVisibleAura("Ghost Wolf")),
      spell.cast("Astral Shift", req => me.inCombat() && me.pctHealth < 40 && !me.hasVisibleAura("Ghost Wolf")),
      spell.cast("Stone Bulwark Totem", req => me.inCombat() && me.pctHealth < 40 && !me.hasVisibleAura("Astral Shift") && !me.hasVisibleAura("Ghost Wolf")),
      spell.cast("Earth Elemental", req => {
        const tank = this.getTank();
        return me.inCombat() && tank && tank.pctHealth < 20 && !me.hasVisibleAura("Ghost Wolf");
      }),
      spell.interrupt("Wind Shear"),
      spell.dispel("Poison Cleansing Totem", true, DispelPriority.Low, false, WoWDispelType.Poison),
      spell.dispel("Purify Spirit", true, DispelPriority.Low, false, WoWDispelType.Magic),
      spell.dispel("Purify Spirit", true, DispelPriority.Low, false, WoWDispelType.Curse),
      spell.cast("Earth Shield", on => this.getTank(), req => {
        const tank = this.getTank();
        return tank && !tank.hasAura("Earth Shield") && !me.hasVisibleAura("Ghost Wolf");
      }),
      // Emergency healing check
      new bt.Decorator(
        () => this.isEmergencyHealingNeeded() && (me.inCombat() || this.getTank() && this.getTank().inCombat()),
        this.emergencyHealing()
      ),
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          new bt.Decorator(
            () => this.isHealingNeeded() && (me.inCombat() || this.getTank() && this.getTank().inCombat() || this.getLowestHealthAlly() && this.getLowestHealthAlly().pctHealth < 90),
            new bt.Selector(
              this.manageTotemProjection(),
              this.healingRotation()
            )
          ),
          new bt.Decorator(
            () => !this.isHealingNeeded() && (me.inCombat() || this.getTank() && this.getTank().inCombat()),
            new bt.Selector(
              this.damageRotation()
            )
          ),
        )
      )
    );
  }
  
  isHealingNeeded() {
    const lowestHealth = this.getLowestHealthPercentage();
    return lowestHealth <= 100 || 
           lowestHealth < Settings.RestoShamanEmergencyHealingThreshold ||
           lowestHealth < Settings.RestoShamanAncestralGuidanceThreshold ||
           lowestHealth < Settings.RestoShamanAscendanceThreshold ||
           lowestHealth < Settings.RestoShamanRiptideThreshold ||
           lowestHealth < Settings.RestoShamanHealingSurgeThreshold ||
           lowestHealth < Settings.RestoShamanHealingWaveThreshold ||
           lowestHealth < Settings.RestoShamanPrimordialWaveThreshold ||
           lowestHealth < Settings.RestoShamanChainHealThreshold;
  }

  isEmergencyHealingNeeded() {
    const lowestHealth = this.getLowestHealthPercentage();
    return me.inCombat() && this.getLowestHealthAlly().inCombat() &&
           lowestHealth <= Settings.RestoShamanEmergencyHealingThreshold;
  }
  
  emergencyHealing() {
    return new bt.Selector(
      spell.cast("Nature's Swiftness", on => me),
      spell.cast("Healing Surge", on => this.getLowestHealthAlly(), req => me.hasAura("Nature's Swiftness")),
      spell.cast("Healing Tide Totem"),
      spell.cast("Spirit Link Totem", on => this.getBestSpiritLinkTarget(), req => this.shouldUseSpiritLinkTotem()),
      spell.cast("Ascendance", req => this.getLowestHealthPercentage() < Settings.RestoShamanAscendanceThreshold),
      spell.cast("Ancestral Guidance", req => this.getLowestHealthPercentage() < Settings.RestoShamanAncestralGuidanceThreshold),
      spell.cast("Healing Surge", on => this.getLowestHealthAlly())
    );
  }

  healingRotation() {
    return new bt.Selector(
      new bt.Decorator(
        () => me.inCombat() && this.getLowestHealthAlly() && 
              this.getLowestHealthAlly().inCombat() && 
              this.getLowestHealthAlly().pctHealth <= Settings.RestoShamanEmergencyHealingThreshold,
        this.emergencyHealing()
      ),
      new bt.Decorator(
        () => !this.isHealingStreamTotemNearby() && this.canCastHealingStreamTotem(),
        spell.cast("Healing Stream Totem", on => me)
      ),
      new bt.Decorator(
        () => !this.isHealingRainActive() && wow.frameTime - this.lastHealingRainCast > HEALING_RAIN_COOLDOWN,
        new bt.Selector(
          spell.cast("Healing Rain", on => this.getBestHealingRainTarget(), req => {
            const target = this.getBestHealingRainTarget();
            return target && target.pctHealth < 90;
          }),
          new bt.Action(() => {
            this.lastHealingRainCast = wow.frameTime;
            return bt.Status.Success;
          })
        )
      ),

      // cast healing rain on tank if they are in combat and i have aura Surging Totem
      spell.cast("Healing Rain", on => this.getLowestHealthAlly(), req => {
        const tank = this.getTank();
        return tank && tank.inCombat() && me.hasAura("Surging Totem");
      }),
      spell.cast("Riptide", on => this.getAllyNeedingRiptide()),
      spell.cast("Primordial Wave", on => this.getLowestHealthAlly(), req => {
        const lowestHealthAlly = this.getLowestHealthAlly();
        return lowestHealthAlly && lowestHealthAlly.pctHealth < Settings.RestoShamanPrimordialWaveThreshold;
      }),
      spell.cast("Chain Heal", on => this.getLowestHealthAlly(), req => {
        const lowestHealthAlly = this.getLowestHealthAlly();
        if (!lowestHealthAlly) return false;
        const alliesNearby = this.getAlliesInRange(lowestHealthAlly, 12);
        return alliesNearby.length >= 2 && 
               this.getAverageHealthPercentage(alliesNearby) < Settings.RestoShamanChainHealThreshold;
      }),
      spell.cast("Healing Surge", on => this.getLowestHealthAlly(), req => {
        const lowestHealthAlly = this.getLowestHealthAlly();
        return lowestHealthAlly && lowestHealthAlly.pctHealth < Settings.RestoShamanHealingSurgeThreshold;
      }),
      spell.cast("Healing Wave", on => this.getLowestHealthAlly(), req => {
        const lowestHealthAlly = this.getLowestHealthAlly();
        return lowestHealthAlly && lowestHealthAlly.pctHealth < Settings.RestoShamanHealingWaveThreshold;
      }),
      spell.cast("Wellspring", on => this.getLowestHealthAlly()),
      // spell.cast("Downpour", on => this.getBestDownpourTarget(), req => {
      //   const target = this.getBestHealingRainTarget();
      //   const currentTarget = this.getCurrentTarget();
      //   return target && currentTarget && target.pctHealth < 90 && target.distanceTo(currentTarget) <= 10;
      // })
    );
  }

  damageRotation() {
    return new bt.Selector(
      spell.cast("Lava Burst", on => this.getLavaBurstTarget(), req => me.hasVisibleAura("Lava Surge") && this.getLavaBurstTarget() !== null),
      spell.cast("Flame Shock", on => this.getFlameShockTarget(), req => this.getFlameShockTarget() !== null),
      new bt.Decorator(
        () => !this.isHealingRainActive() && wow.frameTime - this.lastHealingRainCast > HEALING_RAIN_COOLDOWN,
        new bt.Selector(
          spell.cast("Healing Rain", on => this.getCurrentTarget(), req => {
            const target = this.getCurrentTarget();
            return target && me.getAttackableUnitsAroundUnitCount(target, 10) >= 3 && me.hasAura("Acid Rain");
          }),
          new bt.Action(() => {
            this.lastHealingRainCast = wow.frameTime;
            return bt.Status.Success;
          })
        )
      ),
      spell.cast("Chain Lightning", on => this.getCurrentTarget(), req => {
        const target = this.getCurrentTarget();
        return target && me.getAttackableUnitsAroundUnitCount(target, 10) >= 3;
      }),
      spell.cast("Lava Burst", on => this.getLavaBurstTarget(), req => this.getLavaBurstTarget() !== null),
      spell.cast("Lightning Bolt", on => this.getCurrentTarget())
    );
  }
  
  manageTotemProjection() {
    return new bt.Selector(
      spell.cast("Totemic Projection", req => {
        const healingRain = this.getTotemByName("Surging Totem");
        const spiritLink = this.getTotemByName("Spirit Link Totem");
        const healingStream = this.getTotemByName("Healing Stream Totem");

        if (healingRain && me.hasAura("Surging Totem") && this.shouldMoveTotem(healingRain, HEALING_RAIN_RADIUS)) {
          return true;
        }

        if (spiritLink && this.shouldMoveTotem(spiritLink, 12)) {
          return true;
        }

        return false;
      })
    );
  }

  getTotemByName(totemName) {
    let totem = null;
    objMgr.objects.forEach(obj => {
      if (obj instanceof wow.CGUnit && 
          obj.name === totemName && 
          obj.createdBy && obj.createdBy.equals(me.guid)) {
        totem = obj;
        return false; // Break the loop
      }
    });
    return totem;
  }

  shouldMoveTotem(totem, desiredRange) {
    const alliesInRange = this.getAlliesInRange(totem, desiredRange);
    return alliesInRange.length === 0;
  }

  isHealingStreamTotemNearby() {
    const totem = this.getTotemByName("Healing Stream Totem");
    if (totem) {
      const distance = me.distanceTo(totem);
      //console.info(`Healing Stream Totem found. Distance: ${distance.toFixed(2)} yards, Range: ${HEALING_STREAM_TOTEM_RANGE} yards`);
      if (distance <= HEALING_STREAM_TOTEM_RANGE) {
        this.lastHealingStreamTotemCast = wow.frameTime; // Update last cast time
        return true;
      }
    }
    // console.info("No Healing Stream Totem found");
    return false;
  }

  canCastHealingStreamTotem() {
    const currentTime = wow.frameTime;
    const timeSinceLastCast = currentTime - this.lastHealingStreamTotemCast;
    return timeSinceLastCast >= 1500; // 1500ms = 1.5s
  }

  isHealingRainActive() {
    const totem = this.getTotemByName("Healing Rain");
    if (totem) {
      const alliesInRange = this.getAlliesInRange(totem, HEALING_RAIN_RADIUS);
      // console.info(`Healing Rain found. Allies in range: ${alliesInRange.length}`);
      return alliesInRange.length > 0;
    }
    // console.info("No Healing Rain found");
    return false;
  }

  isSpiritLinkTotemActive() {
    const totem = this.getTotemByName("Spirit Link Totem");
    if (totem) {
      const alliesInRange = this.getAlliesInRange(totem, 12);
      // console.info(`Spirit Link Totem found. Allies in range: ${alliesInRange.length}`);
      return alliesInRange.length > 0;
    }
    // console.info("No Spirit Link Totem found");
    return false;
  }

  getAlliesInRange(unit, range) {
    let allies = heal.friends.All.filter(ally => ally && ally.distanceTo(unit) <= range);
    
    // Check if 'me' is already in the list
    const selfIncluded = allies.some(ally => ally.guid.equals(me.guid));
    
    // If 'me' is not in the list and is within range, add it
    if (!selfIncluded && me.distanceTo(unit) <= range) {
      allies.push(me);
    }
    
    return allies;
  }
  
  getAverageHealthPercentage(allies) {
    if (allies.length === 0) return 100;
    const totalHealth = allies.reduce((sum, ally) => sum + (ally ? ally.pctHealth : 0), 0);
    return totalHealth / allies.length;
  }

  getTank() {
    return heal.friends.Tanks[0] || me; // Fallback to 'me' if no tank is found
  }

  getLowestHealthAlly() {
    let allies = [...heal.friends.All];
    if (!allies.some(ally => ally.guid.equals(me.guid))) {
      allies.push(me);
    }
    return allies.sort((a, b) => (a ? a.pctHealth : 100) - (b ? b.pctHealth : 100))[0] || null;
  }

  getLowestHealthPercentage() {
    const lowestHealthAlly = this.getLowestHealthAlly();
    return lowestHealthAlly ? lowestHealthAlly.pctHealth : 100;
  }

  getAllyNeedingRiptide() {
    return heal.friends.All.find(ally => 
      ally && ally.pctHealth < Settings.RestoShamanRiptideThreshold && !ally.hasAura("Riptide")
    ) || null;
  }

  getDamagedAlliesCount(range = 40) {
    const lowestHealthAlly = this.getLowestHealthAlly();
    return lowestHealthAlly ? heal.friends.All.filter(ally => 
      ally && ally.pctHealth < 100 && ally.distanceTo(lowestHealthAlly) <= range
    ).length : 0;
  }

  bestTarget() {
    return combat.bestTarget || me.target;
  }

  getCurrentTarget() {
    const targetPredicate = unit => 
      unit && common.validTarget(unit) && 
      unit.distanceTo(me) <= 30 && 
      me.isFacing(unit);

    const target = me.target;
    if (target !== null && targetPredicate(target)) {
      return target;
    }
    return combat.targets.find(targetPredicate) || null;
  }

  getFlameShockTarget() {
    if (me.target && me.targetUnit && !me.targetUnit.hasAuraByMe("Flame Shock")) {
      return me.target;
    }

    const units = me.getUnitsAround(30);
    return units.find(unit => unit && !unit.hasAuraByMe("Flame Shock") && me.isFacing(unit) && me.canAttack(unit)) || null;
  }

  getLavaBurstTarget() {
    if (me.target && me.targetUnit && me.targetUnit.hasAuraByMe("Flame Shock")) {
      return me.target;
    }

    const units = me.getUnitsAround(30);
    return units.find(unit => unit && unit.hasAuraByMe("Flame Shock") && me.isFacing(unit) && me.canAttack(unit)) || null;
  }

  getAlliesInRange(unit, range) {
    let allies = heal.friends.All.filter(ally => ally && ally.distanceTo(unit) <= range);
    if (!allies.some(ally => ally.guid.equals(me.guid)) && me.distanceTo(unit) <= range) {
      allies.push(me);
    }
    return allies;
  }

  getBestHealingRainTarget() {
    return heal.friends.All.reduce((best, current) => {
      if (!current) return best;
      const alliesNear = this.getAlliesInRange(current, HEALING_RAIN_RADIUS);
      if (alliesNear.length > (best ? this.getAlliesInRange(best, HEALING_RAIN_RADIUS).length : 0)) {
        return current;
      }
      return best;
    }, null);
  }

  getBestSpiritLinkTarget() {
    return heal.friends.All.reduce((best, current) => {
      if (!current) return best;
      const alliesNear = this.getAlliesInRange(current, 12);
      if (alliesNear.length > (best ? this.getAlliesInRange(best, 12).length : 0)) {
        return current;
      }
      return best;
    }, null);
  }

  shouldUseSpiritLinkTotem() {
    const alliesInDanger = heal.friends.All.filter(ally => ally && ally.pctHealth < Settings.RestoShamanSpiritLinkThreshold && this.getAlliesInRange(ally, 12).length >= 3);
    return alliesInDanger;
  }

  getBestDownpourTarget() {
    return this.getBestHealingRainTarget(); // Using the same logic as Healing Rain for now
  }
}