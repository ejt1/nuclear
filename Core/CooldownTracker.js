import objMgr, { me } from './ObjectManager';
import { offensiveCooldowns, cooldownHelpers, CooldownCategories } from '../Data/OffensiveCooldowns';
import { CombatLogEventTypes, getEventTypeName } from '../Enums/CombatLogEvents';
import Settings from './Settings';
import colors from '../Enums/Colors';
import spellTracking from './SpellTracking';

/**
 * Offensive Cooldown Tracker for PvP
 * Tracks enemy offensive cooldowns using combat log events for strategic automation
 */
class CooldownTracker extends wow.EventListener {
  constructor() {
    super();
    this.enabled = true;
    this.visualThreats = true; // Enable visual threat lines by default
    this.cooldowns = new Map(); // unitGuid.hash -> { spellId -> { category, lastUsed, estimatedAvailable, priority } }
    this.recentCasts = new Map(); // unitGuid.hash -> { spellId -> timestamp } for duplicate filtering
    this.activeThreatLines = new Map(); // unitGuid.hash -> { unit, endTime, spellName, category }
    this.castThrottleTime = 1000; // 1 second throttle for duplicate casts
    this.maxTrackingDistance = 40; // yards
    this.arenaOnly = true; // Start with arena only for performance
    this.debugLogs = false;
    
    // Performance optimization
    this.lastUpdateTime = 0;
    this.updateThrottle = 100; // Update every 500ms instead of every frame
    this.lastCleanupTime = 0;
    this.cleanupInterval = 5000; // Cleanup every 5 seconds
    this.maxCooldownAge = 600000; // 10 minutes
  }

