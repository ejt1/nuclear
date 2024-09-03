import Settings from '@/Core/Settings';
import objMgr, { me } from "@/Core/ObjectManager";
import { ShapeshiftForm } from '@/Enums/UnitEnums';
import { UnitFlags } from '@/Enums/Flags';
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";

class Autolooter {
  static options = [
    { type: "checkbox", uid: "ExtraAutoloot", text: "Enable Autoloot", default: false },
    { type: "checkbox", uid: "ExtraSkinning", text: "Enable Skinning", default: false },
    { type: "checkbox", uid: "ExtraBreakStealth", text: "Break Stealth", default: false },
    { type: "checkbox", uid: "ExtraIgnoreEnemies", text: "Loot in proximity", default: false },
    { type: "slider", uid: "LootCacheReset", text: wow.isClassic ? "Cache Reset (MS)" : "Pulse Time (MS)", default: 1500, min: 0, max: 10000 }
  ];

  static tabName = "Autoloot";

  static renderOptions(renderFunction) {
    renderFunction([{ header: "Autoloot Settings", options: this.options }]);
  }

  static looted = new Set();
  static lastLoot = 0;

  static isInStealth() {
    return me.shapeshiftForm === ShapeshiftForm.Stealth ||
      (me.shapeshiftForm === ShapeshiftForm.Cat && me.hasAura("Prowl"));
  }

  static getLootableUnit() {
    let lootableUnit = null;
    objMgr.objects.forEach((obj) => {
      if (obj instanceof wow.CGUnit && obj.dead) {
        const inRange = me.isWithinMeleeRange(obj) || me.distanceTo(obj.position) < 6;
        const isLootable = obj.isLootable;
        const isSkinnable = Settings.ExtraSkinning && (obj.unitFlags & UnitFlags.SKINNABLE) > 0;

        if (inRange && (isLootable || isSkinnable)) {
          lootableUnit = obj;
          return;
        }
      }
    });
    return lootableUnit;
  }

  static shouldLoot() {
    return Settings.ExtraAutoloot &&
      (Settings.ExtraBreakStealth || !this.isInStealth()) &&
      !me.isMoving() &&
      !me.isCastingOrChanneling &&
      !me.isMounted &&
      (Settings.ExtraIgnoreEnemies || !me.inCombat || combat.targets.find(unit => unit.distanceTo(me) <= 8 || me.isWithinMeleeRange(unit)) === undefined );
  }

  static autoloot() {
    if (!this.shouldLoot()) return;

    const currentTime = wow.frameTime;
    const timeSinceLastLoot = currentTime - this.lastLoot;

    if (timeSinceLastLoot > Settings.LootCacheReset && this.looted.size > 0) {
      this.looted.clear();
      this.lastLoot = currentTime;
    }

    if (wow.gameVersion === 0) {
      this.autolootClassic();
    } else if (wow.gameVersion === 1) {
      this.autolootRetail();
    }
  }

  static autolootClassic() {
    objMgr.objects.forEach(obj => {
      if (!(obj instanceof wow.CGUnit) || !obj.dead || !me.inInteractRange(obj) || this.looted.has(obj.guid)) return;

      const isLootable = obj.isLootable;
      const isSkinnable = Settings.ExtraSkinning && (obj.unitFlags & UnitFlags.Skinnable) > 0;

      if (isLootable || isSkinnable) {
        obj.interact();
        this.looted.add(obj.guid);
      }
    });
  }

  static autolootRetail() {
    const lootUnit = this.getLootableUnit();
    if (lootUnit && wow.frameTime > this.lastLoot) {
      lootUnit.interact();
      this.lastLoot = wow.frameTime + Settings.LootCacheReset;
    }
  }

  static tick() {
    this.autoloot();
  }
}

export default Autolooter;
