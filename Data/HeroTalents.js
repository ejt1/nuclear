/**
 * Consolidated Hero Talents for all classes
 * Each class has its hero talent builds with their top talents
 */

// Death Knight Hero Talents
const DeathKnightHeroTalents = {
    DEATHBRINGER: {
      name: "Deathbringer",
      topTalent: "Reaper's Mark" // DEATH KNIGHT - DEATHBRINGER
    },
    RIDER_OF_THE_APOCALYPSE: {
      name: "Rider of the Apocalypse",
      topTalent: "Rider's Champion" // DEATH KNIGHT - RIDER OF THE APOCALYPSE
    },
    SANLAYN: {
      name: "San'layn",
      topTalent: "Vampiric Strike" // DEATH KNIGHT - SAN'LAYN
    }
  };
  
  // Demon Hunter Hero Talents
  const DemonHunterHeroTalents = {
    ALDRACHI_REAVER: {
      name: "Aldrachi Reaver",
      topTalent: "Art of the Glaive" // DEMON HUNTER - ALDRACHI REAVER
    },
    FEL_SCARRED: {
      name: "Fel-Scarred",
      topTalent: "Demonsurge" // DEMON HUNTER - FEL-SCARRED
    }
  };
  
  // Druid Hero Talents
  const DruidHeroTalents = {
    DRUID_OF_THE_CLAW: {
      name: "Druid of the Claw",
      topTalent: "Ravage" // DRUID - DRUID OF THE CLAW
    },
    ELUNES_CHOSEN: {
      name: "Elune's Chosen",
      topTalent: "Boundless Moonlight" // DRUID - ELUNE'S CHOSEN
    },
    KEEPER_OF_THE_GROVE: {
      name: "Keeper of the Grove",
      topTalent: "Dream Surge" // DRUID - KEEPER OF THE GROVE
    },
    WILDSTALKER: {
      name: "Wildstalker",
      topTalent: "Thriving Growth" // DRUID - WILDSTALKER
    }
  };
  
  // Evoker Hero Talents
  const EvokerHeroTalents = {
    CHRONOWARDEN: {
      name: "Chronowarden",
      topTalent: "Chrono Flame", // EVOKER - CHRONOWARDEN
      topTalentId: null // Need to find the actual spell ID
    },
    FLAMESHAPER: {
      name: "Flameshaper",
      topTalent: "Engulf", // EVOKER - FLAMESHAPER
      topTalentId: null // Need to find the actual spell ID
    },
    SCALECOMMANDER: {
      name: "Scalecommander",
      topTalent: "Mass Disintegrate", // EVOKER - SCALECOMMANDER
      topTalentId: null // Need to find the actual spell ID
    }
  };
  
  // Hunter Hero Talents
  const HunterHeroTalents = {
    DARK_RANGER: {
      name: "Dark Ranger",
      topTalent: "Black Arrow", // HUNTER - DARK RANGER
      topTalentId: null // Need to find the actual spell ID
    },
    PACK_LEADER: {
      name: "Pack Leader",
      topTalent: "Vicious Hunt", // HUNTER - PACK LEADER
      topTalentId: null // Need to find the actual spell ID
    },
    SENTINEL: {
      name: "Sentinel",
      topTalent: "Sentinel", // HUNTER - SENTINEL
      topTalentId: null // Need to find the actual spell ID
    }
  };
  
  // Mage Hero Talents
  const MageHeroTalents = {
    FROSTFIRE: {
      name: "Frostfire",
      topTalent: "Frostfire Mastery", // MAGE - FROSTFIRE
      topTalentId: null // Need to find the actual spell ID
    },
    SPELLSLINGER: {
      name: "Spellslinger",
      topTalent: "Splintering Sorcery", // MAGE - SPELLSLINGER
      topTalentId: null // Need to find the actual spell ID
    },
    SUNFURY: {
      name: "Sunfury",
      topTalent: "Spellfire Spheres", // MAGE - SUNFURY
      topTalentId: null // Need to find the actual spell ID
    }
  };
  
  // Monk Hero Talents
  const MonkHeroTalents = {
    CONDUIT_OF_THE_CELESTIALS: {
      name: "Conduit of the Celestials",
      topTalent: "Celestial Conduit", // MONK - CONDUIT OF THE CELESTIALS
      topTalentId: null // Need to find the actual spell ID
    },
    MASTER_OF_HARMONY: {
      name: "Master of Harmony",
      topTalent: "Aspect of Harmony", // MONK - MASTER OF HARMONY
      topTalentId: null // Need to find the actual spell ID
    },
    SHADO_PAN: {
      name: "Shado-Pan",
      topTalent: "Flurry Strikes", // MONK - SHADO-PAN
      topTalentId: null // Need to find the actual spell ID
    }
  };
  
  // Paladin Hero Talents
  const PaladinHeroTalents = {
    HERALD_OF_THE_SUN: {
      name: "Herald of the Sun",
      topTalent: "Dawnlight", // PALADIN - HERALD OF THE SUN
      topTalentId: null // Need to find the actual spell ID
    },
    LIGHTSMITH: {
      name: "Lightsmith",
      topTalent: "Holy Bulwark", // PALADIN - LIGHTSMITH
      topTalentId: null // Need to find the actual spell ID
    },
    TEMPLAR: {
      name: "Templar",
      topTalent: "Light's Guidance", // PALADIN - TEMPLAR
      topTalentId: null // Need to find the actual spell ID
    }
  };
  
  // Priest Hero Talents
  const PriestHeroTalents = {
    ARCHON: {
      name: "Archon",
      topTalent: "Power Surge", // PRIEST - ARCHON
      topTalentId: null // Need to find the actual spell ID
    },
    ORACLE: {
      name: "Oracle",
      topTalent: "Premonition", // PRIEST - ORACLE
      topTalentId: null // Need to find the actual spell ID
    },
    VOIDWEAVER: {
      name: "Voidweaver",
      topTalent: "Entropic Rift", // PRIEST - VOIDWEAVER
      topTalentId: null // Need to find the actual spell ID
    }
  };
  
  // Rogue Hero Talents
  const RogueHeroTalents = {
    DEATHSTALKER: {
      name: "Deathstalker",
      topTalent: "Deathstalker's Mark", // ROGUE - DEATHSTALKER
      topTalentId: null // Need to find the actual spell ID
    },
    FATEBOUND: {
      name: "Fatebound",
      topTalent: "Hand of Fate", // ROGUE - FATEBOUND
      topTalentId: null // Need to find the actual spell ID
    },
    TRICKSTER: {
      name: "Trickster",
      topTalent: "Unseen Blade", // ROGUE - TRICKSTER
      topTalentId: null // Need to find the actual spell ID
    }
  };
  
  // Shaman Hero Talents
  const ShamanHeroTalents = {
    FARSEER: {
      name: "Farseer",
      topTalent: "Call of the Ancestors", // SHAMAN - FARSEER
      topTalentId: null // Need to find the actual spell ID
    },
    STORMBRINGER: {
      name: "Stormbringer",
      topTalent: "Tempest", // SHAMAN - STORMBRINGER
      topTalentId: null // Need to find the actual spell ID
    },
    TOTEMIC: {
      name: "Totemic",
      topTalent: "Surging Totem", // SHAMAN - TOTEMIC
      topTalentId: null // Need to find the actual spell ID
    }
  };
  
  // Warlock Hero Talents
  const WarlockHeroTalents = {
    DIABOLIST: {
      name: "Diabolist",
      topTalent: "Diabolic Ritual", // WARLOCK - DIABOLIST
      topTalentId: null // Need to find the actual spell ID
    },
    HELLCALLER: {
      name: "Hellcaller",
      topTalent: "Wither", // WARLOCK - HELLCALLER
      topTalentId: null // Need to find the actual spell ID
    },
    SOUL_HARVESTER: {
      name: "Soul Harvester",
      topTalent: "Demonic Soul", // WARLOCK - SOUL HARVESTER
      topTalentId: null // Need to find the actual spell ID
    }
  };
  
  // Warrior Hero Talents
  const WarriorHeroTalents = {
    COLOSSUS: {
      name: "Colossus",
      topTalent: "Demolish", // WARRIOR - COLOSSUS
      topTalentId: null // Need to find the actual spell ID
    },
    MOUNTAIN_THANE: {
      name: "Mountain Thane",
      topTalent: "Lightning Strikes", // WARRIOR - MOUNTAIN THANE
      topTalentId: null // Need to find the actual spell ID
    },
    SLAYER: {
      name: "Slayer",
      topTalent: "Slayer's Dominance", // WARRIOR - SLAYER
      topTalentId: null // Need to find the actual spell ID
    }
  };
  
  // Export a consolidated object containing all hero talents
  const HeroTalents = {
    DeathKnight: DeathKnightHeroTalents,
    DemonHunter: DemonHunterHeroTalents,
    Druid: DruidHeroTalents,
    Evoker: EvokerHeroTalents,
    Hunter: HunterHeroTalents,
    Mage: MageHeroTalents,
    Monk: MonkHeroTalents,
    Paladin: PaladinHeroTalents,
    Priest: PriestHeroTalents,
    Rogue: RogueHeroTalents,
    Shaman: ShamanHeroTalents,
    Warlock: WarlockHeroTalents,
    Warrior: WarriorHeroTalents
  };
  
  export default HeroTalents;