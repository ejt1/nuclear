// PART 1: DEATH KNIGHT
const deathKnightSpells = {
  // Death Knight - General
  DEATH_GRIP: 49576, // Death Grip
  ANTI_MAGIC_SHELL: 48707, // Anti-Magic Shell
  DEATH_PACT: 48743, // Death Pact
  ICEBOUND_FORTITUDE: 48792, // Icebound Fortitude
  LICHBORNE: 49039, // Lichborne
  RAISE_DEAD: 46585, // Raise Dead
  PATH_OF_FROST: 3714, // Path of Frost
  MIND_FREEZE: 47528, // Mind Freeze
  STRANGULATE: 47476, // Strangulate
  DEATHS_ADVANCE: 48265, // Death's Advance
  WRAITH_WALK: 212552, // Wraith Walk
  ANTI_MAGIC_ZONE: 51052, // Anti-Magic Zone
  SACRIFICIAL_PACT: 327574, // Sacrificial Pact
  CHAINS_OF_ICE: 45524, // Chains of Ice
  DEATH_COIL: 47541, // Death Coil
  DARK_COMMAND: 56222, // Dark Command
  DEATH_AND_DECAY: 43265, // Death and Decay
  DEATH_STRIKE: 49998, // Death Strike
  HORN_OF_WINTER: 57330, // Horn of Winter
  EMPOWER_RUNE_WEAPON: 47568, // Empower Rune Weapon
  SOUL_REAPER: 343294, // Soul Reaper

  // Death Knight - Blood
  BLOOD_BOIL: 50842, // Blood Boil
  HEART_STRIKE: 206930, // Heart Strike
  MARROWREND: 195182, // Marrowrend
  VAMPIRIC_BLOOD: 55233, // Vampiric Blood
  RUNE_TAP: 194679, // Rune Tap
  DANCING_RUNE_WEAPON: 49028, // Dancing Rune Weapon
  CONSUMPTION: 274156, // Consumption
  TOMBSTONE: 219809, // Tombstone
  BONESTORM: 194844, // Bonestorm
  BLOODDRINKER: 206931, // Blooddrinker
  HEMOSTASIS: 273947, // Hemostasis
  MASTERY_BLOOD_SHIELD: 77513, // Mastery: Blood Shield
  WILL_OF_THE_NECROPOLIS: 206967, // Will of the Necropolis
  BLOOD_PLAGUE: 55078, // Blood Plague

  // Death Knight - Frost
  FROST_STRIKE: 49143, // Frost Strike
  OBLITERATE: 49020, // Obliterate
  HOWLING_BLAST: 49184, // Howling Blast
  FROST_FEVER: 55095, // Frost Fever
  PILLAR_OF_FROST: 51271, // Pillar of Frost
  REMORSELESS_WINTER: 196770, // Remorseless Winter
  FROSTWYRMS_FURY: 279302, // Frostwyrm's Fury
  BREATH_OF_SINDRAGOSA: 152279, // Breath of Sindragosa
  BLINDING_SLEET: 207167, // Blinding Sleet
  FROSTSCYTHE: 207230, // Frostscythe
  UNHOLY_STRENGTH: 53365, // Unholy Strength
  MASTERY_FROZEN_HEART: 77514, // Mastery: Frozen Heart

  // Death Knight - Unholy
  FESTERING_STRIKE: 85948, // Festering Strike
  SCOURGE_STRIKE: 55090, // Scourge Strike
  OUTBREAK: 77575, // Outbreak
  VIRULENT_PLAGUE: 191587, // Virulent Plague
  DARK_TRANSFORMATION: 63560, // Dark Transformation
  APOCALYPSE: 275699, // Apocalypse
  ARMY_OF_THE_DEAD: 42650, // Army of the Dead
  SUMMON_GARGOYLE: 49206, // Summon Gargoyle
  UNHOLY_BLIGHT: 115989, // Unholy Blight
  UNHOLY_ASSAULT: 207289, // Unholy Assault
  DARK_ARBITER: 207349, // Dark Arbiter
  SUDDEN_DOOM: 81340, // Sudden Doom
  MASTERY_DREADBLADE: 77515, // Mastery: Dreadblade
  EBON_FEVER: 207269, // Ebon Fever
  REAPING: 81136, // Reaping
};

// PART 2: DEMON HUNTER
const demonHunterSpells = {
  // Demon Hunter - General
  THROW_GLAIVE: 185123, // Throw Glaive
  FEL_RUSH: 195072, // Fel Rush
  VENGEFUL_RETREAT: 198793, // Vengeful Retreat
  SPECTRAL_SIGHT: 188501, // Spectral Sight
  CHAOS_NOVA: 179057, // Chaos Nova
  CONSUME_MAGIC: 278326, // Consume Magic
  DISRUPT: 183752, // Disrupt
  IMPRISON: 217832, // Imprison
  BLUR: 198589, // Blur
  NETHERWALK: 196555, // Netherwalk
  DARKNESS: 196718, // Darkness
  MASTERY_DEMONIC_PRESENCE: 185164, // Mastery: Demonic Presence

  // Demon Hunter - Havoc
  DEMONS_BITE: 162243, // Demon's Bite
  CHAOS_STRIKE: 162794, // Chaos Strike
  EYE_BEAM: 198013, // Eye Beam
  BLADE_DANCE: 188499, // Blade Dance
  IMMOLATION_AURA: 258920, // Immolation Aura
  THE_HUNT: 370965, // The Hunt
  ESSENCE_BREAK: 258860, // Essence Break
  METAMORPHOSIS_HAVOC: 200166, // Metamorphosis (Havoc)
  METAMORPHOSIS_BUFF: 162264, // Metamorphosis (buff)
  ANNIHILATION: 201427, // Annihilation
  FEL_BARRAGE: 258925, // Fel Barrage
  GLAIVE_TEMPEST: 342817, // Glaive Tempest
  UNLEASHED_POWER: 206477, // Unleashed Power
  MOMENTUM: 206476, // Momentum

  // Demon Hunter - Vengeance
  SHEAR: 203782, // Shear
  FRACTURE: 263642, // Fracture
  SOUL_CLEAVE: 228477, // Soul Cleave
  INFERNAL_STRIKE: 189110, // Infernal Strike
  SIGIL_OF_FLAME: 204596, // Sigil of Flame
  FLAME_SIGIL_DOT: 204598, // Flame Sigil DoT
  SIGIL_OF_MISERY: 207684, // Sigil of Misery
  SIGIL_OF_SILENCE: 202137, // Sigil of Silence
  DEMON_SPIKES: 203720, // Demon Spikes
  FIERY_BRAND: 204021, // Fiery Brand
  METAMORPHOSIS_VENGEANCE: 187827, // Metamorphosis (Vengeance)
  FEL_DEVASTATION: 212084, // Fel Devastation
  SOUL_CARVER: 207407, // Soul Carver
  BULK_EXTRACTION: 320341, // Bulk Extraction
  SPIRIT_BOMB: 247454, // Spirit Bomb
  FRAILTY: 247456, // Frailty
  LAST_RESORT: 209258, // Last Resort
  MASTERY_FEL_BLOOD: 203747, // Mastery: Fel Blood
};

