declare namespace wow {
  interface CGActivePlayer {
    inArena(): boolean;
    hasArenaPreparation(): boolean;
    inMythicPlus(): boolean;
    currentParty: Party | undefined;
    getFriends(distance?: number): Array<CGUnit>;
    getEnemies(distance: number): Array<CGUnit>;
    getReadyRunes(): number;
    pet: CGUnit | undefined;
  }
}
