class Targeting {
  constructor() {
    this.targets = [];
    this.healTargets = []
  }

  // Factory method to create a new instance, following similar behavior to Lua's setmetatable pattern
  static createNew() {
    return new this();
  }

  // Determines if the Targeting system should run
  wantToRun() {
    return true;
  }

  // Updates the Targeting system
  update() {
    this.reset();
    if (!this.wantToRun()) return;
    this.collectTargets();
    this.exclusionFilter();
    this.inclusionFilter();
    this.weighFilter();
  }

  // Resets the targets and heal targets lists
  reset() {
    this.targets = [];
    this.healTargets = []
  }

  // Collects targets (to be overridden by subclasses)
  collectTargets() {
    return [];
  }

  // Applies exclusion filtering to the targets (to be overridden by subclasses)
  exclusionFilter(units = this.targets) {
    return units;
  }

  // Applies inclusion filtering to the targets (to be overridden by subclasses)
  inclusionFilter(units = this.targets) {
    return units;
  }

  // Weighs the targets based on some criteria (to be overridden by subclasses)
  weighFilter(units = this.targets) {
    return units;
  }
}

export default Targeting;
