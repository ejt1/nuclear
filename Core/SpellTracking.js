import { me } from './ObjectManager';
import objMgr from './ObjectManager';

class SpellTracking {
  constructor() {
    this.targetedSpells = new Map();
    this.spellSchoolCache = new Map();
  }

  trackSpell(sourceGuid, targetGuid, spellId, spellName, school, castEnd) {
    const key = `${targetGuid.hash}_${spellId}`;
    this.targetedSpells.set(key, {
      sourceGuid,
      targetGuid,
      spellId,
      spellName,
      school,
      castEnd,
      tracked: wow.frameTime
    });
    this.spellSchoolCache.set(spellId, school);
  }

  cleanup() {
    const currentTime = wow.frameTime;
    for (const [key, spell] of this.targetedSpells) {
      const isExpired = currentTime > spell.castEnd;
      const isStale = currentTime - spell.tracked > 10000;

      if (isExpired || isStale) {
        this.targetedSpells.delete(key);
      }
    }
  }

  getTargetedSpells(unit) {
    const targetedSpells = [];
    for (const spell of this.targetedSpells.values()) {
      if (spell.targetGuid.equals(unit.guid)) {
        targetedSpells.push(spell);
      }
    }
    return targetedSpells;
  }

  getSpellsBySchool(unit, school) {
    return this.getTargetedSpells(unit).filter(spell => spell.school === school);
  }
}

Object.defineProperties(wow.CGUnit.prototype, {
  isTargetedBySpell: {
    value: function(spellNameOrId) {
      const spells = spellTracking.getTargetedSpells(this);
      return spells.some(spell =>
        spell.spellId === spellNameOrId ||
        spell.spellName === spellNameOrId
      );
    }
  },

  isTargetedBySpellType: {
    value: function(school) {
      const spells = spellTracking.getSpellsBySchool(this, school);
      return spells.length > 0;
    }
  },

  getTargetingSpellTimeRemaining: {
    value: function(spellNameOrId) {
      const spells = spellTracking.getTargetedSpells(this);
      const spell = spells.find(s =>
        s.spellId === spellNameOrId ||
        s.spellName === spellNameOrId
      );
      return spell ? Math.max(0, spell.castEnd - wow.frameTime) : 0;
    }
  }
});

class SpellTrackingEventHandler extends wow.EventListener {
  onEvent(event) {
    if (event.name === "COMBAT_LOG_EVENT_UNFILTERED") {
      const [eventData] = event.args;
      //console.info(`Combat Log Event Type: ${eventData.eventType}`);
      
      // if (!eventData.source || !eventData.source.guid) {
      //   return;
      // }
      
      // Handle different event types
      switch(eventData.eventType) {
        case 5: // SPELL_CAST_START
          this.handleSpellStart(eventData);
          break;
        case 6: // SPELL_CAST_SUCCESS
          this.handleSpellStart(eventData);
          break;
        case 7: // SPELL_CAST_FAILED
          this.cleanupSpell(eventData);
          break;
        case 8: // SPELL_CAST_INTERRUPTED
          this.cleanupSpell(eventData);
          break;
      }
    }
  }

