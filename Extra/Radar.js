import Settings from '@/Core/Settings';
import Gatherables from '@/Data/Gatherables';
import objMgr from '@/Core/ObjectManager';
import { me } from '@/Core/ObjectManager';
import colors from '@/Enums/Colors';
import { Classification } from '@/Enums/UnitEnums';

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
    return validObjects.sort((a, b) => me.distanceTo(a) - me.distanceTo(b));
  }

  static drawObjects(objects, color, drawLinesSetting, drawLinesClosest) {
    const canvas = imgui.getBackgroundDrawList();
    const mePos = wow.WorldFrame.getScreenCoordinates(me.position);

    if (Settings[drawLinesClosest]) {
      if (objects.length > 0) {
        const closestObject = objects[0];
        const closestPos = wow.WorldFrame.getScreenCoordinates(closestObject.position);
        canvas.addLine(mePos, closestPos, imgui.getColorU32(color), 1);

        this.drawObjectText(closestObject, closestPos);
      }
    } else {
      objects.forEach(obj => {
        const objPos = wow.WorldFrame.getScreenCoordinates(obj.position);
        if (objPos.x !== -1) {
          if (Settings[drawLinesSetting]) {
            canvas.addLine(mePos, objPos, imgui.getColorU32(color), 1);
          }

          this.drawObjectText(obj, objPos);
        }
      });
    }
  }

  static drawObjectText(obj, objPos) {
    let text = obj.name;
    if (Settings.ExtraRadarDrawDistance) {
      const distance = Math.round(me.distanceTo(obj));
      text += ` (${distance}y)`;
    }
    if (Settings.ExtraRadarDrawDebug) {
      text += ` [ID: ${obj.entryId}]`;
    }
    imgui.getBackgroundDrawList().addText(text, objPos, imgui.getColorU32(colors.white));
  }

  static drawCategory(filterCondition, color, trackSetting, drawLinesSetting) {
    if (!Settings[trackSetting]) return;
    const objects = this.getFilteredAndSortedObjects(filterCondition);
    this.drawObjects(objects, color, drawLinesSetting, "ExtraRadarDrawLinesClosest");
  }

  static drawHerbs() {
    this.drawCategory(
      obj => obj instanceof wow.CGGameObject && Gatherables.herb[obj.entryId],
      colors.green,
      "ExtraRadarTrackHerbs",
      "ExtraRadarDrawLinesHerbs"
    );
  }

  static drawOres() {
    this.drawCategory(
      obj => obj instanceof wow.CGGameObject && Gatherables.ore[obj.entryId],
      colors.orange,
      "ExtraRadarTrackOres",
      "ExtraRadarDrawLinesOres"
    );
  }

  static drawTreasures() {
    this.drawCategory(
      obj => obj instanceof wow.CGGameObject && Gatherables.treasure[obj.entryId],
      colors.silver,
      "ExtraRadarTrackTreasures",
      "ExtraRadarDrawLinesTreasures"
    );
  }

  static drawQuestObjectives() {
    this.drawCategory(
      obj => obj instanceof wow.CGObject && (obj.isObjective || obj.isRelatedToActiveQuest),
      colors.yellow,
      "ExtraRadarTrackQuests",
      "ExtraRadarDrawLinesQuests"
    );
  }

  static drawRares() {
    this.drawCategory(
      obj => obj instanceof wow.CGUnit && obj.classification == Classification.Rare && !obj.deadOrGhost,
      colors.purple,
      "ExtraRadarTrackRares",
      "ExtraRadarDrawLinesRares"
    );
  }

  static drawEverything() {
    this.drawCategory(
      obj => obj instanceof wow.CGObject,
      colors.white,
      "ExtraRadarTrackEverything",
      "ExtraRadarDrawLinesEverything"
    );
  }

  static withinDistance(obj) {
    return me.distanceTo(obj) <= Settings.ExtraRadarLoadDistance;
  }

  static tick() {
    if (Settings.ExtraRadar) {
      this.drawHerbs();
      this.drawOres();
      this.drawTreasures();
      this.drawQuestObjectives();
      this.drawRares();
      this.drawEverything();
    }
  }
}

export default Radar;
