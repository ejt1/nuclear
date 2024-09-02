declare namespace wow {
  interface Vector3 {
    distance(other: Vector3): number;
    distanceSq(other: Vector3): number;
    distance2D(other: Vector3): number;
    distanceSq2D(other: Vector3): number;
  }
}