  handleSpellStart(eventData) {
    const destination = eventData.destination && eventData.destination.guid !== "0:0 (0)"
      ? eventData.destination
      : eventData.unkUnit1 && eventData.unkUnit1.guid !== "0:0 (0)"
      ? eventData.unkUnit1
      : eventData.unkUnit2 && eventData.unkUnit2.guid !== "0:0 (0)"
      ? eventData.unkUnit2
      : null;
    
    const spellId = eventData.args ? eventData.args[0] : undefined;
    const spell = new wow.Spell(spellId);
    const spellName = spell.name;
    const school = eventData.args ? eventData.args[94] : undefined;
    const castEnd = eventData.args[3];

    // Extract world coordinates for ground-targeted spells (when no destination unit)
    let worldCoords = null;
    if (!destination && eventData.args && eventData.args.length > 20) {
      // Based on debug analysis, coordinates seem to be around index 176-180
      // Check this specific area first
      const specificIndices = [176, 177, 178, 179, 180];
      for (const startIdx of specificIndices) {
        if (startIdx + 2 < eventData.args.length) {
          const val1 = eventData.args[startIdx];
          const val2 = eventData.args[startIdx + 1];
          const val3 = eventData.args[startIdx + 2];
          
          // Skip if both X and Y are 0 (unlikely to be real coordinates)
          if (val1 === 0 && val2 === 0) continue;
          
          // Try IEEE 754 float interpretation first for this specific area
          if (Number.isInteger(val1) && Number.isInteger(val2) && Number.isInteger(val3)) {
            const buffer1 = new ArrayBuffer(4);
            const buffer2 = new ArrayBuffer(4);
            const buffer3 = new ArrayBuffer(4);
            
            new Uint32Array(buffer1)[0] = val1;
            new Uint32Array(buffer2)[0] = val2;
            new Uint32Array(buffer3)[0] = val3;
            
            const x = new Float32Array(buffer1)[0];
            const y = new Float32Array(buffer2)[0];
            const z = new Float32Array(buffer3)[0];
            
            if (!isNaN(x) && !isNaN(y) && !isNaN(z) &&
                Math.abs(x) > 1 && Math.abs(y) > 1 && Math.abs(z) >= 0 &&
                Math.abs(x) < 50000 && Math.abs(y) < 50000 && Math.abs(z) < 10000) {
              worldCoords = { x: x, y: y, z: z };
              console.info(`[Wtfjmr Debug] Found coords at index ${startIdx}: ${val1},${val2},${val3} -> ${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`);
              break;
            }
          }
        }
      }
      
      // If not found in specific area, search through broader range
      if (!worldCoords) {
        for (let i = Math.max(0, eventData.args.length - 100); i < eventData.args.length - 2; i++) {
          const val1 = eventData.args[i];
          const val2 = eventData.args[i + 1];
          const val3 = eventData.args[i + 2];
          
          // Skip if both X and Y are 0 (unlikely to be real coordinates)
          if (val1 === 0 && val2 === 0) continue;
          
          // Try direct interpretation first (decimal coordinates)
          if (typeof val1 === 'number' && typeof val2 === 'number' && typeof val3 === 'number' &&
              Math.abs(val1) > 1 && Math.abs(val2) > 1 && Math.abs(val3) >= 0 &&
              Math.abs(val1) < 50000 && Math.abs(val2) < 50000 && Math.abs(val3) < 10000) {
            worldCoords = { x: val1, y: val2, z: val3 };
            console.info(`[Wtfjmr Debug] Found direct coords at index ${i}: ${val1},${val2},${val3}`);
            break;
          }
          
          // Try IEEE 754 float interpretation
          if (Number.isInteger(val1) && Number.isInteger(val2) && Number.isInteger(val3)) {
            const buffer1 = new ArrayBuffer(4);
            const buffer2 = new ArrayBuffer(4);
            const buffer3 = new ArrayBuffer(4);
            
            new Uint32Array(buffer1)[0] = val1;
            new Uint32Array(buffer2)[0] = val2;
            new Uint32Array(buffer3)[0] = val3;
            
            const x = new Float32Array(buffer1)[0];
            const y = new Float32Array(buffer2)[0];
            const z = new Float32Array(buffer3)[0];
            
            if (!isNaN(x) && !isNaN(y) && !isNaN(z) &&
                Math.abs(x) > 1 && Math.abs(y) > 1 && Math.abs(z) >= 0 &&
                Math.abs(x) < 50000 && Math.abs(y) < 50000 && Math.abs(z) < 10000) {
              worldCoords = { x: x, y: y, z: z };
              console.info(`[Wtfjmr Debug] Found IEEE coords at index ${i}: ${val1},${val2},${val3} -> ${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`);
              break;
            }
          }
        }
      }
    }

    // Log spells targeting Jmrzz
    if (destination && destination.name === "Jmrzz" && me.inCombatWith(eventData.source.guid)) {
      // console.info(
      //   `Spell Started:\n` +
      //   `  Type: ${eventData.eventType}\n` +
      //   `  Name: ${spellName}\n` +
      //   `  ID: ${spellId}\n` +
      //   `  School: ${getSchoolName(school)} (${school})\n` +
      //   `  From: ${eventData.source.name || "unknown"} (${eventData.source.guid})\n` +
      //   `  To: ${destination.name || "unknown"} (${destination.guid})\n`
      // );
    }
    
        // Log all spells cast by Wtfjmr, regardless of destination
    if (eventData.source && eventData.source.name === "Wtfjmr") {
      // Capture player position for Dark Leap correlation
      const isGroundTargeted = !destination || destination.guid === "0:0 (0)";
      
             // Debug the guid structure more deeply
       if (destination && destination.guid) {
         console.info(`[Wtfjmr Debug] GUID Analysis:`);
         console.info(`  typeof guid: ${typeof destination.guid}`);
         console.info(`  guid toString(): "${destination.guid.toString()}"`);
         console.info(`  guid object keys:`, Object.keys(destination.guid));
         console.info(`  guid constructor:`, destination.guid.constructor.name);
       }
       
       // Force the condition for Dark Leap to always trigger for analysis
       const isDarkLeap = spellName === "Dark Leap";
       const isTrap = spellName === "Tar Trap" || spellName === "Implosive Trap";
       
       console.info(`[Wtfjmr Debug] Forcing analysis for Dark Leap: ${isDarkLeap}`);
       
       if (isDarkLeap || isTrap) {
         // Get player position before/during cast
         let playerPos = null;
         try {
           if (me && me.position) {
             playerPos = {
               x: me.position.x,
               y: me.position.y,
               z: me.position.z,
               rawX: me.rawPosition ? me.rawPosition.x : 'N/A',
               rawY: me.rawPosition ? me.rawPosition.y : 'N/A',
               rawZ: me.rawPosition ? me.rawPosition.z : 'N/A'
             };
           }
         } catch (e) {
           console.info(`[Wtfjmr Debug] Error getting player position:`, e);
         }
         
                             // Helper function to safely extract numeric position from objects
         const getNumericPosition = (obj) => {
           if (!obj || !obj.position) return null;
           const pos = obj.position;
           if (typeof pos.x === 'number' && typeof pos.y === 'number' && typeof pos.z === 'number') {
             return pos;
           }
           return null;
         };

         // For trap spells, find the CGAreaTrigger object using Cast+1 pattern
         // This elegant pattern works for ANY trap: Cast spell ID + 1 = Effect AreaTrigger spell ID
         // Could be generalized to work for all ground-targeted spells, not just specific ones
         if (spellName === "Tar Trap" || spellName === "Implosive Trap" || spellName === "Freezing Trap") {
             setTimeout(() => {
               try {
                 console.info(`[Wtfjmr Debug] === SEARCHING FOR TRAP OBJECTS ===`);
                 console.info(`[Wtfjmr Debug] Looking for ${spellName} (Cast ID: ${spellId}) objects...`);
                 
                 // Use elegant pattern: cast spell ID + 1 = effect spell ID for traps
                 // This works because:
                 // 1. Cast spells create AreaTrigger objects with effect spell IDs
                 // 2. CGAreaTrigger extends CGObject (has position, rawPosition, etc.)
                 // 3. Pattern: Tar Trap 187698 -> AreaTrigger 187699, Implosive Trap 462031 -> 462032
                 const effectSpellId = spellId + 1;
                 console.info(`[Wtfjmr Debug] Using trap pattern: Cast ID ${spellId} -> Effect ID ${effectSpellId} (Cast+1)`);
                 
                 const trapObjects = [];
                 const allAreaTriggers = [];
                 const allGameObjects = [];
                 
                 objMgr.objects.forEach((obj, hash) => {
                   // Collect all AreaTriggers for analysis
                   if (obj.type === wow.ObjectTypeID.AreaTrigger) {
                     allAreaTriggers.push({
                       spellId: obj.spellId,
                       position: obj.position,
                       caster: obj.caster ? obj.caster.toString() : 'unknown',
                       duration: obj.duration || 'unknown'
                     });
                     
                     // Use elegant Cast+1 pattern for trap detection
                     const effectSpellId = spellId + 1;
                     const isMatchingSpell = obj.spellId === spellId || obj.spellId === effectSpellId;
                     const isCastByUs = me && obj.caster && obj.caster.equals(me.guid);
                                            const isNearCastPos = playerPos && obj.position && 
                         typeof obj.position.x === 'number' && typeof obj.position.y === 'number' && typeof obj.position.z === 'number' &&
                         typeof playerPos.x === 'number' && typeof playerPos.y === 'number' && typeof playerPos.z === 'number' &&
                         Math.abs(obj.position.x - playerPos.x) < 10 &&
                         Math.abs(obj.position.y - playerPos.y) < 10 &&
                         Math.abs(obj.position.z - playerPos.z) < 5;
                     
                     if (isMatchingSpell || isCastByUs || isNearCastPos) {
                       let reason = [];
                       if (isMatchingSpell) {
                         if (obj.spellId === spellId) {
                           reason.push(`Exact spell ID (${obj.spellId})`);
                         } else if (obj.spellId === effectSpellId) {
                           reason.push(`Effect spell ID (cast: ${spellId}, effect: ${obj.spellId})`);
                         }
                       }
                       if (isCastByUs) reason.push('Cast by us');
                       if (isNearCastPos) reason.push('Near cast position');
                       
                       // Try to get position from different sources
                       let position = obj.position;
                       let rawPosition = obj.rawPosition;
                       
                       // Log detailed object information for debugging - try ALL position-related properties
                       const objInfo = {
                         spellId: obj.spellId,
                         spellIdNote: obj.spellId === spellId ? 'EXACT MATCH' : obj.spellId === effectSpellId ? 'EFFECT ID (+1)' : 'OTHER',
                         position: obj.position,
                         rawPosition: obj.rawPosition,
                         facing: obj.facing,
                         rawFacing: obj.rawFacing,
                         guid: obj.guid ? obj.guid.toString() : 'no guid',
                         caster: obj.caster ? obj.caster.toString() : 'no caster',
                         duration: obj.duration,
                         boundingRadius: obj.boundingRadius,
                         entryId: obj.entryId,
                         transportGuid: obj.transportGuid,
                         unsafeName: obj.unsafeName,
                         // Try alternative position properties
                         worldPosition: obj.worldPosition,
                         worldPos: obj.worldPos,
                         location: obj.location,
                         coords: obj.coords,
                         x: obj.x,
                         y: obj.y,
                         z: obj.z
                       };
                       
                       // Try calling position methods if they exist
                       if (typeof obj.getPosition === 'function') {
                         try {
                           objInfo.getPosition = obj.getPosition();
                         } catch (e) {
                           objInfo.getPosition = 'error calling getPosition()';
                         }
                       }
                       
                       if (typeof obj.getWorldPosition === 'function') {
                         try {
                           objInfo.getWorldPosition = obj.getWorldPosition();
                         } catch (e) {
                           objInfo.getWorldPosition = 'error calling getWorldPosition()';
                         }
                       }
                       
                       // Log all available properties
                       console.info(`[Wtfjmr Debug] AreaTrigger detailed info:`, JSON.stringify(objInfo, null, 2));
                       
                       // Also log all property names for discovery
                       try {
                         const propNames = Object.getOwnPropertyNames(obj).filter(name => 
                           name.toLowerCase().includes('pos') || 
                           name.toLowerCase().includes('coord') || 
                           name.toLowerCase().includes('location') ||
                           name.toLowerCase().includes('world') ||
                           name === 'x' || name === 'y' || name === 'z'
                         );
                         if (propNames.length > 0) {
                           console.info(`[Wtfjmr Debug] Position-related properties found: ${propNames.join(', ')}`);
                         }
                       } catch (e) {
                         console.info(`[Wtfjmr Debug] Could not enumerate object properties`);
                       }
                       
                       // Only add if position is valid (not 0,0,0)
                       if (position && (position.x !== 0 || position.y !== 0 || position.z !== 0)) {
                         console.info(`[Wtfjmr Debug] Found valid trap AreaTrigger: SpellID=${obj.spellId}, Position=${JSON.stringify(position)}, Reason=${reason.join(', ')}`);
                         trapObjects.push({
                           type: 'AreaTrigger',
                           position: position,
                           rawPosition: rawPosition,
                           spellId: obj.spellId,
                           caster: obj.caster ? obj.caster.toString() : 'unknown',
                           reason: reason.join(', ')
                         });
                       } else {
                         console.info(`[Wtfjmr Debug] Found AreaTrigger with invalid position (0,0,0): SpellID=${obj.spellId}, trying alternatives...`);
                         
                         // Try rawPosition if position is invalid
                         if (rawPosition && (rawPosition.x !== 0 || rawPosition.y !== 0 || rawPosition.z !== 0)) {
                           console.info(`[Wtfjmr Debug] Using rawPosition: ${JSON.stringify(rawPosition)}`);
                           trapObjects.push({
                             type: 'AreaTrigger',
                             position: rawPosition,
                             rawPosition: rawPosition,
                             spellId: obj.spellId,
                             caster: obj.caster ? obj.caster.toString() : 'unknown',
                             reason: reason.join(', ') + ' (used rawPosition)'
                           });
                         } else {
                           console.info(`[Wtfjmr Debug] Both position and rawPosition are invalid, skipping this AreaTrigger`);
                         }
                       }
                     }
                   }
                   
                   // Collect all GameObjects for analysis
                   if (obj.type === wow.ObjectTypeID.GameObject) {
                     allGameObjects.push({
                       goType: obj.goType,
                       position: obj.position,
                       createdBy: obj.goCreatedBy ? obj.goCreatedBy.toString() : 'unknown'
                     });
                     
                     // Check if it was created by us OR is close to our position (traps are placed where we cast)
                     const isCreatedByUs = me && obj.goCreatedBy && obj.goCreatedBy.equals(me.guid);
                     const isNearCastPosition = playerPos && obj.position && 
                       typeof obj.position.x === 'number' && typeof obj.position.y === 'number' && typeof obj.position.z === 'number' &&
                       typeof playerPos.x === 'number' && typeof playerPos.y === 'number' && typeof playerPos.z === 'number' &&
                       Math.abs(obj.position.x - playerPos.x) < 10 &&
                       Math.abs(obj.position.y - playerPos.y) < 10 &&
                       Math.abs(obj.position.z - playerPos.z) < 5;
                     
                     if (isCreatedByUs || isNearCastPosition) {
                       console.info(`[Wtfjmr Debug] Found potential trap GameObject: Type=${obj.goType}, Position=${JSON.stringify(obj.position)}, CreatedBy=${obj.goCreatedBy}, Reason=${isCreatedByUs ? 'Created by us' : 'Near cast position'}`);
                       trapObjects.push({
                         type: 'GameObject',
                         position: obj.position,
                         goType: obj.goType,
                         createdBy: obj.goCreatedBy ? obj.goCreatedBy.toString() : 'unknown',
                         reason: isCreatedByUs ? 'Created by us' : 'Near cast position'
                       });
                     }
                   }
                 });
                 
                 // Log summary of all objects for debugging
                 console.info(`[Wtfjmr Debug] Total AreaTriggers: ${allAreaTriggers.length}, GameObjects: ${allGameObjects.length}`);
                 if (allAreaTriggers.length > 0) {
                   console.info(`[Wtfjmr Debug] All AreaTriggers:`, JSON.stringify(allAreaTriggers.slice(0, 10))); // Show first 3
                 }
                 if (allGameObjects.length > 0) {
                   console.info(`[Wtfjmr Debug] Sample GameObjects:`, JSON.stringify(allGameObjects.slice(0, 3))); // Show first 3
                   
                   // Look for recently created GameObjects by us
                   const recentGameObjects = allGameObjects.filter(go => 
                     go.createdBy === me.guid.toString() || 
                     (me && go.createdBy.includes(me.guid.hash.toString(16)))
                   );
                   
                   if (recentGameObjects.length > 0) {
                     console.info(`[Wtfjmr Debug] GameObjects created by us:`, JSON.stringify(recentGameObjects));
                   }
                 }
                 
                 // Filter out traps with invalid positions
                 const validTrapObjects = trapObjects.filter(trap => 
                   trap.position && (trap.position.x !== 0 || trap.position.y !== 0 || trap.position.z !== 0)
                 );
                 
                 const invalidTrapObjects = trapObjects.filter(trap => 
                   !trap.position || (trap.position.x === 0 && trap.position.y === 0 && trap.position.z === 0)
                 );
                 
                 if (invalidTrapObjects.length > 0) {
                   console.info(`[Wtfjmr Debug] Found ${invalidTrapObjects.length} trap objects with invalid positions (0,0,0) - positions may not be loaded yet`);
                 }
                 
                 if (validTrapObjects.length > 0) {
                   console.info(`[Wtfjmr Debug] *** FOUND ${validTrapObjects.length} TRAP OBJECTS WITH VALID POSITIONS ***`);
                   validTrapObjects.forEach((trap, index) => {
                     console.info(`  Trap ${index + 1}: Type=${trap.type}, Position=(${trap.position.x.toFixed(2)}, ${trap.position.y.toFixed(2)}, ${trap.position.z.toFixed(2)})`);
                     
                     // Now correlate with combat log args!
                     console.info(`[Wtfjmr Debug] === CORRELATING TRAP POSITION WITH COMBAT LOG ===`);
                     const trapX = trap.position.x;
                     const trapY = trap.position.y;
                     const trapZ = trap.position.z;
                     
                                            // Skip correlation if trap position is invalid (0,0,0)
                       if (trapX === 0 && trapY === 0 && trapZ === 0) {
                         console.info(`[Wtfjmr Debug] Skipping correlation for trap with invalid position (0,0,0)`);
                         return;
                       }
                       
                       const matches = [];
                       eventData.args.forEach((val, index) => {
                         if (typeof val === 'number' && val !== 0 && Math.abs(val) > 0.001) {
                           // Check direct match
                           const directMatch = Math.abs(val - trapX) < 1 ||
                                             Math.abs(val - trapY) < 1 ||
                                             Math.abs(val - trapZ) < 1;
                         
                         if (directMatch) {
                           matches.push({
                             index: index,
                             value: val,
                             type: 'direct',
                             matchesX: Math.abs(val - trapX) < 1,
                             matchesY: Math.abs(val - trapY) < 1,
                             matchesZ: Math.abs(val - trapZ) < 1
                           });
                         }
                         
                         // Check IEEE 754 interpretation
                         if (Number.isInteger(val) && val > 1000) {
                           const buffer = new ArrayBuffer(4);
                           new Uint32Array(buffer)[0] = val;
                           const floatVal = new Float32Array(buffer)[0];
                           
                           if (!isNaN(floatVal) && Math.abs(floatVal) < 50000) {
                             const ieeeMatch = Math.abs(floatVal - trapX) < 1 ||
                                             Math.abs(floatVal - trapY) < 1 ||
                                             Math.abs(floatVal - trapZ) < 1;
                             
                             if (ieeeMatch) {
                               matches.push({
                                 index: index,
                                 value: val,
                                 floatValue: floatVal,
                                 type: 'ieee754',
                                 matchesX: Math.abs(floatVal - trapX) < 1,
                                 matchesY: Math.abs(floatVal - trapY) < 1,
                                 matchesZ: Math.abs(floatVal - trapZ) < 1
                               });
                             }
                           }
                         }
                       }
                     });
                     
                     if (matches.length > 0) {
                       console.info(`[Wtfjmr Debug] *** TRAP COORDINATE MATCHES FOUND ***`);
                       matches.forEach(match => {
                         const coordInfo = [];
                         if (match.matchesX) coordInfo.push('X');
                         if (match.matchesY) coordInfo.push('Y');
                         if (match.matchesZ) coordInfo.push('Z');
                         
                         console.info(`  Index ${match.index}: ${match.value} ${match.floatValue ? `(${match.floatValue.toFixed(6)})` : ''} - Matches: ${coordInfo.join(', ')}`);
                       });
                     } else {
                       console.info(`[Wtfjmr Debug] No combat log matches for trap position`);
                     }
                   });
                 } else {
                   console.info(`[Wtfjmr Debug] No trap objects found`);
                   console.info(`[Wtfjmr Debug] === DIAGNOSTIC INFO ===`);
                   console.info(`[Wtfjmr Debug] Cast position: (${playerPos.x.toFixed(2)}, ${playerPos.y.toFixed(2)}, ${playerPos.z.toFixed(2)})`);
                   console.info(`[Wtfjmr Debug] Player GUID: ${me ? me.guid.toString() : 'unknown'}`);
                   console.info(`[Wtfjmr Debug] Looking for spell ID: ${spellId}`);
                   
                   // Show any objects near our position for debugging
                   const nearbyObjects = [];
                   objMgr.objects.forEach((obj, hash) => {
                     const position = obj.position || obj.rawPosition;
                     if (position && playerPos &&
                         typeof position.x === 'number' && typeof position.y === 'number' && typeof position.z === 'number' &&
                         typeof playerPos.x === 'number' && typeof playerPos.y === 'number' && typeof playerPos.z === 'number' &&
                         Math.abs(position.x - playerPos.x) < 20 &&
                         Math.abs(position.y - playerPos.y) < 20 &&
                         Math.abs(position.z - playerPos.z) < 10) {
                       
                       // Special check for traps - look for objects created recently
                       // Note: obj.guid.low might be BigInt, so convert safely
                       const isRecentlyCreated = obj.guid && obj.guid.low && 
                         typeof obj.guid.low === 'number' && (Date.now() - obj.guid.low) < 5000; // within 5 seconds
                       const isPotentialTrap = obj.spellId === spellId || 
                                             (me && obj.caster && obj.caster.equals(me.guid)) ||
                                             (me && obj.goCreatedBy && obj.goCreatedBy.equals(me.guid));
                       
                       nearbyObjects.push({
                         type: obj.type,
                         typeName: Object.keys(wow.ObjectTypeID)[obj.type] || 'unknown',
                         position: position,
                         spellId: obj.spellId || 'N/A',
                         goType: obj.goType || 'N/A',
                         caster: obj.caster ? obj.caster.toString() : 'N/A',
                         createdBy: obj.goCreatedBy ? obj.goCreatedBy.toString() : 'N/A',
                         guid: obj.guid ? obj.guid.toString() : 'N/A',
                         entryId: obj.entryId || 'N/A',
                         isPotentialTrap: isPotentialTrap,
                         isRecentlyCreated: isRecentlyCreated
                       });
                     }
                   });
                   
                   if (nearbyObjects.length > 0) {
                     console.info(`[Wtfjmr Debug] Objects near cast position:`, JSON.stringify(nearbyObjects.slice(0, 10)));
                   } else {
                     console.info(`[Wtfjmr Debug] No objects found near cast position`);
                   }
                 }
               } catch (e) {
                 console.info(`[Wtfjmr Debug] Error searching for trap objects:`, e);
                 console.info(`[Wtfjmr Debug] Error type: ${typeof e}, name: ${e.name}, message: ${e.message}`);
               }
                            }, 1500); // Check for traps 1.5 seconds after cast
               
               // Also do a second check with longer delay in case positions need more time to load
               setTimeout(() => {
                 try {
                   console.info(`[Wtfjmr Debug] === SECOND TRAP SEARCH (3s delay) ===`);
                   console.info(`[Wtfjmr Debug] Re-checking for ${spellName} (Cast ID: ${spellId}) objects with proper positions...`);
                   
                   // Use elegant Cast+1 pattern for trap detection
                   const effectSpellId = spellId + 1;
                   console.info(`[Wtfjmr Debug] Looking for cast ID ${spellId} or effect ID ${effectSpellId} (Cast+1 pattern)`);
                   
                   const laterTrapObjects = [];
                                        objMgr.objects.forEach((obj, hash) => {
                       if (obj.type === wow.ObjectTypeID.AreaTrigger) {
                         const isCastByUs = me && obj.caster && obj.caster.equals(me.guid);
                         
                         // Use elegant Cast+1 pattern for trap detection
                         const isMatchingSpell = obj.spellId === spellId || obj.spellId === effectSpellId;
                         
                         if (isCastByUs || isMatchingSpell) {
                         const position = obj.position || obj.rawPosition;
                                                    if (position && (position.x !== 0 || position.y !== 0 || position.z !== 0)) {
                             const spellIdNote = obj.spellId === spellId ? '(exact match)' : obj.spellId === effectSpellId ? '(effect ID +1)' : '(other)';
                             console.info(`[Wtfjmr Debug] Found AreaTrigger with valid position: SpellID=${obj.spellId} ${spellIdNote}, Position=${JSON.stringify(position)}`);
                             laterTrapObjects.push({
                               type: 'AreaTrigger',
                               position: position,
                               spellId: obj.spellId,
                               caster: obj.caster ? obj.caster.toString() : 'unknown'
                             });
                           }
                       }
                     }
                   });
                   
                                        if (laterTrapObjects.length > 0) {
                       console.info(`[Wtfjmr Debug] *** FOUND ${laterTrapObjects.length} TRAPS WITH VALID POSITIONS ***`);
                       laterTrapObjects.forEach((trap, index) => {
                         const spellIdNote = trap.spellId === spellId ? '(exact match)' : trap.spellId === effectSpellId ? '(effect ID +1)' : '(other)';
                         console.info(`  Trap ${index + 1}: SpellID=${trap.spellId} ${spellIdNote}, Position=(${trap.position.x.toFixed(2)}, ${trap.position.y.toFixed(2)}, ${trap.position.z.toFixed(2)})`);
                         
                         // Correlate with combat log args
                         const trapX = trap.position.x;
                         const trapY = trap.position.y;
                         const trapZ = trap.position.z;
                       
                       const matches = [];
                       eventData.args.forEach((val, index) => {
                         if (typeof val === 'number' && val !== 0 && Math.abs(val) > 0.001) {
                           // Check direct match
                           const directMatch = Math.abs(val - trapX) < 5 ||
                                             Math.abs(val - trapY) < 5 ||
                                             Math.abs(val - trapZ) < 5;
                           
                           if (directMatch) {
                             matches.push({
                               index: index,
                               value: val,
                               matchesX: Math.abs(val - trapX) < 5,
                               matchesY: Math.abs(val - trapY) < 5,
                               matchesZ: Math.abs(val - trapZ) < 5
                             });
                           }
                           
                           // Check IEEE 754 interpretation
                           if (Number.isInteger(val) && val > 1000) {
                             const buffer = new ArrayBuffer(4);
                             new Uint32Array(buffer)[0] = val;
                             const floatVal = new Float32Array(buffer)[0];
                             
                             if (!isNaN(floatVal) && Math.abs(floatVal) < 50000) {
                               const ieeeMatch = Math.abs(floatVal - trapX) < 5 ||
                                               Math.abs(floatVal - trapY) < 5 ||
                                               Math.abs(floatVal - trapZ) < 5;
                               
                               if (ieeeMatch) {
                                 matches.push({
                                   index: index,
                                   value: val,
                                   floatValue: floatVal,
                                   type: 'ieee754',
                                   matchesX: Math.abs(floatVal - trapX) < 5,
                                   matchesY: Math.abs(floatVal - trapY) < 5,
                                   matchesZ: Math.abs(floatVal - trapZ) < 5
                                 });
                               }
                             }
                           }
                         }
                       });
                       
                       if (matches.length > 0) {
                         console.info(`[Wtfjmr Debug] *** FINAL COORDINATE CORRELATION SUCCESS ***`);
                         matches.forEach(match => {
                           const coordInfo = [];
                           if (match.matchesX) coordInfo.push('X');
                           if (match.matchesY) coordInfo.push('Y');
                           if (match.matchesZ) coordInfo.push('Z');
                           
                           console.info(`  Index ${match.index}: ${match.value} ${match.floatValue ? `(${match.floatValue.toFixed(6)})` : ''} - Matches: ${coordInfo.join(', ')}`);
                         });
                       }
                     });
                   } else {
                     console.info(`[Wtfjmr Debug] Still no traps with valid positions found after 3 seconds`);
                   }
                 } catch (e) {
                   console.info(`[Wtfjmr Debug] Error in second trap search:`, e);
                   console.info(`[Wtfjmr Debug] Error type: ${typeof e}, name: ${e.name}, message: ${e.message}`);
                 }
               }, 3000); // Check again after 3 seconds
           }
           
           // For Dark Leap, also track position after teleport
           if (spellName === "Dark Leap") {
             setTimeout(() => {
               try {
                 if (me && me.position) {
                   const afterPos = {
                     x: me.position.x,
                     y: me.position.y,
                     z: me.position.z,
                     rawX: me.rawPosition ? me.rawPosition.x : 'N/A',
                     rawY: me.rawPosition ? me.rawPosition.y : 'N/A',
                     rawZ: me.rawPosition ? me.rawPosition.z : 'N/A'
                   };
                   console.info(`[Wtfjmr Debug] === DARK LEAP RESULT ===`);
                   console.info(`[Wtfjmr Debug] Before:`, JSON.stringify(playerPos));
                   console.info(`[Wtfjmr Debug] After:`, JSON.stringify(afterPos));
                   console.info(`[Wtfjmr Debug] Delta:`, JSON.stringify({
                     x: afterPos.x - playerPos.x,
                     y: afterPos.y - playerPos.y,
                     z: afterPos.z - playerPos.z
                   }));
                   
                   // Now check if any args match the destination coordinates
                   console.info(`[Wtfjmr Debug] === DESTINATION COORDINATE ANALYSIS ===`);
                   console.info(`[Wtfjmr Debug] Looking for destination coordinates near: ${afterPos.x.toFixed(2)}, ${afterPos.y.toFixed(2)}, ${afterPos.z.toFixed(2)}`);
                   
                   const destTolerance = 50; // Same tolerance as used earlier
                   const destMatches = [];
                   eventData.args.forEach((val, index) => {
                     if (typeof val === 'number' && val !== 0 && Math.abs(val) > 0.001) {
                       // Check if value matches destination coordinates
                       const destMatch = Math.abs(val - afterPos.x) < destTolerance ||
                                        Math.abs(val - afterPos.y) < destTolerance ||
                                        Math.abs(val - afterPos.z) < destTolerance;
                       
                       if (destMatch) {
                         destMatches.push({
                           index: index,
                           value: val,
                           matchesDestX: Math.abs(val - afterPos.x) < destTolerance,
                           matchesDestY: Math.abs(val - afterPos.y) < destTolerance,
                           matchesDestZ: Math.abs(val - afterPos.z) < destTolerance
                         });
                       }
                       
                       // Check IEEE 754 interpretation for destination
                       if (Number.isInteger(val) && val > 1000) {
                         const buffer = new ArrayBuffer(4);
                         new Uint32Array(buffer)[0] = val;
                         const floatVal = new Float32Array(buffer)[0];
                         
                                                    if (!isNaN(floatVal) && Math.abs(floatVal) < 50000) {
                             const ieeeDestMatch = Math.abs(floatVal - afterPos.x) < destTolerance ||
                                                  Math.abs(floatVal - afterPos.y) < destTolerance ||
                                                  Math.abs(floatVal - afterPos.z) < destTolerance;
                             
                             if (ieeeDestMatch) {
                               destMatches.push({
                                 index: index,
                                 value: val,
                                 floatValue: floatVal,
                                 type: 'ieee754',
                                 matchesDestX: Math.abs(floatVal - afterPos.x) < destTolerance,
                                 matchesDestY: Math.abs(floatVal - afterPos.y) < destTolerance,
                                 matchesDestZ: Math.abs(floatVal - afterPos.z) < destTolerance
                               });
                             }
                           }
                       }
                     }
                   });
                   
                   if (destMatches.length > 0) {
                     console.info(`[Wtfjmr Debug] *** FOUND DESTINATION COORDINATE MATCHES ***`);
                     destMatches.forEach(match => {
                       const coordInfo = [];
                       if (match.matchesDestX) coordInfo.push('DestX');
                       if (match.matchesDestY) coordInfo.push('DestY');
                       if (match.matchesDestZ) coordInfo.push('DestZ');
                       
                       console.info(`  Index ${match.index}: ${match.value} ${match.floatValue ? `(${match.floatValue.toFixed(6)})` : ''} - Matches: ${coordInfo.join(', ')}`);
                     });
                   } else {
                     console.info(`[Wtfjmr Debug] No destination coordinate matches found`);
                   }
                 }
               } catch (e) {
                 console.info(`[Wtfjmr Debug] Error getting after position:`, e);
               }
             }, 1000); // Check position 1 second after cast
           }
        
                 console.info(`[Wtfjmr Debug] === GROUND TARGETED SPELL ANALYSIS ===`);
         console.info(`[Wtfjmr Debug] Spell: ${spellName} (ID: ${spellId})`);
         console.info(`[Wtfjmr Debug] Player Position:`, JSON.stringify(playerPos));
         console.info(`[Wtfjmr Debug] Event Type: ${eventData.eventType}`);
         console.info(`[Wtfjmr Debug] Args length:`, eventData.args ? eventData.args.length : 0);
        
        if (eventData.args) {
          // Show full args array for correlation
          console.info(`[Wtfjmr Debug] Full Args:`, eventData.args);
          
          // Check specific coordinate candidates
          const coordCandidates = eventData.args.slice(170, 185);
          console.info(`[Wtfjmr Debug] Args 170-185:`, coordCandidates);
          
          // Try to correlate with player position
          if (playerPos) {
            console.info(`[Wtfjmr Debug] === CORRELATION ANALYSIS ===`);
            
                         // Look for values that match player coordinates (within reasonable tolerance)
             const tolerance = 50; // Increased tolerance to catch scaled coordinates
             const matchingIndices = [];
             
             console.info(`[Wtfjmr Debug] Looking for coordinates near:`);
             console.info(`  Position: ${playerPos.x.toFixed(2)}, ${playerPos.y.toFixed(2)}, ${playerPos.z.toFixed(2)}`);
             console.info(`  RawPosition: ${playerPos.rawX.toFixed(6)}, ${playerPos.rawY.toFixed(6)}, ${playerPos.rawZ.toFixed(6)}`);
            
                         eventData.args.forEach((val, index) => {
               if (typeof val === 'number' && val !== 0 && Math.abs(val) > 0.001) { // Skip zeros but allow small rawPosition values
                 // Check direct match with position coordinates
                 const posMatch = Math.abs(val - playerPos.x) < tolerance || 
                                  Math.abs(val - playerPos.y) < tolerance || 
                                  Math.abs(val - playerPos.z) < tolerance;
                 
                 // Check direct match with rawPosition coordinates  
                 const rawMatch = Math.abs(val - playerPos.rawX) < 1 || 
                                  Math.abs(val - playerPos.rawY) < 1 || 
                                  Math.abs(val - playerPos.rawZ) < 1;
                 
                 if (posMatch || rawMatch) {
                   matchingIndices.push({
                     index: index,
                     value: val,
                     type: 'direct',
                     matchesX: Math.abs(val - playerPos.x) < tolerance,
                     matchesY: Math.abs(val - playerPos.y) < tolerance,
                     matchesZ: Math.abs(val - playerPos.z) < tolerance,
                     matchesRawX: Math.abs(val - playerPos.rawX) < 1,
                     matchesRawY: Math.abs(val - playerPos.rawY) < 1,
                     matchesRawZ: Math.abs(val - playerPos.rawZ) < 1
                   });
                 }
                 
                 // Check IEEE 754 float interpretation
                 if (Number.isInteger(val) && val > 1000) { // Only check larger integers for float conversion
                   const buffer = new ArrayBuffer(4);
                   new Uint32Array(buffer)[0] = val;
                   const floatVal = new Float32Array(buffer)[0];
                   
                   if (!isNaN(floatVal) && Math.abs(floatVal) < 50000) {
                     const ieeeMatch = Math.abs(floatVal - playerPos.x) < tolerance ||
                                       Math.abs(floatVal - playerPos.y) < tolerance ||
                                       Math.abs(floatVal - playerPos.z) < tolerance ||
                                       Math.abs(floatVal - playerPos.rawX) < 1 ||
                                       Math.abs(floatVal - playerPos.rawY) < 1 ||
                                       Math.abs(floatVal - playerPos.rawZ) < 1;
                     
                     if (ieeeMatch) {
                       matchingIndices.push({
                         index: index,
                         value: val,
                         floatValue: floatVal,
                         type: 'ieee754',
                         matchesX: Math.abs(floatVal - playerPos.x) < tolerance,
                         matchesY: Math.abs(floatVal - playerPos.y) < tolerance,
                         matchesZ: Math.abs(floatVal - playerPos.z) < tolerance,
                         matchesRawX: Math.abs(floatVal - playerPos.rawX) < 1,
                         matchesRawY: Math.abs(floatVal - playerPos.rawY) < 1,
                         matchesRawZ: Math.abs(floatVal - playerPos.rawZ) < 1
                       });
                     }
                   }
                 }
               }
             });
            
                         if (matchingIndices.length > 0) {
               console.info(`[Wtfjmr Debug] *** FOUND POTENTIAL COORDINATE MATCHES ***`);
               matchingIndices.forEach(match => {
                 const coordInfo = [];
                 if (match.matchesX) coordInfo.push('X');
                 if (match.matchesY) coordInfo.push('Y'); 
                 if (match.matchesZ) coordInfo.push('Z');
                 if (match.matchesRawX) coordInfo.push('RawX');
                 if (match.matchesRawY) coordInfo.push('RawY');
                 if (match.matchesRawZ) coordInfo.push('RawZ');
                 
                 console.info(`  Index ${match.index}: ${match.value} ${match.floatValue ? `(${match.floatValue.toFixed(6)})` : ''} - Matches: ${coordInfo.join(', ')}`);
               });
             } else {
               console.info(`[Wtfjmr Debug] No coordinate matches found`);
             }
          }
        }
        console.info(`[Wtfjmr Debug] === END ANALYSIS ===`);
      } else {
        // Regular logging for non-ground-targeted spells
        console.info(`[Wtfjmr Debug] Event Type: ${eventData.eventType}`);
        console.info(`[Wtfjmr Debug] Spell: ${spellName} (ID: ${spellId})`);
        console.info(`[Wtfjmr Debug] Source:`, JSON.stringify(eventData.source));
        console.info(`[Wtfjmr Debug] Destination:`, JSON.stringify(eventData.destination));
      }
      
      let targetInfo;
      if (destination) {
        targetInfo = `${destination.name || "unknown"} (${destination.guid})`;
      } else if (worldCoords) {
        targetInfo = `World Position (${worldCoords.x.toFixed(2)}, ${worldCoords.y.toFixed(2)}, ${worldCoords.z.toFixed(2)})`;
        console.info(`[Wtfjmr Debug] Found world coordinates:`, worldCoords);
      } else {
        targetInfo = "no target/unknown position";
        console.info(`[Wtfjmr Debug] No world coordinates found in args array`);
      }
      
      // Debug: Show args array for ground-targeted spells to help identify coordinate position
      if (!destination && eventData.args) {
        console.info(`[Wtfjmr Debug] Args array length: ${eventData.args.length}, last 15 values:`, eventData.args.slice(-15));
        console.info(`[Wtfjmr Debug] Full args array:`, eventData.args);
      }
      
      console.info(
        `[Wtfjmr Cast] Spell:\n` +
        `  Type: ${eventData.eventType}\n` +
        `  Name: ${spellName}\n` +
        `  ID: ${spellId}\n` +
        `  School: ${getSchoolName(school)} (${school})\n` +
        `  From: ${eventData.source.name || "unknown"} (${eventData.source.guid})\n` +
        `  To: ${targetInfo}\n` +
        `  Cast End: ${castEnd}\n`
      );
    }
    
    // Only track spells with destinations for the spell tracking system
    if (destination) {
      spellTracking.trackSpell(
        eventData.source.guid,
        destination.guid,
        spellId,
        spellName,
        school,
        castEnd
      );
    }
  }

