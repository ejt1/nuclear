// Exclusions.js

// Spells with 0 cast time but cannot be used while moving, likely channeled spells
export const exclusions = {
  117952: true, // Crackling Jade Lightning
  115175: true, // Soothing Mist
  357208: true, // Fire Breath
  356995: true, // Disintegrate
  359073: true, // Eternity Surge
  15407: true,  // Mind Flay
  391403: true, // Mind Flay V2
};

// Spells that can be cast while moving
export const castWhileMove = {
  56641: true, // Steady Shot
  2948: true, // Scorch
};

export const castWhileMoveAuras = {
  358267: true, // Hover
  79206: true, // Spiritwalkers Grace
  108839: true, // Ice Floes
}

// Exclusions for Line of Sight checks (LoS exclusions)
export const losExclude = {
  44566: true,  // Ozumat big squid boi
  98696: true,
  131863: true, // Waycrest Manor boss
  208478: true, // Worm raid boss
  56754: true,  // Serpent in Mists of Pandaria
  71543: true,  // Immerseus boss
  63191: true,  // Big boi
};

// Exclusions for use (probably not interactable)
export const useExclude = {
  44566: true,  // Ozumat big squid boi
  208478: true, // Worm raid boss
};

export default {
  exclusions,
  castWhileMove,
  losExclude,
  useExclude,
};