// PART 3: DRUID
const druidSpells = {
  // Druid - General
  MOONFIRE: 8921, // Moonfire
  MOONFIRE_DOT: 164812, // Moonfire DoT
  SUNFIRE: 93402, // Sunfire
  SUNFIRE_DOT: 164815, // Sunfire DoT
  WRATH: 5176, // Wrath
  STARFIRE: 197628, // Starfire
  STARSURGE: 78674, // Starsurge
  SHRED: 5221, // Shred
  SWIPE: 213764, // Swipe (Cat form)
  SWIPE_BEAR: 213771, // Swipe (Bear form)
  THRASH: 77758, // Thrash
  THRASH_BLEED: 192090, // Thrash Bleed
  MANGLE: 33917, // Mangle
  FEROCIOUS_BITE: 22568, // Ferocious Bite
  RIP: 1079, // Rip
  MAIM: 22570, // Maim
  REGROWTH: 8936, // Regrowth
  REJUVENATION: 774, // Rejuvenation
  SWIFTMEND: 18562, // Swiftmend
  WILD_GROWTH: 48438, // Wild Growth
  TRANQUILITY: 740, // Tranquility
  REBIRTH: 20484, // Rebirth
  BARKSKIN: 22812, // Barkskin
  IRONFUR: 192081, // Ironfur
  TRAVEL_FORM: 783, // Travel Form
  BEAR_FORM: 5487, // Bear Form
  CAT_FORM: 768, // Cat Form
  AQUATIC_FORM: 276012, // Aquatic Form
  DASH: 1850, // Dash
  STAMPEDING_ROAR: 106898, // Stampeding Roar
  CYCLONE: 33786, // Cyclone
  SOOTHE: 2908, // Soothe
  REMOVE_CORRUPTION: 2782, // Remove Corruption
  INNERVATE: 29166, // Innervate
  HIBERNATE: 2637, // Hibernate
  ENTANGLING_ROOTS: 339, // Entangling Roots
  TYPHOON: 132469, // Typhoon
  URSOLS_VORTEX: 102793, // Ursol's Vortex
  MIGHTY_BASH: 5211, // Mighty Bash
  HEART_OF_THE_WILD: 319454, // Heart of the Wild
  NATURES_VIGIL: 124974, // Nature's Vigil

  // Druid - Balance
  ECLIPSE: 48517, // Eclipse
  SOLAR_ECLIPSE: 48517, // Solar Eclipse
  LUNAR_ECLIPSE: 48518, // Lunar Eclipse
  STARFALL: 191034, // Starfall
  FORCE_OF_NATURE: 205636, // Force of Nature
  CELESTIAL_ALIGNMENT: 194223, // Celestial Alignment
  INCARNATION_CHOSEN_OF_ELUNE: 102560, // Incarnation: Chosen of Elune
  NEW_MOON: 274281, // New Moon
  HALF_MOON: 274282, // Half Moon
  FULL_MOON: 274283, // Full Moon
  FURY_OF_ELUNE: 202770, // Fury of Elune
  WARRIOR_OF_ELUNE: 202425, // Warrior of Elune
  SOLSTICE: 343647, // Solstice
  OWLKIN_FRENZY: 157228, // Owlkin Frenzy
  MASTERY_TOTAL_ECLIPSE: 76808, // Mastery: Total Eclipse

  // Druid - Feral
  RAKE: 1822, // Rake
  RAKE_DOT: 155722, // Rake DoT
  SWIPE_CAT: 213764, // Swipe (Cat)
  TIGERS_FURY: 5217, // Tiger's Fury
  BERSERK_FERAL: 106951, // Berserk (Feral)
  INCARNATION_AVATAR_OF_ASHAMANE: 102543, // Incarnation: Avatar of Ashamane
  PRIMAL_WRATH: 285381, // Primal Wrath
  BRUTAL_SLASH: 202028, // Brutal Slash
  SAVAGE_ROAR: 52610, // Savage Roar
  BLOODTALONS: 145152, // Bloodtalons
  PREDATORY_SWIFTNESS: 69369, // Predatory Swiftness
  MASTERY_RAZOR_CLAWS: 77493, // Mastery: Razor Claws

  // Druid - Guardian
  MAUL: 6807, // Maul
  THRASH_BEAR: 77758, // Thrash (Bear)
  SWIPE_BEAR: 213771, // Swipe (Bear)
  FRENZIED_REGENERATION: 22842, // Frenzied Regeneration
  GROWL: 6795, // Growl
  BERSERK_GUARDIAN: 50334, // Berserk (Guardian)
  INCARNATION_GUARDIAN_OF_URSOC: 102558, // Incarnation: Guardian of Ursoc
  RAGE_OF_THE_SLEEPER: 200851, // Rage of the Sleeper
  EARTHWARDEN: 203974, // Earthwarden
  MASTERY_NATURES_GUARDIAN: 77492, // Mastery: Nature's Guardian
  TOOTH_AND_CLAW: 135286, // Tooth and Claw

  // Druid - Restoration
  LIFEBLOOM: 33763, // Lifebloom
  EFFLORESCENCE: 145205, // Efflorescence
  EFFLORESCENCE_HOT: 81262, // Efflorescence HoT
  IRONBARK: 102342, // Ironbark
  FLOURISH: 197721, // Flourish
  CENARION_WARD: 102351, // Cenarion Ward
  INCARNATION_TREE_OF_LIFE: 33891, // Incarnation: Tree of Life
  OVERGROWTH: 203651, // Overgrowth
  NATURES_SWIFTNESS: 132158, // Nature's Swiftness
  MASTERY_HARMONY: 77495, // Mastery: Harmony
};

// PART 4: EVOKER
const evokerSpells = {
  // Evoker - General
  LIVING_FLAME: 361469, // Living Flame
  AZURE_STRIKE: 362969, // Azure Strike
  EMERALD_BLOSSOM: 355913, // Emerald Blossom
  WING_BUFFET: 357214, // Wing Buffet
  TAIL_SWIPE: 368970, // Tail Swipe
  HOVER: 358267, // Hover
  BLESSING_OF_THE_BRONZE: 364342, // Blessing of the Bronze
  BRONZE_BLESSING: 364343, // Bronze Blessing aura
  ZEPHYR: 374227, // Zephyr
  OPPRESSING_ROAR: 372048, // Oppressing Roar
  QUELL: 351338, // Quell
  CAUTERIZING_FLAME: 374251, // Cauterizing Flame
  OBSIDIAN_SCALES: 363916, // Obsidian Scales
  RENEWING_BLAZE: 374348, // Renewing Blaze
  RESCUE: 370665, // Rescue
  TIME_SPIRAL: 374968, // Time Spiral
  FURY_OF_THE_ASPECTS: 390386, // Fury of the Aspects
  TEMPORAL_DISPLACEMENT: 80354, // Temporal Displacement
  MASTERY_GIANTKILLER: 376738, // Mastery: Giantkiller

  // Evoker - Devastation
  FIRE_BREATH: 357208, // Fire Breath
  FIRE_BREATH_DOT: 370818, // Fire Breath DoT
  DRAGONRAGE: 375087, // Dragonrage
  ETERNITY_SURGE: 359073, // Eternity Surge
  SHATTERING_STAR: 370452, // Shattering Star
  PYRE: 369846, // Pyre
  DEEP_BREATH: 357210, // Deep Breath
  EMERALD_COMMUNION: 370960, // Emerald Communion
  BURNOUT: 375801, // Burnout
  SPELLWEAVERS_DOMINANCE: 395152, // Spellweaver's Dominance

  // Evoker - Preservation
  DREAM_BREATH: 355936, // Dream Breath
  DREAM_BREATH_HOT: 355941, // Dream Breath HoT
  SPIRITBLOOM: 367226, // Spiritbloom
  ECHO: 364343, // Echo
  TEMPORAL_ANOMALY: 373861, // Temporal Anomaly
  TEMPORAL_ANOMALY_SHIELD: 373862, // Temporal Anomaly Shield
  REWIND: 363534, // Rewind
  TIME_DILATION: 357170, // Time Dilation
  STASIS: 370537, // Stasis
  VERDANT_EMBRACE: 360995, // Verdant Embrace
  LIFE_GIVERS_FLAME: 371807, // Life-Giver's Flame
  GOLDEN_HOUR: 378196, // Golden Hour
  MASTERY_LIFEBINDER: 376737, // Mastery: Lifebinder

  // Evoker - Augmentation
  EBON_MIGHT: 395152, // Ebon Might
  EBON_MIGHT_BUFF: 395296, // Ebon Might (ally buff)
  PRESCIENCE: 409311, // Prescience
  PRESCIENCE_BUFF: 409313, // Prescience (buff)
  UPHEAVAL: 396286, // Upheaval
  EARTHWARDENS_SIGIL: 406158, // Earthwarden's Sigil
  MOLTEN_BLOOD: 409316, // Molten Blood
  BREATH_OF_EONS: 403631, // Breath of Eons
  CHRONO_WARD: 408122, // Chrono Ward
  TIME_SKIP: 404977, // Time Skip
  BESTOW_WEYRNSTONE: 409374, // Bestow Weyrnstone
  MASTERY_TIMEWALKER: 409376, // Mastery: Timewalker
};

