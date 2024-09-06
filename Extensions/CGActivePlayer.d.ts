declare namespace wow {
  interface CGActivePlayer {
    currentParty: Party | undefined;
    getFriends(distance?: number): Array<CGUnit>;
    getEnemies(distance: number): Array<CGUnit>;
    getReadyRunes(): number;
  }
}
