import { Behavior, BehaviorContext } from "../../../../Core/Behavior";
import * as bt from '../../../../Core/BehaviorTree';
import Specialization from '../../../../Enums/Specialization';
import common from '../../../../Core/Common';
import spell from "../../../../Core/Spell";
import { me } from "../../../../Core/ObjectManager";

const auras = {
  arcaneIntellect: 1459,
  icyVeins: 12472,
  brainFreeze: 190446,
  fingersOfFrost: 44544,
  wintersChill: 228358,
  icicles: 205473,
  freezingRain: 270232,
  frozenOrb: 84714,
  splinterstorm: 443742,
};

export class MageFrostBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Mage.Frost;
  version = wow.GameVersion.Retail;

  lastSpellCast = null;
  currentActionList = "None";

  debug(message) {
    console.log(`[FrostMage Debug] ${message}`);
  }

  ensureArcaneIntellect() {
    const hasArcaneIntellect = me.hasAura(auras.arcaneIntellect);
    this.debug(`Checking Arcane Intellect - hasAura: ${hasArcaneIntellect}`);
    
    if (!hasArcaneIntellect) {
        const result = this.castAndTrack("Arcane Intellect", me);
        this.debug(`Result of casting Arcane Intellect: ${result}`);
        return result;
    }
    return bt.Status.Success;
  }

  castAndTrack(spellName, target, condition = () => true) {
    this.debug(`Attempting to cast: ${spellName}`);

    // Ensure the condition is a function
    if (typeof condition !== 'function') {
        this.debug(`Error: Condition for ${spellName} is not a function. Skipping cast.`);
        return bt.Status.Failure;
    }

    // Check the condition, returning false if any part is undefined or null
    const conditionResult = condition();
    const isValidCondition = conditionResult !== undefined && conditionResult !== null && conditionResult !== false;
    this.debug(`Condition for ${spellName}: ${conditionResult} (Valid: ${isValidCondition})`);

    if (isValidCondition) {
        const result = spell.cast(spellName, target);
        this.debug(`Result of casting ${spellName}: ${result}`);
        if (result === bt.Status.Success) {
            this.lastSpellCast = spellName;
            this.debug(`Successfully cast: ${spellName}`);
        } else {
            this.debug(`Failed to cast: ${spellName}`);
        }
        return result;
    } else {
        this.debug(`Skipping ${spellName} due to failed or invalid condition.`);
        return bt.Status.Failure;
    }
  }

  getPreviousSpell(spellName) {
    return this.lastSpellCast === spellName;
  }

  build() {
    return new bt.Decorator(
      ret => !spell.isGlobalCooldown(),
      new bt.Sequence(
        new bt.Action(this.ensureArcaneIntellect.bind(this)),
        new bt.Selector(
          common.waitForTarget(),
          common.waitForCastOrChannel(),
          common.waitForFacing(),
          this.callCooldowns(),
          this.executeActionLists()
        )
      )
    );
  }

  callCooldowns() {
    this.debug("Checking cooldowns");
    return new bt.Selector(
      this.castAndTrack("Flurry", () => me.targetUnit, () => Boolean(me.targetUnit && me.targetUnit.getUnitsAroundCount(12) <= 2)),
      this.castAndTrack("Icy Veins", () => me),
      this.castAndTrack("Blood Fury"),
      this.castAndTrack("Berserking"),
      this.castAndTrack("Lights Judgment"),
      this.castAndTrack("Fireblood"),
      this.castAndTrack("Ancestral Call")
    );
  }

  executeActionLists() {
    this.debug(`Current Icicles stacks: ${me.getAuraStacks(auras.icicles)}`);
    return new bt.Selector(
      new bt.Decorator(
        () => this.shouldRunAoe(),
        this.aoeActionList()
      ),
      new bt.Decorator(
        () => this.shouldRunCleave(),
        this.cleaveActionList()
      ),
      new bt.Decorator(
        () => this.shouldRunSsSt(),
        this.ssStActionList()
      ),
      new bt.Decorator(
        () => this.shouldRunSt(),
        this.stActionList()
      )
    );
  }

  shouldRunAoe() {
    const enemiesAround = me.targetUnit ? me.targetUnit.getUnitsAroundCount(8) : 0;
    const shouldRun = (enemiesAround >= 7) || (enemiesAround >= 4);
    if (shouldRun) {
      this.currentActionList = "AoE";
      this.debug("Switching to AoE action list");
    }
    return shouldRun;
  }

  aoeActionList() {
    return new bt.Selector(
      this.castAndTrack("Cone of Cold", () => me.targetUnit, () => Boolean(this.getPreviousSpell("Comet Storm") || this.getPreviousSpell("Frozen Orb"))),
      this.castAndTrack("Frozen Orb", () => me.targetUnit, () => Boolean(!this.getPreviousSpell("Glacial Spike"))),
      this.castAndTrack("Blizzard", () => me.targetUnit, () => Boolean(!this.getPreviousSpell("Glacial Spike"))),
      this.castAndTrack("Frostbolt", () => me.targetUnit, () => Boolean(me.hasAura(auras.icyVeins) && (me.getAuraStacks(auras.fingersOfFrost) < 9 || me.getAuraStacks(auras.fingersOfFrost) === 9))),
      this.castAndTrack("Comet Storm", () => me.targetUnit, () => Boolean(!this.getPreviousSpell("Glacial Spike"))),
      this.castAndTrack("Freeze", () => me.targetUnit),
      this.castAndTrack("Ice Nova", () => me.targetUnit, () => Boolean(this.getPreviousSpell("Glacial Spike"))),
      this.castAndTrack("Frost Nova", () => me.targetUnit, () => Boolean(this.getPreviousSpell("Glacial Spike") && !me.targetUnit.hasAura(auras.wintersChill))),
      this.castAndTrack("Shifting Power", () => me),
      this.castAndTrack("Flurry", () => me.targetUnit, () => Boolean(!me.targetUnit.hasAura(auras.wintersChill) && me.getAuraStacks(auras.icicles) === 4)),
      this.castAndTrack("Glacial Spike", () => me.targetUnit, () => Boolean(me.getAuraStacks(auras.icicles) === 5)),
      this.castAndTrack("Ice Lance", () => me.targetUnit, () => Boolean(me.hasAura(auras.fingersOfFrost))),
      this.castAndTrack("Ice Nova", () => me.targetUnit, () => Boolean(me.targetUnit.getUnitsAroundCount(8) >= 4)),
      this.castAndTrack("Cone of Cold", () => me.targetUnit, () => Boolean(me.targetUnit.getUnitsAroundCount(8) >= 7)),
      this.castAndTrack("Dragon's Breath", () => me.targetUnit, () => Boolean(me.targetUnit.getUnitsAroundCount(8) >= 7)),
      this.castAndTrack("Arcane Explosion", () => me, () => Boolean(me.power > 30 && me.targetUnit.getUnitsAroundCount(8) >= 7)),
      this.castAndTrack("Frostbolt", () => me.targetUnit),
      this.callMovementActionList()
    );
  }

  shouldRunCleave() {
    const enemiesAround = me.targetUnit ? me.targetUnit.getUnitsAroundCount(8) : 0;
    const shouldRun = enemiesAround >= 2 && enemiesAround <= 3;
    if (shouldRun) {
      this.currentActionList = "Cleave";
      this.debug("Switching to Cleave action list");
    }
    return shouldRun;
  }

  cleaveActionList() {
    return new bt.Selector(
      this.castAndTrack("Comet Storm", () => me.targetUnit, () => Boolean(this.getPreviousSpell("Flurry") || this.getPreviousSpell("Cone of Cold"))),
      this.castAndTrack("Flurry", () => me.targetUnit, () => Boolean((this.getPreviousSpell("Frostbolt") && me.getAuraStacks(auras.icicles) >= 3) || this.getPreviousSpell("Glacial Spike"))),
      this.castAndTrack("Ice Lance", () => me.targetUnit, () => Boolean(!me.targetUnit.hasAura(auras.wintersChill) && me.getAuraStacks(auras.icicles) === 4 && me.hasAura(auras.fingersOfFrost))),
      this.castAndTrack("Ray of Frost", () => me.targetUnit, () => Boolean(me.targetUnit.hasAura(auras.wintersChill))),
      this.castAndTrack("Glacial Spike", () => me.targetUnit, () => Boolean(me.getAuraStacks(auras.icicles) === 5 && me.targetUnit.hasAura(auras.wintersChill))),
      this.castAndTrack("Frozen Orb", () => me.targetUnit, () => Boolean(me.getAuraStacks(auras.fingersOfFrost) < 2)),
      this.castAndTrack("Cone of Cold", () => me.targetUnit, () => Boolean(!me.targetUnit.hasAura(auras.wintersChill) && me.targetUnit.getUnitsAroundCount(8) >= 3)),
      this.castAndTrack("Shifting Power", () => me),
      this.castAndTrack("Glacial Spike", () => me.targetUnit, () => Boolean(me.getAuraStacks(auras.icicles) === 5)),
      this.castAndTrack("Ice Lance", () => me.targetUnit, () => Boolean(me.hasAura(auras.fingersOfFrost) && !this.getPreviousSpell("Glacial Spike") || me.targetUnit.hasAura(auras.wintersChill))),
      this.castAndTrack("Ice Nova", () => me.targetUnit, () => Boolean(me.targetUnit.getUnitsAroundCount(8) >= 4)),
      this.castAndTrack("Frostbolt", () => me.targetUnit),
      this.callMovementActionList()
    );
  }

  shouldRunSsSt() {
    const shouldRun = me.hasAura(auras.splinterstorm);
    if (shouldRun) {
      this.currentActionList = "SsSt";
      this.debug("Switching to SsSt action list");
    }
    return shouldRun;
  }

  ssStActionList() {
    return new bt.Selector(
      this.castAndTrack("Flurry", () => me.targetUnit, () => Boolean(!me.targetUnit.hasAura(auras.wintersChill) && this.getPreviousSpell("Frostbolt"))),
      this.castAndTrack("Ice Lance", () => me.targetUnit, () => Boolean(me.hasAura(auras.icyVeins) && me.targetUnit.hasAura(auras.wintersChill))),
      this.castAndTrack("Ray of Frost", () => me.targetUnit, () => Boolean(!me.hasAura(auras.icyVeins) && !me.hasAura("Freezing Winds") && me.targetUnit.hasAura(auras.wintersChill))),
      this.castAndTrack("Frozen Orb", () => me.targetUnit),
      this.castAndTrack("Shifting Power", () => me),
      this.castAndTrack("Ice Lance", () => me.targetUnit, () => Boolean(me.targetUnit.hasAura(auras.wintersChill) || me.hasAura(auras.fingersOfFrost))),
      this.castAndTrack("Comet Storm", () => me.targetUnit, () => Boolean(this.getPreviousSpell("Flurry") || this.getPreviousSpell("Cone of Cold"))),
      this.castAndTrack("Glacial Spike", () => me.targetUnit, () => Boolean(me.getAuraStacks(auras.icicles) === 5)),
      this.castAndTrack("Flurry", () => me.targetUnit, () => Boolean(me.hasAura(auras.icyVeins))),
      this.castAndTrack("Frostbolt", () => me.targetUnit),
      this.callMovementActionList()
    );
  }

  shouldRunSt() {
    if (this.currentActionList !== "ST") {
      this.currentActionList = "ST";
      this.debug("Switching to ST action list");
    }
    return true;
  }

  stActionList() {
    this.debug(`Current Icicles stacks: ${me.getAuraStacks(auras.icicles)}`);
    return new bt.Selector(
      this.castAndTrack("Comet Storm", () => me.targetUnit, () => Boolean(this.getPreviousSpell("Flurry") || this.getPreviousSpell("Cone of Cold"))),
      this.castAndTrack("Flurry", () => me.targetUnit, () => Boolean(!me.targetUnit.hasAura(auras.wintersChill) && ((this.getPreviousSpell("Frostbolt") && me.getAuraStacks(auras.icicles) >= 3) || this.getPreviousSpell("Glacial Spike")))),
      this.castAndTrack("Ray of Frost", () => me.targetUnit, () => Boolean(me.targetUnit.hasAura(auras.wintersChill))),
      this.castAndTrack("Glacial Spike", () => me.targetUnit, () => Boolean(me.targetUnit.hasAura(auras.wintersChill))),
      this.castAndTrack("Frozen Orb", () => me.targetUnit, () => Boolean(me.getAuraStacks(auras.fingersOfFrost) < 2)),
      this.castAndTrack("Cone of Cold", () => me.targetUnit, () => Boolean(!me.targetUnit.hasAura(auras.wintersChill) && me.targetUnit.getUnitsAroundCount(8) >= 3)),
      this.castAndTrack("Blizzard", () => me.targetUnit, () => Boolean(me.targetUnit.getUnitsAroundCount(8) >= 2 && me.hasAura(auras.freezingRain))),
      this.castAndTrack("Shifting Power", () => me, () => Boolean(me.hasAura(auras.icyVeins))),
      this.castAndTrack("Glacial Spike", () => me.targetUnit),
      this.castAndTrack("Ice Lance", () => me.targetUnit, () => Boolean(me.getAuraStacks(44544) >= 1)),
      this.castAndTrack("Ice Nova", () => me.targetUnit, () => Boolean(me.targetUnit.getUnitsAroundCount(8) >= 4)),
      this.castAndTrack("Frostbolt", () => me.targetUnit),
      this.callMovementActionList()
    );
  }

  callMovementActionList() {
    this.debug("Entering movement action list");
    return new bt.Selector(
      this.castAndTrack("Blink", () => me, () => Boolean(me.isMoving() && me.distanceTo(me.targetUnit) > 10)),
      this.castAndTrack("Ice Floes", () => me, () => Boolean(me.isMoving() && !me.hasAura("Ice Floes"))),
      this.castAndTrack("Ice Nova", () => me.targetUnit),
      this.castAndTrack("Cone of Cold", () => me.targetUnit, () => Boolean(me.targetUnit.getUnitsAroundCount(12) >= 2)),
      this.castAndTrack("Arcane Explosion", () => me, () => Boolean(me.power > 30 && me.targetUnit.getUnitsAroundCount(12) >= 2)),
      this.castAndTrack("Fire Blast", () => me.targetUnit),
      this.castAndTrack("Ice Lance", () => me.targetUnit)
    );
  }
}

export default MageFrostBehavior;