// PART 5: HUNTER
const hunterSpells = {
 // Hunter - General
 ARCANE_SHOT: 185358, // Arcane Shot
 STEADY_SHOT: 56641, // Steady Shot
 MULTI_SHOT: 2643, // Multi-Shot
 KILL_SHOT: 53351, // Kill Shot
 ASPECT_OF_THE_CHEETAH: 186257, // Aspect of the Cheetah
 ASPECT_OF_THE_TURTLE: 186265, // Aspect of the Turtle
 FEIGN_DEATH: 5384, // Feign Death
 DISENGAGE: 781, // Disengage
 MEND_PET: 136, // Mend Pet
 CALL_PET: 883, // Call Pet
 EXHILARATION: 109304, // Exhilaration
 MISDIRECTION: 34477, // Misdirection
 TRANQUILIZING_SHOT: 19801, // Tranquilizing Shot
 HIGH_EXPLOSIVE_TRAP: 236776, // High Explosive Trap
 INTIMIDATION: 19577, // Intimidation
 CAMOUFLAGE: 199483, // Camouflage
 TAR_TRAP: 187698, // Tar Trap
 FREEZING_TRAP: 187650, // Freezing Trap
 FREEZING_TRAP_AURA: 3355, // Freezing Trap (aura)
 SCARE_BEAST: 1513, // Scare Beast
 EAGLE_EYE: 6197, // Eagle Eye
 MASTERY_SPIRIT_BOND: 263585, // Mastery: Spirit Bond

 // Hunter - Beast Mastery
 KILL_COMMAND: 34026, // Kill Command
 BARBED_SHOT: 217200, // Barbed Shot
 BARBED_SHOT_BLEED: 217200, // Barbed Shot (bleed)
 BESTIAL_WRATH: 19574, // Bestial Wrath
 FRENZY: 272790, // Frenzy (pet buff)
 ASPECT_OF_THE_WILD: 193530, // Aspect of the Wild
 STAMPEDE: 201430, // Stampede
 BLOODSHED: 321530, // Bloodshed
 STOMP: 199530, // Stomp
 BARRAGE: 120360, // Barrage
 CHIMAERA_SHOT: 171457, // Chimaera Shot
 DIRE_BEAST: 120679, // Dire Beast
 MASTERY_MASTER_OF_BEASTS: 76657, // Mastery: Master of Beasts

 // Hunter - Marksmanship
 AIMED_SHOT: 19434, // Aimed Shot
 RAPID_FIRE: 257044, // Rapid Fire
 PRECISE_SHOTS: 260242, // Precise Shots
 TRUESHOT: 288613, // Trueshot
 RAPID_FIRE_BARRAGE: 459796, // Rapid Fire Barrage
 EXPLOSIVE_SHOT: 212431, // Explosive Shot
 VOLLEY: 260243, // Volley
 RAIN_OF_ARROWS: 260247, // Rain of Arrows
 DEAD_EYE: 321281, // Dead Eye
 LOCK_AND_LOAD: 194595, // Lock and Load
 MASTERY_SNIPER_TRAINING: 76838, // Mastery: Sniper Training

 // Hunter - Survival
 RAPTOR_STRIKE: 186270, // Raptor Strike
 MONGOOSE_BITE: 259387, // Mongoose Bite
 SERPENT_STING: 259491, // Serpent Sting
 WILDFIRE_BOMB: 259495, // Wildfire Bomb
 CARVE: 187708, // Carve
 HARPOON: 190925, // Harpoon
 ASPECT_OF_THE_EAGLE: 186289, // Aspect of the Eagle
 COORDINATED_ASSAULT: 266779, // Coordinated Assault
 SPEARHEAD: 360966, // Spearhead
 BUTCHERY: 212436, // Butchery
 CHAKRAM: 259391, // Chakram
 STEEL_TRAP: 162488, // Steel Trap
 TIP_OF_THE_SPEAR: 260285, // Tip of the Spear
};