  /**
   * Initialize the cooldown tracker
   */
  initialize() {
    //console.log('Cooldown Tracker initialized');
    this.debugLogs = Settings.CooldownTrackerDebugLogs || false;
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
   * Process combat log events for cooldown tracking (with improved error handling)
   */
  processCombatLogEvent(event) {
    try {
      // Extract event data - following same pattern as DRTracker
      const eventData = event.args?.[0] || event;
      if (!eventData) return;
      
      const eventType = eventData.eventType;
      const spellId = eventData.args?.[0] || eventData.spellId;
      const sourceGuid = eventData.source?.guid || eventData.sourceGuid;
      const sourceName = eventData.source?.unsafeName || eventData.sourceName;

      // Validate required data
      if (!eventType || !spellId || !sourceGuid) return;

      // Special logging for Wtfjmr offensive cooldowns (before hostility check)
      if (sourceName === "Wtfjmr") {
        const cooldownInfo = cooldownHelpers.getCooldownBySpellID(spellId);
        if (cooldownInfo) {
          const eventTypeName = getEventTypeName(eventType);
          //console.info(
          //   `[Wtfjmr Cooldown] ${eventTypeName}:\n` +
          //   `  Spell: ${cooldownInfo.name} (ID: ${spellId})\n` +
          //   `  Category: ${cooldownInfo.category}\n` +
          //   `  Priority: ${cooldownInfo.priority}\n` +
          //   `  Cooldown: ${cooldownInfo.cooldown}ms\n` +
          //   `  Source: ${sourceName} (${sourceGuid})\n`
          // );
        }
      }

      // Only track hostile players for normal cooldown tracking
      if (!this.isHostilePlayer(sourceGuid)) return;

      // Check if we should track this spell
      const cooldownInfo = cooldownHelpers.getCooldownBySpellID(spellId);
      if (!cooldownInfo) return;

      // Check zone restrictions - safely check if me exists and has inArena method
      if (this.arenaOnly) {
        try {
          if (!me || !me.inArena || !me.inArena()) return;
        } catch (e) {
          // If arena check fails, skip arena restriction
          if (this.debugLogs) {
            //console.warn(`[CooldownTracker] Arena check failed: ${e.message}`);
          }
        }
      }

      // Check distance (if unit is available and me exists)
      if (!me || !this.isWithinTrackingRange(sourceGuid)) return;

      const currentTime = Date.now();

      // Handle relevant events for cooldown tracking
      switch (eventType) {
        case CombatLogEventTypes.SPELL_CAST_SUCCESS:
        case CombatLogEventTypes.SPELL_AURA_APPLIED:
        case CombatLogEventTypes.SPELL_SUMMON:
          // Throttle duplicate casts
          if (this.isRecentCast(sourceGuid, spellId, currentTime)) return;

          if (this.debugLogs) {
            const eventTypeName = getEventTypeName(eventType);
            //console.info(`[Cooldown] ${eventTypeName} - ${sourceName}: ${cooldownInfo.name} (${cooldownInfo.category})`);
          }

          this.recordCooldownUsage(sourceGuid, spellId, cooldownInfo, currentTime);
          break;
      }
    } catch (e) {
      if (this.debugLogs) {
        //console.warn(`[CooldownTracker] Error processing combat log event: ${e.message}`);
      }
    }
  }

  /**
   * Check if source is a hostile player - following DRTracker pattern
   */
  isHostilePlayer(sourceGuid) {
    const unit = objMgr.findObject(sourceGuid);
    if (!unit || !(unit instanceof wow.CGUnit)) return false;

    if (!unit.isPlayer()) return false;

    // Check if hostile to us using the isEnemy property
    return unit.isEnemy;
  }

  /**
   * Check if unit is within tracking range
   */
  isWithinTrackingRange(unitGuid) {
    if (!me) return false;

    const unit = objMgr.findObject(unitGuid);
    if (!unit || !(unit instanceof wow.CGUnit)) return false;

    const distance = me.distanceTo(unit);
    return distance <= this.maxTrackingDistance;
  }

  /**
   * Check if this is a recent duplicate cast
   */
  isRecentCast(unitGuid, spellId, currentTime) {
    const guidHash = unitGuid.hash;

    if (!this.recentCasts.has(guidHash)) {
      this.recentCasts.set(guidHash, {});
    }

    const unitCasts = this.recentCasts.get(guidHash);
    const lastCast = unitCasts[spellId];

    if (lastCast && (currentTime - lastCast) < this.castThrottleTime) {
      return true; // Too recent, ignore
    }

    // Update last cast time
    unitCasts[spellId] = currentTime;
    return false;
  }

  /**
   * Record cooldown usage
   */
  recordCooldownUsage(unitGuid, spellId, cooldownInfo, currentTime) {
    const guidHash = unitGuid.hash;

    if (!this.cooldowns.has(guidHash)) {
      this.cooldowns.set(guidHash, {});
    }

    const unitCooldowns = this.cooldowns.get(guidHash);
    const estimatedAvailable = currentTime + cooldownInfo.cooldown;

    unitCooldowns[spellId] = {
      name: cooldownInfo.name,
      category: cooldownInfo.category,
      lastUsed: currentTime,
      estimatedAvailable: estimatedAvailable,
      priority: cooldownHelpers.getCategoryPriority(cooldownInfo.category),
      cooldownDuration: cooldownInfo.cooldown,
      effectDuration: cooldownInfo.duration
    };

    // Handle visual threat lines based on spell type
    if (this.visualThreats && this.shouldShowThreatLine(cooldownInfo)) {
      const unit = objMgr.findObject(unitGuid);
      if (unit) {
        // Remove any existing threat line for this spell first
        const existingThreatKey = Array.from(this.activeThreatLines.entries())
          .find(([key, threat]) => threat.spellId === spellId && threat.unit && threat.unit.guid.hash === guidHash);
        
        if (existingThreatKey) {
          this.activeThreatLines.delete(existingThreatKey[0]);
        }

        // For major offensive cooldowns, show during their active duration
        if (this.isActiveDurationSpell(cooldownInfo.category) && cooldownInfo.duration > 0) {
          this.activeThreatLines.set(guidHash + '_' + spellId, {
            unit: unit,
            endTime: currentTime + cooldownInfo.duration, // Show during active duration
            spellName: cooldownInfo.name,
            category: cooldownInfo.category,
            spellId: spellId,
            isActive: true // Currently active burst window
          });
          
          if (this.debugLogs) {
            //console.log(`[CooldownTracker] ${cooldownInfo.name} activated on ${unit.unsafeName} - showing burst window`);
          }
        }
        // For CC/Interrupts, we'll handle them in the update loop when they become ready
      }
    }

    if (this.debugLogs) {
      const unitName = this.getUnitName(unitGuid);
      //console.log(`Cooldown Recorded: ${unitName} used ${cooldownInfo.name} - Available in ${Math.round(cooldownInfo.cooldown / 1000)}s`);
    }
  }

  /**
   * Get unit name by GUID - following DRTracker pattern
   */
  getUnitName(unitGuid) {
    const unit = objMgr.findObject(unitGuid);
    return unit ? unit.unsafeName : 'Unknown';
  }

  /**
   * Find unit by GUID hash - optimized with proper error handling
   */
  findUnitByHash(guidHash) {
    if (!me || !guidHash) return null;

    // Use objMgr.findObject first (most efficient)
    try {
      const unit = objMgr.findObject({ hash: guidHash });
      if (unit && 
          unit instanceof wow.CGUnit && 
          unit.isPlayer() && 
          unit.isEnemy && 
          !unit.deadOrGhost &&
          me.distanceTo(unit) <= this.maxTrackingDistance) {
        return unit;
      }
    } catch (e) {
      if (this.debugLogs) {
        //console.warn(`[CooldownTracker] Error finding unit by GUID: ${e.message}`);
      }
    }

    // Fallback: search through getEnemies if available
    try {
      if (me.getEnemies) {
        const enemies = me.getEnemies(this.maxTrackingDistance);
        for (const enemy of enemies) {
          if (enemy.isPlayer() && enemy.guid.hash === guidHash) {
            return enemy;
          }
        }
      }
    } catch (e) {
      if (this.debugLogs) {
        //console.warn(`[CooldownTracker] Error in getEnemies fallback: ${e.message}`);
      }
    }

    return null;
  }

  /**
   * Main update loop - clean up expired data and render visual threats (throttled)
   */
  update() {
    if (!this.enabled || !me) return;

    const currentTime = Date.now();
    
    // Throttle updates for performance
    if (currentTime - this.lastUpdateTime < this.updateThrottle) {
      // Still render visual threats every frame if enabled
      if (this.visualThreats) {
        this.renderThreatLines();
      }
      return;
    }
    
    this.lastUpdateTime = currentTime;

    // Perform cleanup operations less frequently
    if (currentTime - this.lastCleanupTime >= this.cleanupInterval) {
      this.performCleanup(currentTime);
      this.lastCleanupTime = currentTime;
    }

    // Update visual threats
    this.updateVisualThreats(currentTime);
  }
  
  /**
   * Perform cleanup operations (throttled)
   */
  performCleanup(currentTime) {
    // Clean up old cast records
    for (const [guidHash, unitCasts] of this.recentCasts) {
      const keysToDelete = [];
      for (const [spellId, timestamp] of Object.entries(unitCasts)) {
        if (currentTime - timestamp > this.castThrottleTime * 5) {
          keysToDelete.push(spellId);
        }
      }
      
      // Remove expired casts
      keysToDelete.forEach(key => delete unitCasts[key]);

      if (Object.keys(unitCasts).length === 0) {
        this.recentCasts.delete(guidHash);
      }
    }

    // Clean up cooldown data for units that are no longer relevant
    const guidHashesToDelete = [];
    for (const [guidHash, unitCooldowns] of this.cooldowns) {
      const unit = this.findUnitByHash(guidHash);

      // Remove if unit no longer exists or is too far away
      if (!unit) {
        guidHashesToDelete.push(guidHash);
        continue;
      }

      // Clean up very old cooldown records
      const spellIdsToDelete = [];
      for (const [spellId, cooldownData] of Object.entries(unitCooldowns)) {
        if (currentTime - cooldownData.lastUsed > this.maxCooldownAge) {
          spellIdsToDelete.push(spellId);
        }
      }
      
      // Remove expired cooldowns
      spellIdsToDelete.forEach(spellId => delete unitCooldowns[spellId]);

      if (Object.keys(unitCooldowns).length === 0) {
        guidHashesToDelete.push(guidHash);
      }
    }
    
    // Remove units with no cooldowns
    guidHashesToDelete.forEach(guidHash => {
      this.cooldowns.delete(guidHash);
      this.activeThreatLines.delete(guidHash); // Also clean up threat lines
    });
    
    if (this.debugLogs && guidHashesToDelete.length > 0) {
      //console.log(`[CooldownTracker] Cleaned up ${guidHashesToDelete.length} inactive units`);
    }
  }

  /**
   * Update and render visual threat lines
   */
  updateVisualThreats(currentTime) {
    if (!this.visualThreats) return;

    // Clean up expired threat lines (spells that were used again)
    for (const [guidHash, threatData] of this.activeThreatLines) {
      if (currentTime >= threatData.endTime) {
        this.activeThreatLines.delete(guidHash);
      }
    }

    // Add threat lines for spells that are now ready to use
    this.addReadySpellThreatLines(currentTime);

    // Render active threat lines
    this.renderThreatLines();
  }

  /**
   * Add threat lines for spells that are ready to use (CC/Interrupts/Execute only)
   */
  addReadySpellThreatLines(currentTime) {
    for (const [guidHash, unitCooldowns] of this.cooldowns) {
      const unit = this.findUnitByHash(guidHash);
      if (!unit) continue;

      for (const [spellId, cooldownData] of Object.entries(unitCooldowns)) {
        // Only handle spells that should show when ready to use
        if (!this.isReadyToUseSpell(cooldownData.category)) {
          continue;
        }

        // Check if spell is ready to use (off cooldown)
        const isReady = currentTime >= cooldownData.estimatedAvailable;
        
        // Create a unique key for this threat line
        const threatKey = `${guidHash}_${spellId}_ready`;
        
        if (isReady) {
          // Only add if we don't already have an active threat line for this spell
          const existingThreat = Array.from(this.activeThreatLines.values())
            .find(threat => threat.spellId === parseInt(spellId) && threat.unit.guid.hash === guidHash && threat.isReady);

          if (!existingThreat) {
            this.activeThreatLines.set(threatKey, {
              unit: unit,
              endTime: Number.MAX_SAFE_INTEGER, // Show until spell is used again
              spellName: cooldownData.name,
              category: cooldownData.category,
              spellId: parseInt(spellId),
              isReady: true
            });

            if (this.debugLogs) {
              //console.log(`[CooldownTracker] ${cooldownData.name} ready on ${unit.unsafeName}`);
            }
          }
        } else {
          // Remove threat line if spell is no longer ready (was used)
          const existingThreat = Array.from(this.activeThreatLines.entries())
            .find(([key, threat]) => threat.spellId === parseInt(spellId) && threat.unit.guid.hash === guidHash && threat.isReady);

          if (existingThreat) {
            this.activeThreatLines.delete(existingThreat[0]);
            
            if (this.debugLogs) {
              //console.log(`[CooldownTracker] ${cooldownData.name} used on ${unit.unsafeName} - removed ready indicator`);
            }
          }
        }
      }
    }
  }

  /**
   * Render threat lines to enemies with active offensive cooldowns (optimized)
   */
  renderThreatLines() {
    if (!this.visualThreats || !me || this.activeThreatLines.size === 0) return;

    try {
      const canvas = imgui.getBackgroundDrawList();
      if (!canvas) return;

      // Cache player position for performance
      let mePos = null;
      try {
        if (me.position) {
          const meCenter = new Vector3(me.position.x, me.position.y, me.position.z + (me.displayHeight / 2));
          mePos = wow.WorldFrame.getScreenCoordinates(meCenter);
        }
      } catch (e) {
        if (this.debugLogs) {
          //console.warn(`[CooldownTracker] Error getting player position: ${e.message}`);
        }
        return;
      }

      if (!mePos || mePos.x === -1) return; // Player off screen

      // Track invalid threats to clean up after iteration
      const threatsToDelete = [];

      for (const [guidHash, threatData] of this.activeThreatLines) {
        let unit = threatData.unit;

        // Validate unit exists and is still valid
        if (!unit) {
          threatsToDelete.push(guidHash);
          continue;
        }

        // Check if unit is still alive and valid
        try {
          if (unit.deadOrGhost || !unit.isValid || !unit.guid) {
            threatsToDelete.push(guidHash);
            continue;
          }
        } catch (e) {
          // Unit object is corrupted/invalid
          threatsToDelete.push(guidHash);
          continue;
        }

        // Re-find the unit if needed (in case reference became stale)
        try {
          if (!unit.position || !unit.displayHeight) {
            // Try to re-find the unit by GUID hash
            const guidHashFromThreat = unit.guid?.hash || guidHash.split('_')[0];
            unit = this.findUnitByHash(guidHashFromThreat);
            
            if (!unit) {
              threatsToDelete.push(guidHash);
              continue;
            }
            
            // Update the threat data with fresh unit reference
            threatData.unit = unit;
          }
        } catch (e) {
          threatsToDelete.push(guidHash);
          continue;
        }

        // Validate essential properties exist
        if (!unit.position || typeof unit.displayHeight !== 'number') {
          threatsToDelete.push(guidHash);
          continue;
        }

        // Check line of sight safely
        try {
          if (!me.withinLineOfSight(unit)) continue;
        } catch (e) {
          // If line of sight check fails, skip this unit but don't delete (might be temporary)
          continue;
        }

        // Check distance
        let distance = 0;
        try {
          distance = me.distanceTo(unit);
          if (distance > this.maxTrackingDistance) {
            threatsToDelete.push(guidHash); // Too far, clean up
            continue;
          }
        } catch (e) {
          // Distance check failed, probably invalid unit
          threatsToDelete.push(guidHash);
          continue;
        }

        // Get unit screen position safely
        let unitPos = null;
        try {
          const unitCenter = new Vector3(
            unit.position.x, 
            unit.position.y, 
            unit.position.z + (unit.displayHeight / 2)
          );
          unitPos = wow.WorldFrame.getScreenCoordinates(unitCenter);
        } catch (e) {
          if (this.debugLogs) {
            //console.warn(`[CooldownTracker] Error getting unit screen position: ${e.message}`);
          }
          continue;
        }

        if (!unitPos || unitPos.x === -1) continue; // Off screen

        // Choose color and width based on threat category
        const { color, width } = this.getThreatVisuals(threatData.category);

        // Draw the threat line safely
        try {
          canvas.addLine(mePos, unitPos, color, width);

          // Draw spell name above the unit with appropriate indicator
          const textPos = new Vector3(
            unit.position.x, 
            unit.position.y, 
            unit.position.z + unit.displayHeight + 1
          );
          const textScreenPos = wow.WorldFrame.getScreenCoordinates(textPos);
          
          if (textScreenPos && textScreenPos.x !== -1) {
            let displayText;
            if (threatData.isReady) {
              displayText = `[${threatData.spellName} READY]`; // CC/Interrupt ready to use
            } else if (threatData.isActive) {
              displayText = `[${threatData.spellName} ACTIVE]`; // Burst window active
            } else {
              displayText = `[${threatData.spellName}]`; // Default
            }
            canvas.addText(displayText, textScreenPos, color);
          }
        } catch (e) {
          if (this.debugLogs) {
            //console.warn(`[CooldownTracker] Error drawing threat line for ${threatData.spellName}: ${e.message}`);
          }
        }
      }

      // Clean up invalid threats after iteration
      if (threatsToDelete.length > 0) {
        threatsToDelete.forEach(guidHash => {
          this.activeThreatLines.delete(guidHash);
        });
        
        if (this.debugLogs) {
          //console.log(`[CooldownTracker] Cleaned up ${threatsToDelete.length} invalid threat lines`);
        }
      }
    } catch (e) {
      if (this.debugLogs) {
        //console.warn(`[CooldownTracker] Error in renderThreatLines: ${e.message}`);
      }
    }
  }
  
  /**
   * Determine if we should show a threat line for this cooldown category
   */
  shouldShowThreatLine(cooldownInfo) {
    // Always show threat lines for high-priority abilities
    const highPriorityCategories = [
      CooldownCategories.CC_SETUP,
      CooldownCategories.INTERRUPT,
      CooldownCategories.EXECUTE_FINISHER,
      CooldownCategories.MAGIC_BURST,
      CooldownCategories.PHYSICAL_BURST,
      CooldownCategories.MAJOR_OFFENSIVE
    ];
    
    return highPriorityCategories.includes(cooldownInfo.category) && cooldownInfo.cooldown > 0;
  }

  /**
   * Determine if this spell should show during its active duration (burst windows)
   */
  isActiveDurationSpell(category) {
    // These categories should show when active (during their effect duration)
    const activeDurationCategories = [
      CooldownCategories.MAGIC_BURST,        // Show during Combustion, Icy Veins, etc.
      CooldownCategories.PHYSICAL_BURST,     // Show during Avatar, Recklessness, etc.
      CooldownCategories.MAJOR_OFFENSIVE,    // Show during major damage windows
      CooldownCategories.DOT_AMPLIFICATION,  // Show during Vendetta, Deathmark, etc.
      CooldownCategories.PET_SUMMON_BURST    // Show during pet summoning windows
    ];
    
    return activeDurationCategories.includes(category);
  }

  /**
   * Determine if this spell should show when ready to use (availability)
   */
  isReadyToUseSpell(category) {
    // These categories should show when off cooldown (ready to use)
    const readyToUseCategories = [
      CooldownCategories.CC_SETUP,      // Show when CC is available
      CooldownCategories.INTERRUPT,     // Show when interrupts are available  
      CooldownCategories.EXECUTE_FINISHER // Show when execute abilities are available
    ];
    
    return readyToUseCategories.includes(category);
  }

  /**
   * Get visual styling for threat category
   */
  getThreatVisuals(category) {
    switch (category) {
      case CooldownCategories.EXECUTE_FINISHER:
        return { color: colors.purple, width: 3 }; // Purple for execute abilities
      case CooldownCategories.MAGIC_BURST:
        return { color: colors.blue, width: 2 }; // Blue for magic burst
      case CooldownCategories.PHYSICAL_BURST:
        return { color: colors.red, width: 2 }; // Red for physical burst
      case CooldownCategories.MAJOR_OFFENSIVE:
        return { color: colors.orange, width: 2 }; // Orange for major offensive
      case CooldownCategories.CC_SETUP:
        return { color: colors.yellow, width: 2 }; // Yellow for crowd control
      case CooldownCategories.INTERRUPT:
        return { color: colors.cyan, width: 1 }; // Cyan for interrupts
      default:
        return { color: colors.yellow, width: 2 }; // Yellow for other threats
    }
  }

  /**
   * Get all cooldowns for a specific unit
   */
  getUnitCooldowns(unitGuid) {
    const guidHash = unitGuid.hash;
    return this.cooldowns.get(guidHash) || {};
  }

  /**
   * Get cooldowns by category for a unit
   */
  getUnitCooldownsByCategory(unitGuid, category) {
    const unitCooldowns = this.getUnitCooldowns(unitGuid);
    return Object.entries(unitCooldowns)
      .filter(([_, cooldown]) => cooldown.category === category)
      .reduce((acc, [spellId, cooldown]) => {
        acc[spellId] = cooldown;
        return acc;
      }, {});
  }

  /**
   * Check if a specific cooldown is available for a unit
   */
  isCooldownAvailable(unitGuid, spellId) {
    const unitCooldowns = this.getUnitCooldowns(unitGuid);
    const cooldownData = unitCooldowns[spellId];

    if (!cooldownData) return true; // Never seen it used, assume available

    return Date.now() >= cooldownData.estimatedAvailable;
  }

  /**
   * Get remaining cooldown time for a specific spell
   */
  getRemainingCooldown(unitGuid, spellId) {
    const unitCooldowns = this.getUnitCooldowns(unitGuid);
    const cooldownData = unitCooldowns[spellId];

    if (!cooldownData) return 0; // Never seen it used

    const remaining = cooldownData.estimatedAvailable - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Get the most threatening available cooldowns for a unit
   */
  getThreateningCooldowns(unitGuid, maxResults = 5) {
    const unitCooldowns = this.getUnitCooldowns(unitGuid);
    const currentTime = Date.now();

    return Object.entries(unitCooldowns)
      .filter(([_, cooldown]) => currentTime >= cooldown.estimatedAvailable) // Only available cooldowns
      .sort((a, b) => b[1].priority - a[1].priority) // Sort by priority (highest first)
      .slice(0, maxResults)
      .map(([spellId, cooldown]) => ({
        spellId: parseInt(spellId),
        ...cooldown
      }));
  }

  /**
   * Get all units with active cooldown tracking
   */
  getTrackedUnits() {
    const units = [];
    for (const [guidHash, unitCooldowns] of this.cooldowns) {
      const unit = this.findUnitByHash(guidHash);
      if (unit && Object.keys(unitCooldowns).length > 0) {
        units.push({
          guid: unit.guid,
          name: unit.unsafeName,
          cooldownCount: Object.keys(unitCooldowns).length
        });
      }
    }
    return units;
  }

  /**
   * Check if any enemy has a specific category of cooldown available
   */
  hasEnemyCooldownAvailable(category) {
    const currentTime = Date.now();

    for (const [guidHash, unitCooldowns] of this.cooldowns) {
      for (const [spellId, cooldown] of Object.entries(unitCooldowns)) {
        if (cooldown.category === category && currentTime >= cooldown.estimatedAvailable) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get threat level assessment for current situation
   */
  getThreatAssessment() {
    const threats = {
      immediate: [], // Available high-priority cooldowns
      incoming: [],  // High-priority cooldowns available soon (< 10s)
      defensive: []  // Defensive cooldowns that just ended
    };

    const currentTime = Date.now();
    const soonThreshold = 10000; // 10 seconds

    for (const [guidHash, unitCooldowns] of this.cooldowns) {
      const unit = this.findUnitByHash(guidHash);
      if (!unit) continue;

      for (const [spellId, cooldown] of Object.entries(unitCooldowns)) {
        const timeUntilAvailable = cooldown.estimatedAvailable - currentTime;

        if (cooldown.priority >= 7) { // High priority cooldowns
          if (timeUntilAvailable <= 0) {
            threats.immediate.push({
              unit: unit.unsafeName,
              spellId: parseInt(spellId),
              ...cooldown
            });
          } else if (timeUntilAvailable <= soonThreshold) {
            threats.incoming.push({
              unit: unit.unsafeName,
              spellId: parseInt(spellId),
              availableIn: timeUntilAvailable,
              ...cooldown
            });
          }
        }

        // Track defensive cooldowns that recently ended
        if ((cooldown.category === CooldownCategories.IMMUNITY ||
             cooldown.category === CooldownCategories.MAJOR_DEFENSIVE) &&
            timeUntilAvailable <= 0 &&
            (currentTime - cooldown.lastUsed) < 30000) { // Used within last 30s
          threats.defensive.push({
            unit: unit.unsafeName,
            spellId: parseInt(spellId),
            usedAgo: currentTime - cooldown.lastUsed,
            ...cooldown
          });
        }
      }
    }

    return threats;
  }

  /**
   * Get enemy burst windows - when enemies have multiple offensive cooldowns available
   */
  getEnemyBurstWindows() {
    const burstWindows = [];
    const currentTime = Date.now();

    for (const [guidHash, unitCooldowns] of this.cooldowns) {
      const unit = this.findUnitByHash(guidHash);
      if (!unit) continue;

      const availableBurst = [];
      const incomingBurst = [];

      for (const [spellId, cooldown] of Object.entries(unitCooldowns)) {
        const timeUntilAvailable = cooldown.estimatedAvailable - currentTime;

        // Check for burst categories
        if (cooldown.category === CooldownCategories.MAGIC_BURST ||
            cooldown.category === CooldownCategories.PHYSICAL_BURST ||
            cooldown.category === CooldownCategories.DOT_AMPLIFICATION ||
            cooldown.category === CooldownCategories.MAJOR_OFFENSIVE) {

          if (timeUntilAvailable <= 0) {
            availableBurst.push(cooldown);
          } else if (timeUntilAvailable <= 15000) { // Available within 15s
            incomingBurst.push({ ...cooldown, availableIn: timeUntilAvailable });
          }
        }
      }

      // If enemy has 2+ burst cooldowns available or coming soon, it's a burst window
      if (availableBurst.length >= 2 || (availableBurst.length >= 1 && incomingBurst.length >= 1)) {
        burstWindows.push({
          unit: unit.unsafeName,
          guid: unit.guid,
          available: availableBurst,
          incoming: incomingBurst,
          threatLevel: availableBurst.length * 2 + incomingBurst.length
        });
      }
    }

    // Sort by threat level (highest first)
    return burstWindows.sort((a, b) => b.threatLevel - a.threatLevel);
  }

  /**
   * Check if it's safe to use major cooldowns (no immediate enemy burst)
   */
  isSafeForMajorCooldowns() {
    const threats = this.getThreatAssessment();
    const burstWindows = this.getEnemyBurstWindows();

    // Not safe if there are immediate high-priority threats or active burst windows
    return threats.immediate.length === 0 && burstWindows.length === 0;
  }

  /**
   * Get recommended defensive actions based on current threats
   */
  getDefensiveRecommendations() {
    const threats = this.getThreatAssessment();
    const burstWindows = this.getEnemyBurstWindows();
    const recommendations = [];

    // Immediate threats
    if (threats.immediate.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'USE_MAJOR_DEFENSIVE',
        reason: `${threats.immediate.length} immediate high-priority cooldowns available`,
        threats: threats.immediate
      });
    }

    // Active burst windows
    if (burstWindows.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'USE_DEFENSIVE_COOLDOWNS',
        reason: `${burstWindows.length} enemy burst windows active`,
        burstWindows: burstWindows
      });
    }

    // Incoming threats
    if (threats.incoming.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'PREPARE_DEFENSIVES',
        reason: `${threats.incoming.length} high-priority cooldowns available soon`,
        threats: threats.incoming
      });
    }

