import Settings from '@/Core/Settings';
import objMgr, { me } from '@/Core/ObjectManager';
import colors from '@/Enums/Colors';
import { CooldownCategories, offensiveCooldowns } from '@/Data/OffensiveCooldowns';

class ESP {
  static tabName = "ESP";

  static options = [
    // Main toggles
    { type: "checkbox", uid: "ESPEnabled", text: "Enable ESP", default: false },
    { type: "checkbox", uid: "ESPShowFriends", text: "Show Friends", default: true },
    { type: "checkbox", uid: "ESPShowEnemies", text: "Show Enemies", default: true },
    
    // Target type filters
    { type: "checkbox", uid: "ESPShowPlayers", text: "Show Players", default: true },
    { type: "checkbox", uid: "ESPShowNPCs", text: "Show NPCs", default: false },
    { type: "checkbox", uid: "ESPShowPets", text: "Show Pets/Minions", default: false },
    { type: "checkbox", uid: "ESPShowGameObjects", text: "Show Game Objects", default: false },
    
    // Line settings
    { type: "checkbox", uid: "ESPDrawLines", text: "Draw Lines to Targets", default: true },
    { type: "slider", uid: "ESPLineThickness", text: "Line Thickness", min: 1, max: 10, default: 3 },
    { type: "slider", uid: "ESPLineOpacity", text: "Line Opacity (%)", min: 10, max: 100, default: 25 },
    
    // Circle settings
    { type: "checkbox", uid: "ESPDrawCircles", text: "Draw Circles Around Targets", default: true },
    { type: "slider", uid: "ESPCircleRadius", text: "Circle Radius (yards)", min: 1, max: 10, default: 4 },
    { type: "slider", uid: "ESPCircleSegments", text: "Circle Segments (quality)", min: 12, max: 72, default: 60 },
    { type: "slider", uid: "ESPCircleThickness", text: "Circle Line Thickness", min: 1, max: 8, default: 3 },
    { type: "slider", uid: "ESPCircleOpacity", text: "Circle Opacity (%)", min: 10, max: 100, default: 25 },
    { type: "checkbox", uid: "ESPUseEntitySize", text: "Use Entity Size for Circle Radius", default: true },
    { type: "checkbox", uid: "ESPCircleGradient", text: "Enable Circle Glow Effect", default: true },
    { type: "slider", uid: "ESPGlowLayers", text: "Glow Layers (quality)", min: 10, max: 20, default: 10 },
    
    // Color settings
    { type: "combobox", uid: "ESPFriendColor", text: "Friend Color", options: ["green", "blue", "lightblue", "aqua"], default: "green" },
    { type: "combobox", uid: "ESPEnemyColor", text: "Enemy Color", options: ["red", "orange", "yellow", "hotpink"], default: "red" },
    { type: "combobox", uid: "ESPTargetColor", text: "Current Target Color", options: ["yellow", "white", "orange", "coral"], default: "yellow" },
    { type: "combobox", uid: "ESPNPCColor", text: "NPC Color", options: ["gray", "lightgrey", "silver", "tan"], default: "gray" },
    { type: "combobox", uid: "ESPPetColor", text: "Pet/Minion Color", options: ["purple", "plum", "lavender", "pink"], default: "purple" },
    { type: "combobox", uid: "ESPGameObjectColor", text: "Game Object Color", options: ["turquoise", "teal", "aqua", "skyblue"], default: "turquoise" },
    { type: "combobox", uid: "ESPLOSColor", text: "Line of Sight Border Color", options: ["white", "silver", "lightgrey"], default: "white" },
    
    // LOS Settings
    { type: "checkbox", uid: "ESPDrawLOSBorders", text: "Draw LOS Borders on Lines/Circles", default: true },
    { type: "slider", uid: "ESPLOSThickness", text: "LOS Border Thickness", min: 1, max: 8, default: 8 },
    { type: "checkbox", uid: "ESPLOSGlow", text: "Enable LOS Border Glow Effect", default: true },
    { type: "slider", uid: "ESPLOSOpacity", text: "LOS Border Opacity (%)", min: 10, max: 100, default: 20 },
    { type: "slider", uid: "ESPLOSGlowLayers", text: "LOS Glow Layers", min: 1, max: 20, default: 1 },
    
    // Target Highlighting
    { type: "checkbox", uid: "ESPDrawTargetCircle", text: "Draw Separate Target Circle", default: true },
    { type: "slider", uid: "ESPTargetCircleSize", text: "Target Circle Size Multiplier (%)", min: 110, max: 200, default: 110 },
    { type: "checkbox", uid: "ESPTargetGlow", text: "Enable Target Circle Glow", default: true },
    
    // Information Display
    { type: "checkbox", uid: "ESPShowNames", text: "Show Unit Names", default: false },
    { type: "checkbox", uid: "ESPShowHealth", text: "Show Health Percentage", default: false },
    { type: "checkbox", uid: "ESPShowCooldowns", text: "Show Major Cooldowns", default: false },

    // Range and filters
    { type: "slider", uid: "ESPMaxRange", text: "Max Range (yards)", min: 10, max: 100, default: 40 },
    { type: "slider", uid: "ESPMaxTargets", text: "Max Targets to Display", min: 1, max: 50, default: 10 },
    { type: "checkbox", uid: "ESPOnlyInCombat", text: "Only Show in Combat", default: false },
    
    // Performance
    { type: "slider", uid: "ESPUpdateRate", text: "Update Rate (ms)", min: 2, max: 100, default: 15 },
  ];