// PART 6: MAGE
const mageSpells = {
  // Mage - General
  FIREBALL: 133, // Fireball
  FROSTBOLT: 116, // Frostbolt
  ARCANE_BLAST: 30451, // Arcane Blast
  ARCANE_MISSILES: 5143, // Arcane Missiles
  FIRE_BLAST: 108853, // Fire Blast
  ICE_LANCE: 30455, // Ice Lance
  BLIZZARD: 190356, // Blizzard
  FLAMESTRIKE: 2120, // Flamestrike
  ICE_BLOCK: 45438, // Ice Block
  INVISIBILITY: 66, // Invisibility
  MIRROR_IMAGE: 55342, // Mirror Image
  COUNTERSPELL: 2139, // Counterspell
  POLYMORPH: 118, // Polymorph
  REMOVE_CURSE: 475, // Remove Curse
  BLINK: 1953, // Blink
  SPELLSTEAL: 30449, // Spellsteal
  SLOW_FALL: 130, // Slow Fall
  TIME_WARP: 80353, // Time Warp
  ALTER_TIME: 342245, // Alter Time
  SHIFTING_POWER: 382440, // Shifting Power
  ICE_NOVA: 157997, // Ice Nova
  RING_OF_FROST: 113724, // Ring of Frost
  MASS_POLYMORPH: 383121, // Mass Polymorph
  MASS_INVISIBILITY: 414664, // Mass Invisibility
  PRISMATIC_BARRIER: 235450, // Prismatic Barrier
  BLAZING_BARRIER: 235313, // Blazing Barrier
  ICE_BARRIER: 11426, // Ice Barrier
  MASTERY_SAVANT: 190740, // Mastery: Savant
  MASTERY_IGNITE: 12846, // Mastery: Ignite
  MASTERY_ICICLES: 76613, // Mastery: Icicles

  // Mage - Arcane
  ARCANE_BARRAGE: 44425, // Arcane Barrage
  ARCANE_EXPLOSION: 1449, // Arcane Explosion
  CLEARCASTING: 263725, // Clearcasting
  EVOCATION: 12051, // Evocation
  ARCANE_POWER: 12042, // Arcane Power
  PRESENCE_OF_MIND: 205025, // Presence of Mind
  TOUCH_OF_THE_MAGI: 321507, // Touch of the Magi
  ARCANE_ORB: 153626, // Arcane Orb
  SUPERNOVA: 157980, // Supernova
  NETHER_TEMPEST: 114923, // Nether Tempest
  RADIANT_SPARK: 376103, // Radiant Spark
  ARCANE_SURGE: 365350, // Arcane Surge
  MANA_GEM: 759, // Mana Gem

  // Mage - Fire
  PYROBLAST: 11366, // Pyroblast
  SCORCH: 2948, // Scorch
  HOT_STREAK: 48108, // Hot Streak
  IGNITE: 12654, // Ignite
  COMBUSTION: 190319, // Combustion
  PHOENIX_FLAMES: 257541, // Phoenix Flames
  DRAGONS_BREATH: 31661, // Dragon's Breath
  LIVING_BOMB: 44457, // Living Bomb
  METEOR: 153561, // Meteor
  FLAME_ON: 205029, // Flame On

  // Mage - Frost
  FLURRY: 44614, // Flurry
  BRAIN_FREEZE: 190446, // Brain Freeze
  FROZEN_ORB: 84714, // Frozen Orb
  FREEZING_RAIN: 270232, // Freezing Rain
  ICY_VEINS: 12472, // Icy Veins
  SUMMON_WATER_ELEMENTAL: 31687, // Summon Water Elemental
  RAY_OF_FROST: 205021, // Ray of Frost
  COMET_STORM: 153595, // Comet Storm
  EBONBOLT: 257537, // Ebonbolt
  GLACIAL_SPIKE: 199786, // Glacial Spike
  FINGERS_OF_FROST: 112965, // Fingers of Frost
};

// PART 7: MONK
const monkSpells = {
  // Monk - General
  TIGER_PALM: 100780, // Tiger Palm
  BLACKOUT_KICK: 100784, // Blackout Kick
  ROLL: 109132, // Roll
  CHI_TORPEDO: 115008, // Chi Torpedo
  VIVIFY: 116670, // Vivify
  RESUSCITATE: 115178, // Resuscitate
  PROVOKE: 115546, // Provoke
  EXPEL_HARM: 115072, // Expel Harm
  SPINNING_CRANE_KICK: 101546, // Spinning Crane Kick
  TOUCH_OF_DEATH: 322109, // Touch of Death
  SPEAR_HAND_STRIKE: 116705, // Spear Hand Strike
  PARALYSIS: 115078, // Paralysis
  TRANSCENDENCE: 101643, // Transcendence
  TRANSCENDENCE_TRANSFER: 119996, // Transcendence: Transfer
  ZEN_FLIGHT: 125883, // Zen Flight
  FORTIFYING_BREW: 115203, // Fortifying Brew
  DIFFUSE_MAGIC: 122783, // Diffuse Magic
  DAMPEN_HARM: 122278, // Dampen Harm
  DETOX: 115450, // Detox
  TIGERS_LUST: 116841, // Tiger's Lust
  SUMMON_BLACK_OX_STATUE: 115315, // Summon Black Ox Statue
  WINDWALKING: 157411, // Windwalking
  MASTERY_COMBO_STRIKES: 115636, // Mastery: Combo Strikes
  MASTERY_GUST_OF_MISTS: 117907, // Mastery: Gust of Mists
  MASTERY_ELUSIVE_BRAWLER: 117906, // Mastery: Elusive Brawler

  // Monk - Brewmaster
  KEG_SMASH: 121253, // Keg Smash
  BREATH_OF_FIRE: 115181, // Breath of Fire
  BREATH_OF_FIRE_DOT: 123725, // Breath of Fire DoT
  CELESTIAL_BREW: 322507, // Celestial Brew
  PURIFYING_BREW: 119582, // Purifying Brew
  STAGGER: 115069, // Stagger
  SHUFFLE: 115307, // Shuffle
  ELUSIVE_BRAWLER: 117906, // Elusive Brawler
  GIFT_OF_THE_OX: 124502, // Gift of the Ox
  IRONBREW: 115308, // Ironbrew
  INVOKE_NIUZAO: 132578, // Invoke Niuzao, the Black Ox
  EXPLODING_KEG: 325153, // Exploding Keg
  HIGH_TOLERANCE: 196738, // High Tolerance

  // Monk - Mistweaver
  SOOTHING_MIST: 115175, // Soothing Mist
  ENVELOPING_MIST: 124682, // Enveloping Mist
  RENEWING_MIST: 115151, // Renewing Mist
  RENEWING_MIST_HOT: 119611, // Renewing Mist HoT
  ESSENCE_FONT: 191837, // Essence Font
  THUNDER_FOCUS_TEA: 116680, // Thunder Focus Tea
  LIFE_COCOON: 116849, // Life Cocoon
  REVIVAL: 115310, // Revival
  REFRESHING_JADE_WIND: 196725, // Refreshing Jade Wind
  INVOKE_YULON: 322118, // Invoke Yu'lon, the Jade Serpent
  INVOKE_CHIJI: 325197, // Invoke Chi-Ji, the Red Crane
  MANA_TEA: 197908, // Mana Tea
  ZEN_PULSE: 124081, // Zen Pulse

  // Monk - Windwalker
  RISING_SUN_KICK: 107428, // Rising Sun Kick
  FISTS_OF_FURY: 113656, // Fists of Fury
  STORM_EARTH_FIRE: 137639, // Storm, Earth, and Fire
  INVOKE_XUEN: 123904, // Invoke Xuen, the White Tiger
  FLYING_SERPENT_KICK: 101545, // Flying Serpent Kick
  WHIRLING_DRAGON_PUNCH: 152175, // Whirling Dragon Punch
  SERENITY: 152173, // Serenity
  TOUCH_OF_KARMA: 122470, // Touch of Karma
  STRIKE_OF_THE_WINDLORD: 392983, // Strike of the Windlord
  EXPEL_HARM_WW: 322101, // Expel Harm (Windwalker version)
  HIT_COMBO: 196741, // Hit Combo
  COMBO_BREAKER: 118864, // Combo Breaker
  PRESSURE_POINTS: 247255, // Pressure Points
};

