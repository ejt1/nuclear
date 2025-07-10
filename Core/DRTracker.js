import objMgr, { me } from './ObjectManager';
import { drHelpers } from '../Data/PVPDRList';
import { CombatLogEventTypes, CombatLogEventTypesMap, getEventTypeName } from '../Enums/CombatLogEvents';
import Settings from './Settings';

/**
 * Diminishing Returns Tracker for PvP
 * Tracks DR state for enemy players using combat log events
 */
class DRTracker extends wow.EventListener {
  constructor() {
    super();
    this.enabled = true;
    this.drData = new Map(); // unitGuid -> { category -> { stacks, endTime } }
    this.drTimeout = 26000; // 26 seconds in milliseconds
    this.drResetTime = 18500; // 18.5 seconds in milliseconds
  }

  /**
   * Initialize the DR tracker
   */
  initialize() {
    console.log('DR Tracker initialized');
  }

  /**
   * Handle combat log events
   */
  onEvent(event) {
    if (!this.enabled) return;

    if (event.name === "COMBAT_LOG_EVENT_UNFILTERED") {
      this.processCombatLogEvent(event);
    }
  }

  /**
   * Process combat log events for DR tracking
   */
  processCombatLogEvent(event) {
    // Extract event data - need to check if it's nested in args[0] or direct
    const eventData = event.args?.[0] || event;
    const eventType = eventData.eventType;
    const spellId = eventData.args?.[0] || eventData.spellId;
    const targetGuid = eventData.target?.guid || eventData.destination?.guid;

    // Track events on any player (including me)
    if (!targetGuid || !this.isPlayerUnit(targetGuid)) return;

    // Check if this spell has a DR category
    const category = drHelpers.getCategoryBySpellID(spellId);
    if (!category) return;

    const currentTime = Date.now();
    const eventTypeName = getEventTypeName(eventType);
    const targetName = eventData.target?.unsafeName || eventData.destination?.name;

    // Handle DR-relevant events using eventType numbers
    switch (eventType) {
      case CombatLogEventTypes.SPELL_AURA_APPLIED:
        if (Settings.DRTrackerDebugLogs) {
          console.info(`[DR Event] ${eventTypeName} - Spell: ${spellId}, Category: ${category}, Target: ${targetName}`);
        }
        this.applyDR(targetGuid, category, spellId, currentTime);
        break;
      case CombatLogEventTypes.SPELL_AURA_REFRESH:
        if (Settings.DRTrackerDebugLogs) {
          console.info(`[DR Event] ${eventTypeName} - Spell: ${spellId}, Category: ${category}, Target: ${targetName}`);
        }
        this.applyDR(targetGuid, category, spellId, currentTime);
        break;
      case CombatLogEventTypes.SPELL_AURA_REMOVED:
        if (Settings.DRTrackerDebugLogs) {
          console.info(`[DR Event] ${eventTypeName} - Spell: ${spellId}, Category: ${category}, Target: ${targetName}`);
        }
        this.fadeDR(targetGuid, category, currentTime);
        break;
    }
  }

  /**
   * Check if a GUID belongs to any player unit
   */
  isPlayerUnit(guid) {
    const unit = objMgr.findObject(guid);
    return unit && unit.isPlayer();
  }

  /**
   * Main update loop - should be called every frame
   */
  update() {
    if (!this.enabled) return;

    const currentTime = Date.now();

    // Clean up expired DR entries
    for (const [guidHash, unitDRData] of this.drData) {
      for (const [category, drInfo] of Object.entries(unitDRData)) {
        if (drInfo.endTime && currentTime > drInfo.endTime) {
          delete unitDRData[category];
        }
      }

      // Remove unit data if no active DRs
      if (Object.keys(unitDRData).length === 0) {
        this.drData.delete(guidHash);
      }
    }
  }

  /**
   * Apply DR when a CC spell is cast
   */
  applyDR(unitGuid, category, spellId, currentTime) {
    const guidHash = unitGuid.hash;

    if (!this.drData.has(guidHash)) {
      this.drData.set(guidHash, {});
    }

    const unitDRData = this.drData.get(guidHash);

    if (!unitDRData[category]) {
      unitDRData[category] = { stacks: 0, endTime: 0 };
    }

    const drInfo = unitDRData[category];
    drInfo.stacks = Math.min(drInfo.stacks + 1, 3); // Max 3 stacks (immune)
    drInfo.endTime = currentTime + this.drTimeout;

    const unitName = this.getUnitName(unitGuid);
    if (Settings.DRTrackerDebugLogs) {
      console.log(`DR Applied: ${unitName} - ${category} (${drInfo.stacks} stacks) - Spell: ${spellId}`);
    }
  }

  /**
   * Handle DR fade when CC spell ends
   */
  fadeDR(unitGuid, category, currentTime) {
    const guidHash = unitGuid.hash;
    const unitDRData = this.drData.get(guidHash);
    if (!unitDRData || !unitDRData[category]) return;

    const drInfo = unitDRData[category];
    drInfo.endTime = currentTime + this.drResetTime;

    if (Settings.DRTrackerDebugLogs) {
      console.log(`DR Faded: ${this.getUnitName(unitGuid)} - ${category} (${drInfo.stacks} stacks)`);
    }
  }

  /**
   * Get unit name by GUID
   */
  getUnitName(unitGuid) {
    const unit = objMgr.findObject(unitGuid);
    return unit ? unit.unsafeName : 'Unknown';
  }

  /**
   * Get DR stacks for a unit and category
   */
  getDRStacks(unitGuid, category) {
    const guidHash = unitGuid.hash;
    const unitDRData = this.drData.get(guidHash);
    if (!unitDRData || !unitDRData[category]) return 0;
    return unitDRData[category].stacks;
  }

  /**
   * Get DR stacks for a unit and spell ID
   */
  getDRStacksBySpell(unitGuid, spellId) {
    const category = drHelpers.getCategoryBySpellID(spellId);
    if (!category) return 0;
    return this.getDRStacks(unitGuid, category);
  }

  /**
   * Check if a spell would be diminished on a target
   */
  wouldBeDiminished(unitGuid, spellId) {
    return this.getDRStacksBySpell(unitGuid, spellId) > 0;
  }

  /**
   * Check if a target is immune to a spell category
   */
  isImmune(unitGuid, spellId) {
    return this.getDRStacksBySpell(unitGuid, spellId) >= 3;
  }

  /**
   * Get the diminished duration multiplier for a spell
   */
  getDiminishedMultiplier(unitGuid, spellId) {
    const category = drHelpers.getCategoryBySpellID(spellId);
    if (!category) return 1.0;

    const stacks = this.getDRStacks(unitGuid, category);
    return drHelpers.getNextDR(stacks, category);
  }

  /**
   * Get all DR data for a unit
   */
  getUnitDRData(unitGuid) {
    const guidHash = unitGuid.hash;
    return this.drData.get(guidHash) || {};
  }

  /**
   * Enable/disable the tracker
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.drData.clear();
    }
  }

  /**
   * Reset all DR data
   */
  reset() {
    this.drData.clear();
  }
}

// Create singleton instance
const drTracker = new DRTracker();

export default drTracker;
