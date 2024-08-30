import Settings from '@/Core/Settings';
import Gatherables from '@/Data/Gatherables';
import objMgr from '@/Core/ObjectManager';
import { me } from '@/Core/ObjectManager';
import colors from '@/Enums/Colors';
import { Classification } from '@/Enums/UnitEnums';

const objectColors = {
  herbs: colors.green,
  ores: colors.orange,
  treasures: colors.silver,
  quests: colors.yellow,
  rares: colors.purple,
  default: colors.white
};

class Radar {
  static options = [
    { type: "checkbox", uid: "ExtraRadar", text: "Enable Radar", default: false },

    { header: "Tracking Options" },
    { type: "checkbox", uid: "ExtraRadarTrackHerbs", text: "Track Herbs", default: false },
    { type: "checkbox", uid: "ExtraRadarTrackOres", text: "Track Ores", default: false },
    { type: "checkbox", uid: "ExtraRadarTrackTreasures", text: "Track Treasures", default: false },
    { type: "checkbox", uid: "ExtraRadarTrackQuests", text: "Track Quest Objectives", default: false },
    { type: "checkbox", uid: "ExtraRadarTrackRares", text: "Track Rares", default: false },
    { type: "checkbox", uid: "ExtraRadarTrackEverything", text: "Track Everything", default: false },

    { header: "Line Drawing Options" },
    { type: "checkbox", uid: "ExtraRadarDrawLinesClosest", text: "Draw Line to Closest Object", default: false },
    { type: "checkbox", uid: "ExtraRadarDrawLinesHerbs", text: "Draw Lines to Herbs", default: false },
    { type: "checkbox", uid: "ExtraRadarDrawLinesOres", text: "Draw Lines to Ores", default: false },
    { type: "checkbox", uid: "ExtraRadarDrawLinesTreasures", text: "Draw Lines to Treasures", default: false },
    { type: "checkbox", uid: "ExtraRadarDrawLinesQuests", text: "Draw Lines to Quest Objectives", default: false },
    { type: "checkbox", uid: "ExtraRadarDrawLinesRares", text: "Draw Lines to Rares", default: false },
    { type: "checkbox", uid: "ExtraRadarDrawLinesEverything", text: "Draw Lines to Everything (When Tracked)", default: false },

    { header: "Debug Options" },
    { type: "checkbox", uid: "ExtraRadarDrawDebug", text: "Draw Debug Info", default: false },
    { type: "slider", uid: "ExtraRadarLoadDistance", text: "Radar Load Distance", default: 200, min: 1, max: 200 }
  ];

  static tabName = "Radar";

  static renderOptions(renderFunction) {
    renderFunction([
      { header: "General Radar Settings", options: this.options.slice(0, 1) },
      { header: "Tracking Options", collapsible: true, options: this.options.slice(2, 8) },
      { header: "Line Drawing Options", collapsible: true, options: this.options.slice(9, 16) },
      { header: "Debug Options", collapsible: true, options: this.options.slice(17) }
    ]);
  }

  static getFilteredAndSortedObjects(filterCondition) {
    const validObjects = [];
    objMgr.objects.forEach(obj => {
      if (filterCondition(obj) && this.withinDistance(obj) && obj.interactable) {
        validObjects.push(obj);
      }
    });
    return validObjects.sort((a, b) => me.distanceTo(a.position) - me.distanceTo(b.position));
  }

  static drawObjects(objects, color, drawLinesSetting) {
    const canvas = imgui.getBackgroundDrawList();
    const mePos = wow.WorldFrame.getScreenCoordinates(me.position);

    objects.forEach(obj => {
      const objPos = wow.WorldFrame.getScreenCoordinates(obj.position);
      if (objPos.x !== -1) {
        // On-screen object
        if (Settings[drawLinesSetting]) {
          canvas.addLine(mePos, objPos, imgui.getColorU32(color), 1);
        }
        this.drawObjectText(obj, objPos);
      }
    });
  }