// PART 8: PALADIN
const paladinSpells = {
  // Paladin - General
  CRUSADER_STRIKE: 35395, // Crusader Strike
  JUDGMENT: 20271, // Judgment
  HAMMER_OF_WRATH: 24275, // Hammer of Wrath
  CONSECRATION: 26573, // Consecration
  CONSECRATION_AURA: 188370, // Consecration (aura)
  BLESSING_OF_FREEDOM: 1044, // Blessing of Freedom
  BLESSING_OF_PROTECTION: 1022, // Blessing of Protection
  FORBEARANCE: 25771, // Forbearance
  BLESSING_OF_SACRIFICE: 6940, // Blessing of Sacrifice
  LAY_ON_HANDS: 633, // Lay on Hands
  DIVINE_SHIELD: 642, // Divine Shield
  FLASH_OF_LIGHT: 19750, // Flash of Light
  WORD_OF_GLORY: 85673, // Word of Glory
  HAMMER_OF_JUSTICE: 853, // Hammer of Justice
  REPENTANCE: 20066, // Repentance
  TURN_EVIL: 10326, // Turn Evil
  CLEANSE: 4987, // Cleanse
  HAND_OF_RECKONING: 62124, // Hand of Reckoning
  DEVOTION_AURA: 465, // Devotion Aura
  AURA_MASTERY: 31821, // Aura Mastery
  DIVINE_STEED: 190784, // Divine Steed
  DIVINE_STEED_BUFF: 221886, // Divine Steed (buff)
  SHIELD_OF_THE_RIGHTEOUS: 53600, // Shield of the Righteous
  INTERCESSION: 391054, // Intercession
  AVENGING_WRATH: 31884, // Avenging Wrath
  HOLY_AVENGER: 105809, // Holy Avenger
  DIVINE_TOLL: 375576, // Divine Toll
  BOUNDLESS_SALVATION: 213, // Boundless Salvation
  DAYBREAK: 414170, // Daybreak
  SEAL_OF_THE_TEMPLAR: 377128, // Seal of the Templar
  RETRIBUTION_AURA: 183435, // Retribution Aura
  INSTRUMENT_OF_RETRIBUTION: 183435, // Instrument of Retribution

  // Paladin - Holy
  HOLY_SHOCK: 20473, // Holy Shock
  HOLY_LIGHT: 82326, // Holy Light
  BEACON_OF_LIGHT: 53563, // Beacon of Light
  LIGHT_OF_DAWN: 85222, // Light of Dawn
  DIVINE_PROTECTION: 498, // Divine Protection
  INFUSION_OF_LIGHT: 54149, // Infusion of Light
  TYRS_DELIVERANCE: 200652, // Tyr's Deliverance
  TYRS_DELIVERANCE_HOT: 200654, // Tyr's Deliverance HoT
  LIGHTS_HAMMER: 114158, // Light's Hammer
  AURA_OF_MERCY: 183415, // Aura of Mercy
  GLIMMER_OF_LIGHT: 287280, // Glimmer of Light
  AVENGING_WRATH_MERCY: 216331, // Avenging Wrath: Mercy (Avenging Crusader)
  DIVINE_FAVOR: 210294, // Divine Favor
  SAVED_BY_THE_LIGHT: 157047, // Saved by the Light
  MASTERY_LIGHTBRINGER: 183997, // Mastery: Lightbringer

  // Paladin - Protection
  AVENGERS_SHIELD: 31935, // Avenger's Shield
  HAMMER_OF_THE_RIGHTEOUS: 53595, // Hammer of the Righteous
  BLESSED_HAMMER: 204019, // Blessed Hammer
  JUDGMENT_PROT: 275779, // Judgment (Protection)
  ARDENT_DEFENDER: 31850, // Ardent Defender
  GUARDIAN_OF_ANCIENT_KINGS: 86659, // Guardian of Ancient Kings
  BLESSING_OF_SPELLWARDING: 204018, // Blessing of Spellwarding
  SENTINEL: 389539, // Sentinel
  HAND_OF_THE_PROTECTOR: 315924, // Hand of the Protector
  GUARDIAN_OF_THE_FORGOTTEN_QUEEN: 228049, // Guardian of the Forgotten Queen
  EYE_OF_TYR: 209202, // Eye of Tyr
  BASTION_OF_LIGHT: 378974, // Bastion of Light
  FINAL_STAND: 204077, // Final Stand
  MASTERY_DIVINE_BULWARK: 76671, // Mastery: Divine Bulwark
  REDOUBT: 280375, // Redoubt
  HOLY_SHIELD: 152261, // Holy Shield

  // Paladin - Retribution
  BLADE_OF_JUSTICE: 184575, // Blade of Justice
  TEMPLARS_VERDICT: 85256, // Templar's Verdict
  DIVINE_STORM: 53385, // Divine Storm
  JUDGMENT_RET_DEBUFF: 197277, // Judgment (Retribution debuff)
  EXECUTION_SENTENCE: 343527, // Execution Sentence
  WAKE_OF_ASHES: 255937, // Wake of Ashes
  WAKE_OF_ASHES_DEBUFF: 255937, // Wake of Ashes (debuff)
  CRUSADE: 231895, // Crusade
  FINAL_RECKONING: 343721, // Final Reckoning
  JUSTICARS_VENGEANCE: 215661, // Justicar's Vengeance
  EXPURGATION: 383344, // Expurgation
  ART_OF_WAR: 267344, // Art of War
  SHIELD_OF_VENGEANCE: 184662, // Shield of Vengeance
  MASTERY_HIGHLORDS_JUDGMENT: 76672, // Mastery: Highlord's Judgment
};