  static lastUpdate = 0;
  static cachedTargets = [];

  static renderOptions(renderFunction) {
    renderFunction([
      { header: "Main Settings", options: this.options.slice(0, 3) },
      { header: "Target Type Filters", options: this.options.slice(3, 7) },
      { header: "Line Settings", options: this.options.slice(7, 10) },
      { header: "Circle Settings", options: this.options.slice(10, 18) },
      { header: "Colors", options: this.options.slice(18, 25) },
      { header: "LOS Settings", options: this.options.slice(25, 30) },
      { header: "Target Highlighting", options: this.options.slice(30, 33) },
      { header: "Information Display", options: this.options.slice(33, 36) },
      { header: "Filters & Range", options: this.options.slice(36, 39) },
      { header: "Performance", options: this.options.slice(39) },
    ]);
  }

  static tick() {
    if (!Settings.ESPEnabled || !me) return;

    const currentTime = wow.frameTime;
    
    // Update rate throttling
    if (currentTime - this.lastUpdate < Settings.ESPUpdateRate) {
      this.render(); // Still render with cached data
      return;
    }
    
    this.lastUpdate = currentTime;
    this.updateTargets();
    this.render();
  }

  static updateTargets() {
    this.cachedTargets = [];
    const maxRange = Settings.ESPMaxRange;
    const maxTargets = Settings.ESPMaxTargets || 10;

    // Only show in combat check
    if (Settings.ESPOnlyInCombat && !me.inCombat()) {
      return;
    }

    // Collect all valid targets with their distances and priorities
    const allTargets = [];
    
    objMgr.objects.forEach((obj) => {
      if (obj === me) return; // Skip self

      const distance = me.distanceTo(obj);
      if (distance > maxRange) return;

      // Check object type and filters
      const objectType = this.getObjectType(obj);
      if (!this.shouldShowObjectType(objectType)) return;

      // Skip dead objects (only applies to units)
      if (obj instanceof wow.CGUnit && obj.deadOrGhost) return;

      const targetInfo = this.analyzeTarget(obj, objectType);
      if (targetInfo.shouldShow) {
        // Assign priority: Players = 1 (highest), Others = 2 (lower)
        const priority = (obj instanceof wow.CGUnit && obj.isPlayer && obj.isPlayer()) ? 1 : 2;
        allTargets.push({
          ...targetInfo,
          distance: distance,
          priority: priority
        });
      }
    });

    // Sort by priority (1 = players first), then by distance (nearest first)
    allTargets.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower priority number = higher priority
      }
      return a.distance - b.distance; // Closer = higher priority
    });

    // Take only the top N targets
    this.cachedTargets = allTargets.slice(0, maxTargets);
  }

  static analyzeTarget(obj, objectType) {
    let isFriend = false;
    let isEnemy = false;
    let isCurrentTarget = false;
    let hasLOS = false;
    let shouldShow = false;

    // For units, check friend/enemy status
    if (obj instanceof wow.CGUnit) {
      isFriend = me.canAttack && !me.canAttack(obj);
      isEnemy = me.canAttack && me.canAttack(obj);
      isCurrentTarget = me.target && me.target.equals && me.target.equals(obj.guid);
      hasLOS = me.withinLineOfSight && me.withinLineOfSight(obj);
      
      shouldShow = (isFriend && Settings.ESPShowFriends) || 
                   (isEnemy && Settings.ESPShowEnemies);
    } else {
      // For non-units (game objects), always show them if the type is enabled
      shouldShow = true;
      hasLOS = true; // Assume game objects are always visible
    }

    return {
      unit: obj,
      objectType,
      isFriend,
      isEnemy,
      isCurrentTarget,
      hasLOS,
      shouldShow,
      screenPos: wow.WorldFrame.getScreenCoordinates(obj.position),
      distance: me.distanceTo(obj)
    };
  }

  static getObjectType(obj) {
    if (obj instanceof wow.CGUnit) {
      if (obj.isPlayer && obj.isPlayer()) {
        return 'player';
      } else if (this.isPetOrMinion(obj)) {
        return 'pet';
      } else {
        return 'npc';
      }
    } else if (obj instanceof wow.CGGameObject) {
      return 'gameobject';
    } else {
      return 'other';
    }
  }

  static shouldShowObjectType(objectType) {
    switch (objectType) {
      case 'player':
        return Settings.ESPShowPlayers;
      case 'npc':
        return Settings.ESPShowNPCs;
      case 'pet':
        return Settings.ESPShowPets;
      case 'gameobject':
        return Settings.ESPShowGameObjects;
      default:
        return false;
    }
  }

  static isPetOrMinion(unit) {
    if (!unit || !(unit instanceof wow.CGUnit)) return false;

    // Check if it has ownership properties (summoned/created by a player)
    if (unit.summonedBy && !unit.summonedBy.isNull) return true;
    if (unit.createdBy && !unit.createdBy.isNull) return true;
    if (unit.charmedBy && !unit.charmedBy.isNull) return true;
    if (unit.demonCreator && !unit.demonCreator.isNull) return true;

    // Check if it has a pet number
    if (unit.petNumber && unit.petNumber > 0) return true;

    // Check creature type/family for typical pets
    const petLikeCreatureTypes = [1, 3, 4, 6, 9, 11]; // Beast, Demon, Elemental, Undead, Mechanical, Totem
    if (unit.creatureType !== undefined && petLikeCreatureTypes.includes(unit.creatureType)) {
      return true;
    }

    return false;
  }

  static render() {
    if (!this.cachedTargets.length) return;

    const canvas = imgui.getBackgroundDrawList();
    const viewport = imgui.getMainViewport();
    if (!viewport) return;

    // Get player's feet position on screen
    const playerFeetWorldPos = new Vector3(
      me.position.x,
      me.position.y, 
      me.position.z
    );
    const playerFeetScreenPos = wow.WorldFrame.getScreenCoordinates(playerFeetWorldPos);

    for (const target of this.cachedTargets) {
      if (!target.screenPos || target.screenPos.x === -1) continue;

      const baseColor = this.getTargetColor(target);
      const lineColor = this.applyOpacity(baseColor, Settings.ESPLineOpacity / 100);
      const circleColor = this.applyOpacity(baseColor, Settings.ESPCircleOpacity / 100);

      // Draw line from player's feet to target
      if (Settings.ESPDrawLines && playerFeetScreenPos && playerFeetScreenPos.x !== -1) {
        canvas.addLine(
          playerFeetScreenPos,
          target.screenPos,
          lineColor,
          Settings.ESPLineThickness
        );
        
        // Draw LOS border on line if enabled and target has LOS
        if (target.hasLOS && Settings.ESPDrawLOSBorders) {
          this.drawLOSLineBorder(canvas, playerFeetScreenPos, target.screenPos);
        }
      }

      // Draw circle around target
      if (Settings.ESPDrawCircles) {
        this.drawTargetCircle(canvas, target, circleColor);
        
        // Draw LOS border on circle if enabled and target has LOS
        if (target.hasLOS && Settings.ESPDrawLOSBorders) {
          this.drawLOSCircleBorder(canvas, target);
        }
      }

      // Draw separate target highlighting circle if this is the current target
      if (target.isCurrentTarget && Settings.ESPDrawTargetCircle) {
        this.drawTargetHighlight(canvas, target);
      }

      // Draw information text
      this.drawTargetInformation(canvas, target);
    }
  }

  static getTargetColor(target) {
    // Current target gets priority
    if (target.isCurrentTarget) {
      return colors[Settings.ESPTargetColor] || colors.yellow;
    }
    
    // For units, check friend/enemy status first
    if (target.unit instanceof wow.CGUnit) {
      if (target.isFriend) {
        return colors[Settings.ESPFriendColor] || colors.green;
      } else if (target.isEnemy) {
        return colors[Settings.ESPEnemyColor] || colors.red;
      }
    }
    
    // Object type colors for neutral units and objects
    switch (target.objectType) {
      case 'player':
        // Neutral players (shouldn't happen much but fallback)
        return colors[Settings.ESPFriendColor] || colors.green;
      case 'npc':
        return colors[Settings.ESPNPCColor] || colors.gray;
      case 'pet':
        return colors[Settings.ESPPetColor] || colors.purple;
      case 'gameobject':
        return colors[Settings.ESPGameObjectColor] || colors.turquoise;
      default:
        return colors.white; // Fallback
    }
  }

  static drawTargetCircle(canvas, target, color) {
    const baseRadius = this.getEntityRadius(target);
    const segments = Settings.ESPCircleSegments;
    const thickness = Settings.ESPCircleThickness;
    
    // Draw the circle with glow effect if enabled
    if (Settings.ESPCircleGradient) {
      this.drawGlowCircle(canvas, target, baseRadius, color, segments, thickness);
    } else {
      this.drawSimpleCircle(canvas, target, baseRadius, color, segments, thickness);
    }
  }

  static drawSimpleCircle(canvas, target, radius, color, segments, thickness) {
    const step = (2 * Math.PI) / segments;
    const points = [];

    // Generate circle points in 3D world space
    for (let i = 0; i < segments; i++) {
      const angle = step * i;
      const worldPoint = new Vector3(
        target.unit.position.x + radius * Math.cos(angle),
        target.unit.position.y + radius * Math.sin(angle),
        target.unit.position.z
      );
      
      const screenPoint = wow.WorldFrame.getScreenCoordinates(worldPoint);
      if (screenPoint && screenPoint.x !== -1) {
        points.push(screenPoint);
      }
    }

    // Draw the circle segments normally
    for (let i = 0; i < points.length; i++) {
      const start = points[i];
      const end = points[(i + 1) % points.length];
      canvas.addLine(start, end, color, thickness);
    }
  }

  static drawGlowCircle(canvas, target, baseRadius, baseColor, segments, thickness) {
    const glowLayers = Settings.ESPGlowLayers;
    const step = (2 * Math.PI) / segments;
    
    // Draw multiple concentric circles with decreasing opacity for glow effect
    for (let layer = glowLayers; layer >= 1; layer--) {
      const layerRadius = baseRadius * (0.5 + (layer / glowLayers) * 0.5); // 50% to 100% of base radius
      const layerOpacity = (layer / glowLayers) * 0.8; // Fade from center to edge
      const layerThickness = Math.max(1, thickness * (layer / glowLayers)); // Thicker lines toward edge
      
      // Apply the layer opacity while respecting the base opacity setting
      const currentOpacity = Settings.ESPCircleOpacity / 100; // Convert percentage to decimal
      const finalOpacity = currentOpacity * layerOpacity;
      const layerColor = this.applyOpacity(baseColor, finalOpacity);
      
      const points = [];
      
      // Generate circle points for this layer
      for (let i = 0; i < segments; i++) {
        const angle = step * i;
        const worldPoint = new Vector3(
          target.unit.position.x + layerRadius * Math.cos(angle),
          target.unit.position.y + layerRadius * Math.sin(angle),
          target.unit.position.z
        );
        
        const screenPoint = wow.WorldFrame.getScreenCoordinates(worldPoint);
        if (screenPoint && screenPoint.x !== -1) {
          points.push(screenPoint);
        }
      }
      
      // Draw this layer of the glow
      for (let i = 0; i < points.length; i++) {
        const start = points[i];
        const end = points[(i + 1) % points.length];
        canvas.addLine(start, end, layerColor, layerThickness);
      }
    }
  }

  static getEntityRadius(target) {
    if (!Settings.ESPUseEntitySize || !(target.unit instanceof wow.CGUnit)) {
      return Settings.ESPCircleRadius;
    }

    const unit = target.unit;
    let radius = Settings.ESPCircleRadius;

    // Use boundingRadius if available
    if (unit.boundingRadius && unit.boundingRadius > 0) {
      radius = Math.max(unit.boundingRadius, 1.5); // Minimum 1.5 yards
    }

    // Scale by displayScale if available and reasonable
    if (unit.displayScale && unit.displayScale > 0.1 && unit.displayScale < 5.0) {
      radius *= unit.displayScale;
    }

    // Clamp radius to reasonable bounds
    return Math.min(Math.max(radius, 1), 15);
  }

  static drawLOSLineBorder(canvas, startPos, endPos) {
    const losColor = colors[Settings.ESPLOSColor] || colors.white;
    const baseOpacity = Settings.ESPLOSOpacity / 100;
    
    if (Settings.ESPLOSGlow) {
      const glowLayers = Settings.ESPLOSGlowLayers;
      
      // Draw multiple parallel lines with decreasing opacity for glow effect
      for (let layer = glowLayers; layer >= 1; layer--) {
        const layerOpacity = baseOpacity * (layer / glowLayers) * 0.8;
        const layerColor = this.applyOpacity(losColor, layerOpacity);
        const offset = layer; // Pixel offset for glow layers
        
        // Draw offset lines to create glow effect
        const offsetStart = { x: startPos.x + offset, y: startPos.y };
        const offsetEnd = { x: endPos.x + offset, y: endPos.y };
        canvas.addLine(offsetStart, offsetEnd, layerColor, Settings.ESPLOSThickness);
        
        if (offset > 1) {
          const offsetStart2 = { x: startPos.x - offset, y: startPos.y };
          const offsetEnd2 = { x: endPos.x - offset, y: endPos.y };
          canvas.addLine(offsetStart2, offsetEnd2, layerColor, Settings.ESPLOSThickness);
        }
      }
    } else {
      // Simple border line
      const borderColor = this.applyOpacity(losColor, baseOpacity);
      canvas.addLine(startPos, endPos, borderColor, Settings.ESPLOSThickness);
    }
  }

  static drawLOSCircleBorder(canvas, target) {
    const losColor = colors[Settings.ESPLOSColor] || colors.white;
    const baseRadius = this.getEntityRadius(target);
    const radius = baseRadius + 0.3; // Slightly larger than main circle
    const segments = Settings.ESPCircleSegments;
    const baseOpacity = Settings.ESPLOSOpacity / 100;
    
    if (Settings.ESPLOSGlow) {
      // Use glow effect for LOS circle border
      const glowLayers = Settings.ESPLOSGlowLayers;
      const step = (2 * Math.PI) / segments;
      
      for (let layer = glowLayers; layer >= 1; layer--) {
        const layerRadius = radius + (layer * 0.2); // Slightly expanding radius for glow
        const layerOpacity = baseOpacity * (layer / glowLayers) * 0.7;
        const layerColor = this.applyOpacity(losColor, layerOpacity);
        
        const points = [];
        
        for (let i = 0; i < segments; i++) {
          const angle = step * i;
          const worldPoint = new Vector3(
            target.unit.position.x + layerRadius * Math.cos(angle),
            target.unit.position.y + layerRadius * Math.sin(angle),
            target.unit.position.z
          );
          
          const screenPoint = wow.WorldFrame.getScreenCoordinates(worldPoint);
          if (screenPoint && screenPoint.x !== -1) {
            points.push(screenPoint);
          }
        }
        
        for (let i = 0; i < points.length; i++) {
          const start = points[i];
          const end = points[(i + 1) % points.length];
          canvas.addLine(start, end, layerColor, Settings.ESPLOSThickness);
        }
      }
    } else {
      // Simple LOS border circle
      this.drawSimpleCircle(canvas, target, radius, this.applyOpacity(losColor, baseOpacity), segments, Settings.ESPLOSThickness);
    }
  }

  static drawTargetHighlight(canvas, target) {
    const targetColor = colors[Settings.ESPTargetColor] || colors.yellow;
    const baseRadius = this.getEntityRadius(target);
    const highlightRadius = baseRadius * (Settings.ESPTargetCircleSize / 100);
    const segments = Settings.ESPCircleSegments;
    const thickness = Math.max(2, Settings.ESPCircleThickness + 1);
    
    if (Settings.ESPTargetGlow) {
      // Use glow effect for target highlight
      this.drawGlowCircle(canvas, target, highlightRadius, targetColor, segments, thickness);
    } else {
      // Simple target highlight circle
      this.drawSimpleCircle(canvas, target, highlightRadius, targetColor, segments, thickness);
    }
  }

  static applyOpacity(color, opacity) {
    // Extract RGBA components
    const r = (color) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = (color >> 16) & 0xFF;
    const a = Math.floor(opacity * 255);
    
    // Reconstruct color with new alpha
    return (a << 24) | (b << 16) | (g << 8) | r;
  }

  static drawTargetInformation(canvas, target) {
    let yOffset = 5; // Start slightly below the unit
    
    // Show unit name
    if (Settings.ESPShowNames && target.unit) {
      try {
        const unitName = target.unit.unsafeName || target.unit.name;
        
        if (unitName && typeof unitName === 'string' && unitName.trim() !== '') {
          const trimmedName = unitName.trim();
          const textColor = colors.white || 0xFFFFFFFF; // Fallback to white if colors.white is null
          
          // Calculate text width to center it
          const textSize = imgui.calcTextSize(trimmedName);
          const centeredX = target.screenPos.x - (textSize.x / 2);
          
          canvas.addText(
            trimmedName,
            { x: centeredX, y: target.screenPos.y + yOffset },
            textColor,
            null,
            12
          );
          yOffset += 15;
        }
      } catch (error) {
        console.log(`Error displaying unit name: ${error.message}`);
      }
    }
    
    // Show health percentage
    if (Settings.ESPShowHealth && target.unit && typeof target.unit.pctHealth === 'number' && !isNaN(target.unit.pctHealth)) {
      try {
        const healthText = `${target.unit.pctHealth.toFixed(0)}%`;
        const healthColor = target.unit.pctHealth > 50 ? (colors.green || 0xFF00FF00) : 
                           target.unit.pctHealth > 25 ? (colors.yellow || 0xFFFFFF00) : (colors.red || 0xFFFF0000);
        
        // Calculate text width to center it
        const textSize = imgui.calcTextSize(healthText);
        const centeredX = target.screenPos.x - (textSize.x / 2);
        
        canvas.addText(
          healthText,
          { x: centeredX, y: target.screenPos.y + yOffset },
          healthColor,
          null,
          12
        );
        yOffset += 15;
      } catch (error) {
        console.log(`Error displaying health: ${error.message}`);
      }
    }
    
    // Show major cooldowns
    if (Settings.ESPShowCooldowns && target.unit) {
      try {
        const activeCooldowns = this.getActiveMajorCooldowns(target.unit);
        for (const cooldown of activeCooldowns) {
          if (cooldown && typeof cooldown === 'string' && cooldown.trim() !== '') {
            const cooldownColor = colors.orange || 0xFFFFA500;
            const trimmedCooldown = cooldown.trim();
            
            // Calculate text width to center it
            const textSize = imgui.calcTextSize(trimmedCooldown);
            const centeredX = target.screenPos.x - (textSize.x / 2);
            
            canvas.addText(
              trimmedCooldown,
              { x: centeredX, y: target.screenPos.y + yOffset },
              cooldownColor,
              null,
              11
            );
            yOffset += 12;
          }
        }
      } catch (error) {
        console.log(`Error displaying cooldowns: ${error.message}`);
      }
    }
  }

  static getActiveMajorCooldowns(unit) {
    if (!unit || !unit.getAura) return [];
    
    const activeCooldowns = [];
    const majorCategories = [
      CooldownCategories.MAJOR_OFFENSIVE,
      CooldownCategories.MAGIC_BURST,
      CooldownCategories.PHYSICAL_BURST,
      CooldownCategories.MAJOR_DEFENSIVE,
      CooldownCategories.IMMUNITY
    ];
    
    // Check for major cooldown auras
    for (const [spellId, cooldownData] of Object.entries(offensiveCooldowns)) {
      if (majorCategories.includes(cooldownData.category)) {
        const aura = unit.getAura(parseInt(spellId));
        if (aura) {
          // Get remaining duration in seconds
          const remainingSeconds = Math.ceil(aura.remaining / 1000);
          
          // Build display name with duration
          let displayName = cooldownData.name;
          if (remainingSeconds > 0) {
            displayName += ` (${remainingSeconds}s)`;
          }
          
          // Add stack count if > 1
          if (aura.stacks && aura.stacks > 1) {
            displayName += ` [${aura.stacks}]`;
          }
          
          activeCooldowns.push(displayName);
        }
      }
    }
    
    return activeCooldowns.slice(0, 3); // Limit to 3 cooldowns to avoid screen clutter
  }


}

export default ESP;