    // Recently used defensives (opportunity windows)
    if (threats.defensive.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'OFFENSIVE_OPPORTUNITY',
        reason: `${threats.defensive.length} enemy defensives recently used`,
        opportunities: threats.defensive
      });
    }

    return recommendations;
  }

  /**
   * Enable/disable the tracker
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.cooldowns.clear();
      this.recentCasts.clear();
      this.activeThreatLines.clear();
    }
  }

  /**
   * Enable/disable visual threat lines
   */
  setVisualThreats(enabled) {
    this.visualThreats = enabled;
    if (!enabled) {
      this.activeThreatLines.clear();
    }
  }

  /**
   * Set arena-only mode
   */
  setArenaOnly(arenaOnly) {
    this.arenaOnly = arenaOnly;
  }

  /**
   * Set debug logging
   */
  setDebugLogs(enabled) {
    this.debugLogs = enabled;
  }

  /**
   * Reset all cooldown data
   */
  reset() {
    this.cooldowns.clear();
    this.recentCasts.clear();
    this.activeThreatLines.clear();
  }

  /**
   * Get the most threatened friendly unit based on enemy cooldowns
   * This is crucial for healers to know who to pre-cast defensives on
   */
  getMostThreatenedFriend() {
    if (!me || !me.getFriends) return null;

    const friends = me.getFriends(40);
    if (!friends || friends.length === 0) return null;

    let mostThreatened = null;
    let highestThreatScore = 0;

    for (const friend of friends) {
      const threatScore = this.calculateThreatScore(friend);
      if (threatScore > highestThreatScore) {
        highestThreatScore = threatScore;
        mostThreatened = friend;
      }
    }

    return mostThreatened;
  }

  /**
   * Calculate threat score for a friendly unit based on enemy targeting and available cooldowns
   */
  calculateThreatScore(friendlyUnit) {
    if (!friendlyUnit) return 0;

    let threatScore = 0;
    const currentTime = Date.now();

    // Check all tracked enemies
    for (const [guidHash, unitCooldowns] of this.cooldowns) {
      const enemy = this.findUnitByHash(guidHash);
      if (!enemy) continue;

      // Higher threat if enemy is targeting this friend
      const isTargeting = enemy.target && enemy.target.equals && enemy.target.equals(friendlyUnit.guid);
      const targetMultiplier = isTargeting ? 3 : 1;

      // Check distance - closer enemies are more threatening
      const distance = enemy.distanceTo(friendlyUnit);
      const distanceMultiplier = Math.max(0.1, (40 - distance) / 40);

      // Check available offensive cooldowns
      for (const [spellId, cooldown] of Object.entries(unitCooldowns)) {
        const timeUntilAvailable = cooldown.estimatedAvailable - currentTime;

        if (timeUntilAvailable <= 0) { // Available now
          threatScore += cooldown.priority * targetMultiplier * distanceMultiplier;
        } else if (timeUntilAvailable <= 5000) { // Available within 5 seconds
          threatScore += (cooldown.priority * 0.5) * targetMultiplier * distanceMultiplier;
        }
      }
    }

    // Factor in friend's current health - lower health = higher priority
    const healthMultiplier = Math.max(0.5, (100 - friendlyUnit.pctHealth) / 100 + 0.5);
    threatScore *= healthMultiplier;

    return threatScore;
  }

  /**
   * Get friends who need defensive cooldowns based on incoming threats
   */
  getFriendsNeedingDefensives() {
    if (!me || !me.getFriends) return [];

    const friends = me.getFriends(40);
    if (!friends || friends.length === 0) return [];

    const friendsNeedingHelp = [];

    for (const friend of friends) {
      const threatScore = this.calculateThreatScore(friend);
      const incomingThreats = this.getIncomingThreatsForUnit(friend);

      if (threatScore > 5 || incomingThreats.length > 0) {
        friendsNeedingHelp.push({
          unit: friend,
          threatScore: threatScore,
          incomingThreats: incomingThreats,
          priority: this.getDefensivePriority(friend, threatScore, incomingThreats)
        });
      }
    }

    // Sort by priority (highest first)
    return friendsNeedingHelp.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get incoming threats for a specific friendly unit
   */
  getIncomingThreatsForUnit(friendlyUnit) {
    const threats = [];
    const currentTime = Date.now();

    for (const [guidHash, unitCooldowns] of this.cooldowns) {
      const enemy = this.findUnitByHash(guidHash);
      if (!enemy) continue;

      // Check if enemy is targeting this friend or is close enough to threaten
      const isTargeting = enemy.target && enemy.target.equals && enemy.target.equals(friendlyUnit.guid);
      const distance = enemy.distanceTo(friendlyUnit);
      const isInRange = distance <= 30; // Most abilities have 30y range or less

      if (!isTargeting && !isInRange) continue;

      for (const [spellId, cooldown] of Object.entries(unitCooldowns)) {
        const timeUntilAvailable = cooldown.estimatedAvailable - currentTime;

        // Consider threats that are available now or very soon
        if (timeUntilAvailable <= 3000 && cooldown.priority >= 6) {
          threats.push({
            enemy: enemy.unsafeName,
            spellId: parseInt(spellId),
            spellName: cooldown.name,
            category: cooldown.category,
            priority: cooldown.priority,
            availableIn: Math.max(0, timeUntilAvailable),
            isTargeting: isTargeting,
            distance: distance
          });
        }
      }
    }

    return threats.sort((a, b) => a.availableIn - b.availableIn); // Sort by most immediate first
  }

  /**
   * Calculate defensive priority for a friendly unit
   */
  getDefensivePriority(friendlyUnit, threatScore, incomingThreats) {
    let priority = threatScore;

    // Higher priority for lower health
    priority += (100 - friendlyUnit.pctHealth) / 10;

    // Higher priority for immediate threats
    const immediateThreats = incomingThreats.filter(t => t.availableIn <= 1000);
    priority += immediateThreats.length * 10;

    // Higher priority if multiple enemies are threatening
    const uniqueEnemies = new Set(incomingThreats.map(t => t.enemy));
    priority += uniqueEnemies.size * 5;

    // Higher priority for high-priority spell categories
    const hasExecuteThreats = incomingThreats.some(t => t.category === CooldownCategories.EXECUTE_FINISHER);
    const hasBurstThreats = incomingThreats.some(t =>
      t.category === CooldownCategories.MAGIC_BURST ||
      t.category === CooldownCategories.PHYSICAL_BURST
    );

    if (hasExecuteThreats) priority += 20;
    if (hasBurstThreats) priority += 15;

    return priority;
  }

  /**
   * Check if a specific friend needs immediate defensive help
   */
  friendNeedsImmediateHelp(friendlyUnit, urgencyThreshold = 15) {
    if (!friendlyUnit) return false;

    const threatScore = this.calculateThreatScore(friendlyUnit);
    const incomingThreats = this.getIncomingThreatsForUnit(friendlyUnit);
    const priority = this.getDefensivePriority(friendlyUnit, threatScore, incomingThreats);

    return priority >= urgencyThreshold;
  }

  /**
   * Get recommended defensive spell for a friendly unit
   */
  getRecommendedDefensive(friendlyUnit, availableDefensives = []) {
    if (!friendlyUnit || availableDefensives.length === 0) return null;

    const incomingThreats = this.getIncomingThreatsForUnit(friendlyUnit);
    if (incomingThreats.length === 0) return null;

    // Analyze threat types to recommend appropriate defensive
    const hasPhysicalThreats = incomingThreats.some(t => t.category === CooldownCategories.PHYSICAL_BURST);
    const hasMagicThreats = incomingThreats.some(t => t.category === CooldownCategories.MAGIC_BURST);
    const hasExecuteThreats = incomingThreats.some(t => t.category === CooldownCategories.EXECUTE_FINISHER);
    const immediateThreats = incomingThreats.filter(t => t.availableIn <= 1000);

    // Defensive spell recommendations based on threat analysis
    const recommendations = [];

    for (const defensive of availableDefensives) {
      let score = 0;

      // Score based on defensive type and threat type
      if (defensive.type === 'immunity' && (hasPhysicalThreats || hasMagicThreats)) {
        score += 20;
      } else if (defensive.type === 'damage_reduction' && immediateThreats.length > 0) {
        score += 15;
      } else if (defensive.type === 'heal' && friendlyUnit.pctHealth < 50) {
        score += 10;
      } else if (defensive.type === 'shield' && immediateThreats.length > 0) {
        score += 12;
      }

      // Higher score for more urgent situations
      if (hasExecuteThreats) score += 10;
      if (immediateThreats.length >= 2) score += 8;

      recommendations.push({
        spell: defensive.spell,
        score: score,
        reason: this.getDefensiveReason(defensive, incomingThreats, friendlyUnit)
      });
    }

    // Return highest scoring defensive
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.length > 0 ? recommendations[0] : null;
  }

  /**
   * Get reason for defensive recommendation
   */
  getDefensiveReason(defensive, threats, friendlyUnit) {
    const immediateThreats = threats.filter(t => t.availableIn <= 1000);
    const threatNames = threats.map(t => t.spellName).join(', ');

    if (immediateThreats.length > 0) {
      return `Immediate threats: ${threatNames}`;
    } else if (friendlyUnit.pctHealth < 30) {
      return `Low health (${friendlyUnit.pctHealth.toFixed(0)}%) with incoming: ${threatNames}`;
    } else {
      return `Incoming threats: ${threatNames}`;
    }
  }

  /**
   * Get statistics about tracking
   */
  getStats() {
    return {
      trackedUnits: this.cooldowns.size,
      totalCooldowns: Array.from(this.cooldowns.values())
        .reduce((sum, unitCooldowns) => sum + Object.keys(unitCooldowns).length, 0),
      recentCasts: this.recentCasts.size,
      activeThreatLines: this.activeThreatLines.size,
      visualThreatsEnabled: this.visualThreats
    };
  }
}

// Create singleton instance
const cooldownTracker = new CooldownTracker();

export default cooldownTracker;