// PART 9: PRIEST
const priestSpells = {
  // Priest - General
  SMITE: 585, // Smite
  SHADOW_WORD_PAIN: 589, // Shadow Word: Pain
  POWER_WORD_SHIELD: 17, // Power Word: Shield
  WEAKENED_SOUL: 6788, // Weakened Soul
  POWER_WORD_FORTITUDE: 21562, // Power Word: Fortitude
  FLASH_HEAL: 2061, // Flash Heal
  HEAL: 2060, // Heal
  RESURRECTION: 2006, // Resurrection
  FADE: 586, // Fade
  DESPERATE_PRAYER: 19236, // Desperate Prayer
  MIND_BLAST: 8092, // Mind Blast
  MIND_VISION: 2096, // Mind Vision
  LEVITATE: 1706, // Levitate
  MASS_DISPEL: 32375, // Mass Dispel
  DISPEL_MAGIC: 528, // Dispel Magic
  SHACKLE_UNDEAD: 9484, // Shackle Undead
  PSYCHIC_SCREAM: 8122, // Psychic Scream
  LEAP_OF_FAITH: 73325, // Leap of Faith
  MIND_CONTROL: 605, // Mind Control
  SHADOWFIEND: 34433, // Shadowfiend
  MINDBENDER: 123040, // Mindbender
  SHADOW_WORD_DEATH: 32379, // Shadow Word: Death
  HOLY_NOVA: 132157, // Holy Nova
  POWER_INFUSION: 10060, // Power Infusion
  SYMBOL_OF_HOPE: 64901, // Symbol of Hope
  ANGELIC_FEATHER: 121536, // Angelic Feather
  SHINING_FORCE: 204263, // Shining Force
  TWINS_OF_THE_SUN_PRIESTESS: 373466, // Twins of the Sun Priestess
  MASTERY_ECHO_OF_LIGHT: 77280, // Mastery: Echo of Light
  MASTERY_GRACE: 77289, // Mastery: Grace
  MASTERY_SHADOW_WEAVING: 77290, // Mastery: Shadow Weaving

  // Priest - Discipline
  PENANCE: 47540, // Penance
  POWER_WORD_RADIANCE: 194509, // Power Word: Radiance
  ATONEMENT: 194384, // Atonement
  ATONEMENT_BUFF: 81749, // Atonement (buff)
  PAIN_SUPPRESSION: 33206, // Pain Suppression
  RAPTURE: 47536, // Rapture
  POWER_WORD_BARRIER: 62618, // Power Word: Barrier
  MIND_SEAR: 48045, // Mind Sear
  SCHISM: 214621, // Schism
  EVANGELISM: 246287, // Evangelism
  SPIRIT_SHELL: 109964, // Spirit Shell
  LENIENCE: 238063, // Lenience
  CONTRITION: 197419, // Contrition

  // Priest - Holy
  RENEW: 139, // Renew
  HOLY_FIRE: 14914, // Holy Fire
  PRAYER_OF_HEALING: 596, // Prayer of Healing
  PRAYER_OF_MENDING: 33076, // Prayer of Mending
  PRAYER_OF_MENDING_BUFF: 41635, // Prayer of Mending (buff)
  HOLY_WORD_SERENITY: 2050, // Holy Word: Serenity
  HOLY_WORD_SANCTIFY: 34861, // Holy Word: Sanctify
  HOLY_WORD_CHASTISE: 88625, // Holy Word: Chastise
  GUARDIAN_SPIRIT: 47788, // Guardian Spirit
  DIVINE_HYMN: 64843, // Divine Hymn
  APOTHEOSIS: 200183, // Apotheosis
  CIRCLE_OF_HEALING: 204883, // Circle of Healing
  LIGHT_OF_TUURE: 208065, // Light of T'uure
  SPIRIT_OF_REDEMPTION: 20711, // Spirit of Redemption
  SURGE_OF_LIGHT: 114255, // Surge of Light

  // Priest - Shadow
  MIND_FLAY: 15407, // Mind Flay
  VAMPIRIC_TOUCH: 34914, // Vampiric Touch
  DEVOURING_PLAGUE: 335467, // Devouring Plague
  VOID_ERUPTION: 228260, // Void Eruption
  VOIDFORM: 194249, // Voidform
  VOID_BOLT: 205448, // Void Bolt
  SHADOWFORM: 232698, // Shadowform
  VAMPIRIC_EMBRACE: 15286, // Vampiric Embrace
  DISPERSION: 47585, // Dispersion
  SILENCE: 15487, // Silence
  DARK_ASCENSION: 391109, // Dark Ascension
  DAMNATION: 341374, // Damnation
  MINDBENDER_SHADOW: 200174, // Mindbender (Shadow)
  SURRENDER_TO_MADNESS: 319952, // Surrender to Madness
  PSYCHIC_HORROR: 64044, // Psychic Horror
  TORMENTED_SPIRITS: 246404, // Tormented Spirits
};

// PART 10: ROGUE
const rogueSpells = {
  // Rogue - General
  SINISTER_STRIKE: 1752, // Sinister Strike
  AMBUSH: 8676, // Ambush
  BACKSTAB: 53, // Backstab
  EVISCERATE: 196819, // Eviscerate
  SLICE_AND_DICE: 315496, // Slice and Dice
  SPRINT: 2983, // Sprint
  STEALTH: 1784, // Stealth
  VANISH: 1856, // Vanish
  EVASION: 5277, // Evasion
  CLOAK_OF_SHADOWS: 31224, // Cloak of Shadows
  FEINT: 1966, // Feint
  PICK_LOCK: 1804, // Pick Lock
  PICK_POCKET: 921, // Pick Pocket
  SAP: 6770, // Sap
  SHIV: 5938, // Shiv
  KICK: 1766, // Kick
  BLIND: 2094, // Blind
  CHEAP_SHOT: 1833, // Cheap Shot
  KIDNEY_SHOT: 408, // Kidney Shot
  SHROUD_OF_CONCEALMENT: 114018, // Shroud of Concealment
  TRICKS_OF_THE_TRADE: 57934, // Tricks of the Trade
  SHADOWSTEP: 36554, // Shadowstep
  DISTRACT: 1725, // Distract
  CRIMSON_VIAL: 185311, // Crimson Vial
  MARKED_FOR_DEATH: 137619, // Marked for Death
  ECHOING_REPRIMAND: 385616, // Echoing Reprimand
  SEPSIS: 385408, // Sepsis
  THISTLE_TEA: 381623, // Thistle Tea
  COLD_BLOOD: 382245, // Cold Blood
  SMOKE_BOMB: 212182, // Smoke Bomb
  MASTERY_POTENT_ASSASSIN: 76803, // Mastery: Potent Assassin
  MASTERY_MAIN_GAUCHE: 76806, // Mastery: Main Gauche
  MASTERY_EXECUTIONER: 76808, // Mastery: Executioner

  // Rogue - Assassination
  GARROTE: 703, // Garrote
  GARROTE_DOT: 703, // Garrote DoT
  MUTILATE: 1329, // Mutilate
  RUPTURE: 1943, // Rupture
  RUPTURE_DOT: 1943, // Rupture DoT
  ENVENOM: 32645, // Envenom
  POISONED_KNIFE: 185565, // Poisoned Knife
  CRIPPLING_POISON: 3408, // Crippling Poison
  CRIPPLING_POISON_DEBUFF: 3409, // Crippling Poison Debuff
  DEADLY_POISON: 2823, // Deadly Poison
  DEADLY_POISON_DOT: 2818, // Deadly Poison DoT
  INTERNAL_BLEEDING: 154953, // Internal Bleeding
  VENDETTA: 79140, // Vendetta
  DEATHMARK: 360194, // Deathmark
  EXSANGUINATE: 200806, // Exsanguinate
  KINGSBANE: 385627, // Kingsbane
  ZOLDYCK_RECIPE: 238102, // Zoldyck Recipe

  // Rogue - Outlaw
  PISTOL_SHOT: 185763, // Pistol Shot
  OPPORTUNITY: 195627, // Opportunity
  DISPATCH: 2098, // Dispatch
  BETWEEN_THE_EYES: 315341, // Between the Eyes
  ROLL_THE_BONES: 315508, // Roll the Bones
  ADRENALINE_RUSH: 13750, // Adrenaline Rush
  BLADE_FLURRY: 13877, // Blade Flurry
  GHOSTLY_STRIKE: 196937, // Ghostly Strike
  GRAPPLING_HOOK: 195457, // Grappling Hook
  BLADE_RUSH: 271877, // Blade Rush
  KILLING_SPREE: 51690, // Killing Spree
  LOADED_DICE: 256170, // Loaded Dice
  AUDACITY: 381982, // Audacity

  // Rogue - Subtlety
  SHADOWSTRIKE: 185438, // Shadowstrike
  SYMBOLS_OF_DEATH: 212283, // Symbols of Death
  SHADOW_DANCE: 185313, // Shadow Dance
  SHADOW_DANCE_BUFF: 185422, // Shadow Dance (buff)
  SHADOW_BLADES: 121471, // Shadow Blades
  SHURIKEN_STORM: 197835, // Shuriken Storm
  SECRET_TECHNIQUE: 280719, // Secret Technique
  BLACK_POWDER: 319175, // Black Powder
  DARK_SHADOW: 245687, // Dark Shadow
  SHOT_IN_THE_DARK: 257505, // Shot in the Dark
  MASTER_OF_SHADOWS: 196976, // Master of Shadows
};