  static drawOffScreenObjects(objects) {
    const canvas = imgui.getBackgroundDrawList();
    const lineHeight = 0.3;
    const maxLines = 5;
    const headerText = "OFF SCREEN";
    const separatorHeight = 0.1;
    const separatorLength = 80;

    const headerColor = imgui.getColorU32(colors.white);
    const separatorColor = imgui.getColorU32(colors.white);

    const offScreenObjects = objects.filter(obj => wow.WorldFrame.getScreenCoordinates(obj.position).x === -1);

    if (offScreenObjects.length > 0) {
      const headerWorldPos = new Vector3(me.position.x, me.position.y, me.position.z + me.displayHeight + 1);
      const headerScreenPos = wow.WorldFrame.getScreenCoordinates(headerWorldPos);

      function estimateTextWidth(text) {
        return text.length * 7;
      }

      const separatorWorldPosStart = new Vector3(me.position.x, me.position.y, me.position.z + me.displayHeight + 1 + separatorHeight);
      const separatorScreenPosStart = wow.WorldFrame.getScreenCoordinates(separatorWorldPosStart);
      const separatorScreenPosEnd = new Vector2(separatorScreenPosStart.x + separatorLength, separatorScreenPosStart.y);

      const separatorCenterX = (separatorScreenPosStart.x + separatorScreenPosEnd.x) / 2;

      const headerTextWidth = estimateTextWidth(headerText);
      const headerTextCenterOffset = headerTextWidth / 2;
      const centeredHeaderPos = new Vector2(separatorCenterX - headerTextCenterOffset, headerScreenPos.y);

      canvas.addText(headerText, centeredHeaderPos, headerColor);
      canvas.addLine(separatorScreenPosStart, separatorScreenPosEnd, separatorColor);

      offScreenObjects.sort((a, b) => me.distanceTo(a.position) - me.distanceTo(b.position));

      function getDistanceColor(distance) {
        if (distance < 50) return imgui.getColorU32(colors.green);
        if (distance < 100) return imgui.getColorU32(colors.orange);
        return imgui.getColorU32(colors.red);
      }

      const uniqueObjects = new Map();
      offScreenObjects.forEach(obj => {
        const key = `${obj.name}-${obj.entryId}`;
        if (!uniqueObjects.has(key) || me.distanceTo(obj.position) < me.distanceTo(uniqueObjects.get(key).position)) {
          uniqueObjects.set(key, obj);
        }
      });

      Array.from(uniqueObjects.values()).slice(0, maxLines).forEach((obj, index) => {
        const distance = Math.round(me.distanceTo(obj.position));
        const text = `${obj.name} (${distance}y)`;
        const textWidth = estimateTextWidth(text);
        const textCenterOffset = textWidth / 2;
        const worldPos = new Vector3(me.position.x, me.position.y, me.position.z + me.displayHeight + 1.5 + separatorHeight + index * lineHeight);
        const screenPos = wow.WorldFrame.getScreenCoordinates(worldPos);
        const color = getDistanceColor(distance);
        canvas.addText(text, new Vector2(separatorCenterX - textCenterOffset, screenPos.y), color);
      });

      if (uniqueObjects.size > maxLines) {
        const moreText = `... and ${uniqueObjects.size - maxLines} more`;
        const moreTextWidth = estimateTextWidth(moreText);
        const moreTextCenterOffset = moreTextWidth / 2;
        const worldPos = new Vector3(me.position.x, me.position.y, me.position.z + me.displayHeight + 2 + separatorHeight + maxLines * lineHeight);
        const screenPos = wow.WorldFrame.getScreenCoordinates(worldPos);
        canvas.addText(moreText, new Vector2(separatorCenterX - moreTextCenterOffset, screenPos.y), imgui.getColorU32(colors.white));
      }
    }
  }

  static drawObjectText(obj, objPos) {
    let text = obj.name;
    if (Settings.ExtraRadarDrawDistance) {
      const distance = Math.round(me.distanceTo(obj.position));
      text += ` (${distance}y)`;
    }
    if (Settings.ExtraRadarDrawDebug) {
      text += ` [ID: ${obj.entryId}]`;
    }
    imgui.getBackgroundDrawList().addText(text, objPos, imgui.getColorU32(colors.white));
  }

  static withinDistance(obj) {
    return me.distanceTo(obj.position) <= Settings.ExtraRadarLoadDistance;
  }

  static tick() {
    if (!Settings.ExtraRadar) return;

    const trackedObjects = new Set();

    const categories = [
      { filter: obj => obj instanceof wow.CGGameObject && Gatherables.herb[obj.entryId], type: 'herbs', track: "ExtraRadarTrackHerbs", draw: "ExtraRadarDrawLinesHerbs" },
      { filter: obj => obj instanceof wow.CGGameObject && Gatherables.ore[obj.entryId], type: 'ores', track: "ExtraRadarTrackOres", draw: "ExtraRadarDrawLinesOres" },
      { filter: obj => obj instanceof wow.CGGameObject && Gatherables.treasure[obj.entryId], type: 'treasures', track: "ExtraRadarTrackTreasures", draw: "ExtraRadarDrawLinesTreasures" },
      { filter: obj => obj instanceof wow.CGObject && (obj.isObjective || obj.isRelatedToActiveQuest), type: 'quests', track: "ExtraRadarTrackQuests", draw: "ExtraRadarDrawLinesQuests" },
      { filter: obj => obj instanceof wow.CGUnit && obj.classification == Classification.Rare && !obj.deadOrGhost, type: 'rares', track: "ExtraRadarTrackRares", draw: "ExtraRadarDrawLinesRares" },
    ];

    categories.forEach(cat => {
      if (Settings[cat.track]) {
        const objects = this.getFilteredAndSortedObjects(cat.filter);
        objects.forEach(obj => trackedObjects.add(obj));
        this.drawObjects(objects, objectColors[cat.type], cat.draw);
      }
    });

    if (Settings.ExtraRadarTrackEverything) {
      // Exclude the player (me) when tracking everything
      const everythingObjects = this.getFilteredAndSortedObjects(obj => obj instanceof wow.CGObject && obj !== me);
      const newObjects = everythingObjects.filter(obj => !trackedObjects.has(obj));
      newObjects.forEach(obj => trackedObjects.add(obj));
      this.drawObjects(newObjects, objectColors.default, "ExtraRadarDrawLinesEverything");
    }

    const allObjectsArray = Array.from(trackedObjects);

    const onScreenObjects = allObjectsArray.filter(obj => {
      const objPos = wow.WorldFrame.getScreenCoordinates(obj.position);
      return objPos.x !== -1;  // Keep only on-screen objects
    });

    this.drawOffScreenObjects(allObjectsArray);

    if (Settings.ExtraRadarDrawLinesClosest && onScreenObjects.length > 0) {
      const closestObject = onScreenObjects[0];
      const canvas = imgui.getBackgroundDrawList();
      const mePos = wow.WorldFrame.getScreenCoordinates(me.position);
      const closestPos = wow.WorldFrame.getScreenCoordinates(closestObject.position);
      if (closestPos.x !== -1) {
        canvas.addLine(mePos, closestPos, imgui.getColorU32(objectColors.default), 2);
      }
    }
  }

}

export default Radar;
