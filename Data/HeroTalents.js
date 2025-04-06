import { me } from "@/Core/ObjectManager";
import HeroTalents from '@/Enums/HeroTalent';
import Specialization from '@/Enums/Specialization';
import { HeroTalentEnum } from './HeroTalentEnums';

/**
 * Auto-detects the active hero talent build based on the player's auras
 * @param {number} specialization - The specialization ID of the player
 * @returns {string|null} - The detected hero talent build name or null if none detected
 */
function detectHeroTalentBuild(specialization) {
  let heroBuildMap;
  let classType;
  
  // Select the appropriate hero talent map based on class specialization
  switch(true) {
    // Death Knight specs (250-252)
    case specialization >= 250 && specialization <= 252:
      heroBuildMap = HeroTalents.DeathKnight;
      classType = "DeathKnight";
      break;
      
    // Demon Hunter specs (577-581)
    case specialization >= 577 && specialization <= 581:
      heroBuildMap = HeroTalents.DemonHunter;
      classType = "DemonHunter";
      break;
      
    // Druid specs (102-105)
    case specialization >= 102 && specialization <= 105:
      heroBuildMap = HeroTalents.Druid;
      classType = "Druid";
      break;
      
    // Evoker specs (1467-1473)
    case specialization >= 1467 && specialization <= 1473:
      heroBuildMap = HeroTalents.Evoker;
      classType = "Evoker";
      break;
      
    // Hunter specs (253-255)
    case specialization >= 253 && specialization <= 255:
      heroBuildMap = HeroTalents.Hunter;
      classType = "Hunter";
      break;
      
    // Mage specs (62-64)
    case specialization >= 62 && specialization <= 64:
      heroBuildMap = HeroTalents.Mage;
      classType = "Mage";
      break;
      
    // Monk specs (268-270)
    case specialization >= 268 && specialization <= 270:
      heroBuildMap = HeroTalents.Monk;
      classType = "Monk";
      break;
      
    // Paladin specs (65-70)
    case specialization >= 65 && specialization <= 70:
      heroBuildMap = HeroTalents.Paladin;
      classType = "Paladin";
      break;
      
    // Priest specs (256-258)
    case specialization >= 256 && specialization <= 258:
      heroBuildMap = HeroTalents.Priest;
      classType = "Priest";
      break;
      
    // Rogue specs (259-261)
    case specialization >= 259 && specialization <= 261:
      heroBuildMap = HeroTalents.Rogue;
      classType = "Rogue";
      break;
      
    // Shaman specs (262-264)
    case specialization >= 262 && specialization <= 264:
      heroBuildMap = HeroTalents.Shaman;
      classType = "Shaman";
      break;
      
    // Warlock specs (265-267)
    case specialization >= 265 && specialization <= 267:
      heroBuildMap = HeroTalents.Warlock;
      classType = "Warlock";
      break;
      
    // Warrior specs (71-73)
    case specialization >= 71 && specialization <= 73:
      heroBuildMap = HeroTalents.Warrior;
      classType = "Warrior";
      break;
      
    default:
      return { build: null, class: null };
  }

  // Check for the presence of top talents in player auras
  for (const [buildKey, buildInfo] of Object.entries(heroBuildMap)) {
    if (buildInfo.topTalent && me.hasAura(buildInfo.topTalent)) {
      return { build: buildKey, class: classType };
    }
  }

  // Default to the first hero talent if none detected
  const defaultBuild = Object.keys(heroBuildMap)[0];
  return { build: defaultBuild, class: classType };
}

/**
 * Simplified function to check if a specific hero talent is active
 * @param {Object} heroTalent - The hero talent to check in format Class.TALENT_NAME (e.g., HeroTalentEnum.Monk.MASTER_OF_HARMONY)
 * @returns {boolean} - True if the specified hero talent is active
 */
function isHeroBuild(heroTalent) {
  // Get class and talent from the enum property
  const classMap = {
    DeathKnight: HeroTalentEnum.DeathKnight,
    DemonHunter: HeroTalentEnum.DemonHunter,
    Druid: HeroTalentEnum.Druid,
    Evoker: HeroTalentEnum.Evoker,
    Hunter: HeroTalentEnum.Hunter,
    Mage: HeroTalentEnum.Mage,
    Monk: HeroTalentEnum.Monk,
    Paladin: HeroTalentEnum.Paladin,
    Priest: HeroTalentEnum.Priest,
    Rogue: HeroTalentEnum.Rogue,
    Shaman: HeroTalentEnum.Shaman,
    Warlock: HeroTalentEnum.Warlock,
    Warrior: HeroTalentEnum.Warrior
  };
  
  // Find which class this talent belongs to
  let talentClass = null;
  let talentName = null;
  
  for (const [className, talents] of Object.entries(classMap)) {
    for (const [key, value] of Object.entries(talents)) {
      if (value === heroTalent) {
        talentClass = className;
        talentName = key;
        break;
      }
    }
    if (talentClass) break;
  }
  
  if (!talentClass || !talentName) {
    console.error("Invalid hero talent specified");
    return false;
  }
  
  const currentSpec = wow.SpecializationInfo.activeSpecializationId;
  const detected = detectHeroTalentBuild(currentSpec);
  
  return detected.class === talentClass && detected.build === talentName;
}

export { detectHeroTalentBuild, isHeroBuild };