// PART 11: SHAMAN
const shamanSpells = {
  // Shaman - General
  LIGHTNING_BOLT: 188196, // Lightning Bolt
  CHAIN_LIGHTNING: 188443, // Chain Lightning
  LAVA_BURST: 51505, // Lava Burst
  EARTH_SHOCK: 8042, // Earth Shock
  FROST_SHOCK: 196840, // Frost Shock
  FLAME_SHOCK: 188389, // Flame Shock
  HEALING_SURGE: 8004, // Healing Surge
  HEALING_WAVE: 77472, // Healing Wave
  CHAIN_HEAL: 1064, // Chain Heal
  GHOST_WOLF: 2645, // Ghost Wolf
  ANCESTRAL_SPIRIT: 2008, // Ancestral Spirit
  PURGE: 370, // Purge
  CLEANSE_SPIRIT: 51886, // Cleanse Spirit
  WIND_SHEAR: 57994, // Wind Shear
  HEX: 51514, // Hex
  CAPACITOR_TOTEM: 192058, // Capacitor Totem
  EARTHBIND_TOTEM: 2484, // Earthbind Totem
  TREMOR_TOTEM: 8143, // Tremor Totem
  EARTH_ELEMENTAL: 198103, // Earth Elemental
  ASTRAL_SHIFT: 108271, // Astral Shift
  SPIRIT_WALK: 58875, // Spirit Walk
  BLOODLUST: 2825, // Bloodlust
  HEROISM: 32182, // Heroism
  SPIRITWALKERS_GRACE: 79206, // Spiritwalker's Grace
  FAR_SIGHT: 6196, // Far Sight
  WATER_WALKING: 546, // Water Walking
  REINCARNATION: 20608, // Reincarnation
  EARTHQUAKE: 61882, // Earthquake
  MASTERY_ELEMENTAL_OVERLOAD: 168534, // Mastery: Elemental Overload
  MASTERY_ENHANCED_ELEMENTS: 77223, // Mastery: Enhanced Elements
  MASTERY_DEEP_HEALING: 77226, // Mastery: Deep Healing

  // Shaman - Elemental
  LAVA_SURGE: 77762, // Lava Surge
  ELEMENTAL_BLAST: 117014, // Elemental Blast
  ICEFURY: 210714, // Icefury
  STORM_ELEMENTAL: 192249, // Storm Elemental
  FIRE_ELEMENTAL: 198067, // Fire Elemental
  ELEMENTAL_FURY: 60188, // Elemental Fury
  ECHO_OF_THE_ELEMENTS: 333919, // Echo of the Elements
  MASTER_OF_THE_ELEMENTS: 16166, // Master of the Elements
  STORMKEEPER: 191634, // Stormkeeper
  ASCENDANCE_ELEMENTAL: 114050, // Ascendance (Elemental)
  LIQUID_MAGMA_TOTEM: 192222, // Liquid Magma Totem
  PRIMORDIAL_WAVE: 375982, // Primordial Wave

  // Shaman - Enhancement
  STORMSTRIKE: 17364, // Stormstrike
  LAVA_LASH: 60103, // Lava Lash
  CRASH_LIGHTNING: 187874, // Crash Lightning
  WINDFURY_WEAPON: 33757, // Windfury Weapon
  FLAMETONGUE_WEAPON: 318038, // Flametongue Weapon
  ROCKBITER_WEAPON: 193786, // Rockbiter Weapon
  FERAL_SPIRIT: 51533, // Feral Spirit
  MAELSTROM_WEAPON: 187880, // Maelstrom Weapon
  SUNDERING: 197214, // Sundering
  ASCENDANCE_ENHANCEMENT: 114051, // Ascendance (Enhancement)
  FURY_OF_AIR: 197211, // Fury of Air
  HOT_HAND: 201900, // Hot Hand
  FORCEFUL_WINDS: 262647, // Forceful Winds
  DOOM_WINDS: 384352, // Doom Winds

  // Shaman - Restoration
  RIPTIDE: 61295, // Riptide
  HEALING_RAIN: 73920, // Healing Rain
  HEALING_STREAM_TOTEM: 5394, // Healing Stream Totem
  HEALING_TIDE_TOTEM: 108280, // Healing Tide Totem
  CLOUDBURST_TOTEM: 157153, // Cloudburst Totem
  ANCESTRAL_PROTECTION_TOTEM: 207399, // Ancestral Protection Totem
  EARTHEN_WALL_TOTEM: 198838, // Earthen Wall Totem
  ANCESTRAL_GUIDANCE: 108281, // Ancestral Guidance
  WELLSPRING: 197995, // Wellspring
  ASCENDANCE_RESTORATION: 114052, // Ascendance (Restoration)
  TIDAL_WAVES: 53390, // Tidal Waves
  EARTH_SHIELD: 974, // Earth Shield
  WATER_SHIELD: 52127, // Water Shield
  DOWNPOUR: 207778, // Downpour
};

// PART 12: WARLOCK
const warlockSpells = {
  // Warlock - General
  SHADOW_BOLT: 686, // Shadow Bolt
  CORRUPTION: 172, // Corruption
  AGONY: 980, // Agony
  FEAR: 5782, // Fear
  DRAIN_LIFE: 234153, // Drain Life
  HEALTH_FUNNEL: 755, // Health Funnel
  LIFE_TAP: 1454, // Life Tap
  CURSE_OF_WEAKNESS: 702, // Curse of Weakness
  CURSE_OF_TONGUES: 1714, // Curse of Tongues
  CURSE_OF_EXHAUSTION: 334275, // Curse of Exhaustion
  BANISH: 710, // Banish
  CREATE_HEALTHSTONE: 6201, // Create Healthstone
  HEALTHSTONE: 5512, // Healthstone
  UNENDING_RESOLVE: 104773, // Unending Resolve
  DARK_PACT: 108416, // Dark Pact
  DEMONIC_CIRCLE: 48018, // Demonic Circle
  DEMONIC_CIRCLE_TELEPORT: 48020, // Demonic Circle: Teleport
  DEMONIC_GATEWAY: 111771, // Demonic Gateway
  SOULSTONE: 20707, // Soulstone
  RITUAL_OF_SUMMONING: 698, // Ritual of Summoning
  SUBJUGATE_DEMON: 1098, // Subjugate Demon
  SUMMON_IMP: 688, // Summon Imp
  SUMMON_VOIDWALKER: 697, // Summon Voidwalker
  SUMMON_FELHUNTER: 691, // Summon Felhunter
  SUMMON_SUCCUBUS: 712, // Summon Succubus
  GRIMOIRE_OF_SACRIFICE: 108503, // Grimoire of Sacrifice
  SHADOWFURY: 30283, // Shadowfury
  MORTAL_COIL: 6789, // Mortal Coil
  HOWL_OF_TERROR: 5484, // Howl of Terror
  BURNING_RUSH: 111400, // Burning Rush
  DARK_FURY: 196098, // Dark Fury
  MASTERY_POTENT_AFFLICTIONS: 77215, // Mastery: Potent Afflictions
  MASTERY_MASTER_DEMONOLOGIST: 77219, // Mastery: Master Demonologist
  MASTERY_CHAOTIC_ENERGIES: 77220, // Mastery: Chaotic Energies

  // Warlock - Affliction
  UNSTABLE_AFFLICTION: 316099, // Unstable Affliction
  MALEFIC_RAPTURE: 324536, // Malefic Rapture
  HAUNT: 48181, // Haunt
  PHANTOM_SINGULARITY: 205179, // Phantom Singularity
  SEED_OF_CORRUPTION: 27243, // Seed of Corruption
  VILE_TAINT: 278350, // Vile Taint
  DARK_SOUL_MISERY: 113860, // Dark Soul: Misery
  DRAIN_SOUL: 198590, // Drain Soul
  SHADOW_EMBRACE: 32388, // Shadow Embrace
  NIGHTFALL: 108558, // Nightfall
  INEVITABLE_DEMISE: 334319, // Inevitable Demise
  SOUL_ROT: 386997, // Soul Rot

  // Warlock - Demonology
  HAND_OF_GULDAN: 105174, // Hand of Gul'dan
  CALL_DREADSTALKERS: 104316, // Call Dreadstalkers
  SUMMON_DEMONIC_TYRANT: 265187, // Summon Demonic Tyrant
  DEMONBOLT: 264178, // Demonbolt
  IMPLOSION: 196277, // Implosion
  GRIMOIRE_FELGUARD: 111898, // Grimoire: Felguard
  DEMONIC_STRENGTH: 267171, // Demonic Strength
  BILESCOURGE_BOMBERS: 267211, // Bilescourge Bombers
  NETHER_PORTAL: 267217, // Nether Portal
  DEMONIC_CALLING: 205145, // Demonic Calling
  POWER_SIPHON: 264130, // Power Siphon
  DEMONIC_CORE: 267102, // Demonic Core
  SUMMON_VILEFIEND: 264119, // Summon Vilefiend
  SOUL_STRIKE: 264057, // Soul Strike

  // Warlock - Destruction
  CHAOS_BOLT: 116858, // Chaos Bolt
  INCINERATE: 29722, // Incinerate
  CONFLAGRATE: 17962, // Conflagrate
  IMMOLATE: 348, // Immolate
  HAVOC: 80240, // Havoc
  RAIN_OF_FIRE: 5740, // Rain of Fire
  DARK_SOUL_INSTABILITY: 113858, // Dark Soul: Instability
  CHANNEL_DEMONFIRE: 196447, // Channel Demonfire
  CATACLYSM: 152108, // Cataclysm
  SOUL_FIRE: 6353, // Soul Fire
  SHADOWBURN: 17877, // Shadowburn
  BACKDRAFT: 196406, // Backdraft
  ERADICATION: 196412, // Eradication
  ROARING_BLAZE: 205184, // Roaring Blaze
  INFERNAL: 1122, // Summon Infernal
};

