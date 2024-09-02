declare namespace wow {
  interface Party {
    getGroupUnits(): Array<CGUnit>;
    getPartyMemberByGuid(guid: Guid): PartyMember | undefined;
    getTankUnits(): Array<CGUnit>;
  }
}
