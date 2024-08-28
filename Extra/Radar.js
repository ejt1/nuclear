import Settings from '@/Core/Settings';
import Gatherables from '@/Data/Gatherables';
import objMgr from '@/Core/ObjectManager'
import { me } from '@/Core/ObjectManager';
import colors from '@/Enums/Colors';

class Radar {
  static options = [
    { type: "checkbox", uid: "ExtraRadar", text: "Enable Radar", default: false },
    { type: "checkbox", uid: "ExtraRadarTrackHerbs", text: "Track Herbs", default: false },
    { type: "checkbox", uid: "ExtraRadarTrackOres", text: "Track Ores", default: false },
    { type: "checkbox", uid: "ExtraRadarTrackTreasures", text: "Track Treasures", default: false },
    { type: "checkbox", uid: "ExtraRadarTrackQuests", text: "Track Quest Objectives", default: false },
    { type: "checkbox", uid: "ExtraRadarTrackRares", text: "Track Rares", default: false },
    { type: "checkbox", uid: "ExtraRadarTrackInteractables", text: "Track All POI", default: false },
    { type: "checkbox", uid: "ExtraRadarTrackEverything", text: "Track Everything", default: false },
    { type: "checkbox", uid: "ExtraRadarDrawLines", text: "Draw Lines", default: false },
    { type: "checkbox", uid: "ExtraRadarDrawLinesClosest", text: "Draw Lines Closest Only", default: false },
    { type: "checkbox", uid: "ExtraRadarDrawDistance", text: "Draw Distance", default: false },
    { type: "checkbox", uid: "ExtraRadarDrawDebug", text: "Draw Debug Info", default: false },
    { type: "slider", uid: "ExtraRadarLoadDistance", text: "Radar Load Distance", default: 200, min: 1, max: 200 }
  ];

  static tabName = "Radar";

  static renderOptions(renderFunction) {
    renderFunction([
      { header: "General Radar Settings", options: this.options.slice(0, 1) },
      { header: "Tracking Options", options: this.options.slice(1, 8) },
      { header: "Drawing Options", options: this.options.slice(8, 12) },
      { header: "Distance Settings", options: this.options.slice(12) }
    ]);
  }

  static drawHerbs() {
    if (!Settings.ExtraRadarTrackHerbs) {
      return false;
    }

    objMgr.objects.forEach((obj) => {
      if (obj instanceof wow.CGObject && Gatherables.herb[obj.entryId]) {
        const mePos = wow.WorldFrame.getScreenCoordinates(me.position)
        const objPos = wow.WorldFrame.getScreenCoordinates(obj.position)
        const canvas = imgui.getBackgroundDrawList()
        canvas.addLine(mePos, objPos, imgui.getColorU32(colors.green), 1)
        canvas.addText(obj.name, objPos, imgui.getColorU32(colors.white), null, 20)
      }
    });
  }

  static tick() {
    if (Settings.ExtraRadar) {
      this.drawHerbs()
    }
  }
}

export default Radar;
