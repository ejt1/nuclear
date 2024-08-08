
// define the retail first then override with classic
// this makes it so intellisense picks up the specializations

const Specialization = {
  Invalid: -1,
  None: 0,

  DeathKnight: {
    Blood: 250,
    Frost: 251,
    Unholy: 252,
    Initial: 1455,
  },
  DemonHunter: {
    Havoc: 577,
    Vengeance: 581,
    Initial: 1456,
  },
  Druid: {
    Balance: 102,
    Feral: 103,
    Guardian: 104,
    Restoration: 105,
    Initial: 1447,
  },
  Evoker: {
    Devastation: 1467,
    Preservation: 1468,
    Augmentation: 1473,
    Initial: 1465,
  },
  Hunter: {
    BeastMastery: 253,
    Marksmanship: 254,
    Survival: 255,
    Initial: 1448,
  },
  Mage: {
    Arcane: 62,
    Fire: 63,
    Frost: 64,
    Initial: 1449,
  },
  Monk: {
    Brewmaster: 268,
    Mistweaver: 270,
    Windwalker: 269,
    Initial: 1450,
  },
  Paladin: {
    Holy: 65,
    Protection: 66,
    Retribution: 70,
    Initial: 1451,
  },
  Priest: {
    Discipline: 256,
    Holy: 257,
    Shadow: 258,
    Initial: 1452,
  },
  Rogue: {
    Assassination: 259,
    Combat: 260,
    Sublety: 261,
    Initial: 1453,
  },
  Shaman: {
    Elemental: 262,
    Enhancement: 263,
    Restoration: 264,
    Initial: 1444,
  },
  Warlock: {
    Affliction: 265,
    Demonology: 266,
    Destruction: 267,
    Initial: 1454,
  },
  Warrior: {
    Arms: 71,
    Fury: 72,
    Protection: 73,
    Initial: 1446,
  }
};

if (wow.gameVersion == wow.GameVersion.Classic) {
  Specialization.DeathKnight.Blood = 398;
  Specialization.DeathKnight.Frost = 399;
  Specialization.DeathKnight.Unholy = 400;
  Specialization.Druid.Balance = 283;
  Specialization.Druid.Feral = 281;
  Specialization.Druid.Restoration = 282;
  Specialization.Hunter.BeastMastery = 361;
  Specialization.Hunter.Marksmanship = 363;
  Specialization.Hunter.Survival = 362;
  Specialization.Mage.Arcane = 81;
  Specialization.Mage.Fire = 41;
  Specialization.Mage.Frost = 61;
  Specialization.Paladin.Holy = 382;
  Specialization.Paladin.Protection = 383;
  Specialization.Paladin.Retribution = 381;
  Specialization.Priest.Discipline = 201;
  Specialization.Priest.Holy = 202;
  Specialization.Priest.Shadow = 203;
  Specialization.Rogue.Assassination = 182;
  Specialization.Rogue.Combat = 181;
  Specialization.Rogue.Sublety = 183;
  Specialization.Shaman.Elemental = 261;
  Specialization.Shaman.Enhancement = 263;
  Specialization.Shaman.Restoration = 262;
  Specialization.Warlock.Affliction = 302;
  Specialization.Warlock.Demonology = 303;
  Specialization.Warlock.Destruction = 301;
  Specialization.Warrior.Arms = 161;
  Specialization.Warrior.Fury = 164;
  Specialization.Warrior.Protection = 163;
}

export default Specialization;
