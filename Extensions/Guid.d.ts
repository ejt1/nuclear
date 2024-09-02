declare namespace wow {
  interface Guid {
    toUnit(): CGUnit | undefined;
    isNull: boolean;
    toString(): string;
    toJSON(): string;
  }
}