  cleanupSpell(eventData) {
    if (eventData.source?.guid && eventData.destination) {
      const key = `${eventData.destination.guid.hash}_${eventData.args[0]}`;
      //console.info(`Cleaning up spell: ${eventData.args[0]} (${eventData.eventType})`);
      spellTracking.targetedSpells.delete(key);
      spellTracking.spellSchoolCache.delete(eventData.args[0]);
    }
  }
}

// Add periodic cleanup
setInterval(() => {
  if (spellTracking) {
    spellTracking.cleanup();
  }
}, 500);


const SpellSchool = {
  None: 0,
  Physical: 1,
  Holy: 2,
  Fire: 4,
  Nature: 8,
  Frost: 16,
  Shadow: 32,
  Arcane: 64,
  Holystrike: 3,
  Flamestrike: 5,
  Holyfire: 6,
  Stormstrike: 9,
  Holystorm: 10,
  Firestorm: 12,
  Froststrike: 17,
  Holyfrost: 18,
  Frostfire: 20,
  Froststorm: 24,
  Shadowstrike: 33,
  Shadowlight: 34,
  Shadowflame: 36,
  Shadowstorm: 40,
  Shadowfrost: 48,
  Spellstrike: 65,
  Divine: 66,
  Spellfire: 68,
  Spellstorm: 72,
  Spellfrost: 80,
  Spellshadow: 96,
  Elemental: 28,
  Chromatic: 124,
  Magic: 126,
  Chaos: 127
};

const getSchoolName = (schoolValue) => {
  const entry = Object.entries(SpellSchool).find(([name, value]) => value === schoolValue);
  return entry ? entry[0] : "Unknown";
};

// Create single instance
const spellTracking = new SpellTracking();
new SpellTrackingEventHandler();

// Export the instance
export default spellTracking;
