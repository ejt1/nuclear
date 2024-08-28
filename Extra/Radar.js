import Settings from '../Core/Settings';

class Radar {
  static tick() {
    if (Settings.ExtraRadar) {
      console.log("Radar is running");
    }
  }
}

export default Radar;