// PART 13: WARRIOR
const warriorSpells = {
  // Warrior - General
  MORTAL_STRIKE: 12294, // Mortal Strike
  SLAM: 1464, // Slam
  EXECUTE: 163201, // Execute
  VICTORY_RUSH: 34428, // Victory Rush
  CLEAVE: 845, // Cleave
  WHIRLWIND: 1680, // Whirlwind
  CHARGE: 100, // Charge
  HEROIC_LEAP: 6544, // Heroic Leap
  INTERVENE: 3411, // Intervene
  PUMMEL: 6552, // Pummel
  TAUNT: 355, // Taunt
  INTIMIDATING_SHOUT: 5246, // Intimidating Shout
  HAMSTRING: 1715, // Hamstring
  PIERCING_HOWL: 12323, // Piercing Howl
  RALLYING_CRY: 97462, // Rallying Cry
  COMMANDING_SHOUT: 97463, // Commanding Shout
  BATTLE_SHOUT: 6673, // Battle Shout
  BERSERKER_RAGE: 18499, // Berserker Rage
  HEROIC_THROW: 57755, // Heroic Throw
  SPELL_REFLECTION: 23920, // Spell Reflection
  IGNORE_PAIN: 190456, // Ignore Pain
  DIE_BY_THE_SWORD: 118038, // Die by the Sword
  SHATTERING_THROW: 64382, // Shattering Throw
  STORM_BOLT: 107570, // Storm Bolt
  IMPENDING_VICTORY: 202168, // Impending Victory
  AVATAR: 107574, // Avatar
  CHALLENGING_SHOUT: 1161, // Challenging Shout
  OVERPOWER: 7384, // Overpower
  BLADESTORM: 227847, // Bladestorm
  RAVAGER: 152277, // Ravager
  THUNDERCLAP: 6343, // Thunderclap
  MASTERY_DEEP_WOUNDS: 262111, // Mastery: Deep Wounds
  MASTERY_CRITICAL_BLOCK: 76857, // Mastery: Critical Block
  MASTERY_UNSHACKLED_FURY: 76856, // Mastery: Unshackled Fury

  // Warrior - Arms
  COLOSSUS_SMASH: 167105, // Colossus Smash
  SWEEPING_STRIKES: 260708, // Sweeping Strikes
  REND: 772, // Rend
  WARBREAKER: 262161, // Warbreaker
  DEADLY_CALM: 262228, // Deadly Calm
  SHARPEN_BLADE: 198817, // Sharpen Blade
  CLEAVE_ARMS: 845, // Cleave (Arms)
  IN_FOR_THE_KILL: 248621, // In For The Kill
  MASSACRE: 281001, // Massacre
  FERVOR_OF_BATTLE: 202316, // Fervor of Battle
  WARBREAKER: 262161, // Warbreaker
  DREADNAUGHT: 262150, // Dreadnaught
  SKULLSPLITTER: 260643, // Skullsplitter

  // Warrior - Fury
  BLOODTHIRST: 23881, // Bloodthirst
  RAGING_BLOW: 85288, // Raging Blow
  RAMPAGE: 184367, // Rampage
  ENRAGE: 184362, // Enrage
  SIEGEBREAKER: 280772, // Siegebreaker
  DRAGON_ROAR: 118000, // Dragon Roar
  BLOODBATH: 12292, // Bloodbath
  FRENZY: 335082, // Frenzy
  MEAT_CLEAVER: 280392, // Meat Cleaver
  SUDDEN_DEATH: 280721, // Sudden Death
  RECKLESSNESS: 1719, // Recklessness
  ONSLAUGHT: 315720, // Onslaught
  FROTHING_BERSERKER: 215571, // Frothing Berserker
  FRESH_MEAT: 215568, // Fresh Meat
  WRECKING_BALL: 215570, // Wrecking Ball

  // Warrior - Protection
  SHIELD_SLAM: 23922, // Shield Slam
  REVENGE: 6572, // Revenge
  DEVASTATE: 20243, // Devastate
  SHIELD_BLOCK: 2565, // Shield Block
  LAST_STAND: 12975, // Last Stand
  SHIELD_WALL: 871, // Shield Wall
  DEMORALIZING_SHOUT: 1160, // Demoralizing Shout
  SHOCKWAVE: 46968, // Shockwave
  DRAGONS_ROAR: 118000, // Dragon's Roar
  SHIELD_BASH: 72, // Shield Bash
  DEVASTATOR: 236279, // Devastator
  BOLSTER: 280001, // Bolster
  HEAVY_REPERCUSSIONS: 203177, // Heavy Repercussions
  INDOMITABLE: 202095, // Indomitable
  NEVER_SURRENDER: 202561, // Never Surrender
  BEST_SERVED_COLD: 202560, // Best Served Cold
  ANGER_MANAGEMENT: 152278, // Anger Management
};

