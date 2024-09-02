declare namespace wow {
  interface CGActivePlayer {
    currentParty: Party | undefined;
    getFriends(): Array<CGUnit>;
    getEnemies(distance: number): Array<CGUnit>; 
  }
}
