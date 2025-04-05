import { me } from "@/Core/ObjectManager";
import HeroTalents from './HeroTalents';
import Specialization from '@/Enums/Specialization';

/**
 * Auto-detects the active hero talent build based on the player's auras
 * @param {number} specialization - The specialization ID of the player
 * @returns {string|null} - The detected hero talent build name or null if none detected
 */
function detectHeroTalentBuild(specialization) {
  let heroBuildMap;
  
  // Select the appropriate hero talent map based on class specialization
  switch(true) {
    // Death Knight specs (250-252)
    case specialization >= 250 && specialization <= 252:
      heroBuildMap = HeroTalents.DeathKnight;
      break;
      
    // Demon Hunter specs (577-581)
    case specialization >= 577 && specialization <= 581:
      heroBuildMap = HeroTalents.DemonHunter;
      break;
      
    // Druid specs (102-105)
    case specialization >= 102 && specialization <= 105:
      heroBuildMap = HeroTalents.Druid;
      break;
      
    // Evoker specs (1467-1473)
    case specialization >= 1467 && specialization <= 1473:
      heroBuildMap = HeroTalents.Evoker;
      break;
      
    // Hunter specs (253-255)
    case specialization >= 253 && specialization <= 255:
      heroBuildMap = HeroTalents.Hunter;
      break;
      
    // Mage specs (62-64)
    case specialization >= 62 && specialization <= 64:
      heroBuildMap = HeroTalents.Mage;
      break;
      
    // Monk specs (268-270)
    case specialization >= 268 && specialization <= 270:
      heroBuildMap = HeroTalents.Monk;
      break;
      
    // Paladin specs (65-70)
    case specialization >= 65 && specialization <= 70:
      heroBuildMap = HeroTalents.Paladin;
      break;
      
    // Priest specs (256-258)
    case specialization >= 256 && specialization <= 258:
      heroBuildMap = HeroTalents.Priest;
      break;
      
    // Rogue specs (259-261)
    case specialization >= 259 && specialization <= 261:
      heroBuildMap = HeroTalents.Rogue;
      break;
      
    // Shaman specs (262-264)
    case specialization >= 262 && specialization <= 264:
      heroBuildMap = HeroTalents.Shaman;
      break;
      
    // Warlock specs (265-267)
    case specialization >= 265 && specialization <= 267:
      heroBuildMap = HeroTalents.Warlock;
      break;
      
    // Warrior specs (71-73)
    case specialization >= 71 && specialization <= 73:
      heroBuildMap = HeroTalents.Warrior;
      break;
      
    default:
      return null;
  }

  // Check for the presence of top talents in player auras
  for (const [buildKey, buildInfo] of Object.entries(heroBuildMap)) {
    if (buildInfo.topTalent && me.hasAura(buildInfo.topTalent)) {
      return buildKey;
    }
  }

  // Default to the first hero talent if none detected
  return Object.keys(heroBuildMap)[0];
}

/**
 * Helper function to determine which hero talent build a player is using
 * This can be used in behavior classes to customize rotation based on hero talent
 * @param {string} className - The class name (e.g., "Warrior", "Mage")
 * @param {string} buildKey - The hero talent build key to check (e.g., "COLOSSUS", "SLAYER")
 * @returns {boolean} - True if the player has the specified hero talent build
 */
function hasHeroTalentBuild(className, buildKey) {
  const currentSpec = wow.SpecializationInfo.activeSpecializationId;
  const detectedBuild = detectHeroTalentBuild(currentSpec);
  
  // Check if the detected build matches the requested build
  return detectedBuild === buildKey;
}

export { detectHeroTalentBuild, hasHeroTalentBuild };