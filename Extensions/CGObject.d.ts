declare namespace wow {
  interface CGObject {
    distanceTo(to: CGObject | Vector3): number;
    distanceTo2D(to: CGObject | Vector3): number;
    interactable: boolean;
    isLootable: boolean;
  }
}
