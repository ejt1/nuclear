export const MovementFlags = {
  NONE: 0x00000000,
  FORWARD: 0x00000001,
  BACKWARD: 0x00000002,
  STRAFE_LEFT: 0x00000004,
  STRAFE_RIGHT: 0x00000008,
  TURN_LEFT: 0x00000010,
  TURN_RIGHT: 0x00000020,
  PITCH_UP: 0x00000040,
  PITCH_DOWN: 0x00000080,
  WALK_MODE: 0x00000100,
  LEVITATING: 0x00000400,
  FLYING: 0x00000800,
  FALLING: 0x00002000,
  FALLINGFAR: 0x00004000,
  SWIMMING: 0x00200000,
  SPLINE_ENABLED: 0x00400000,
  CAN_FLY: 0x00800000,
  FLYING_OLD: 0x01000000,
  ONTRANSPORT: 0x02000000,
  SPLINE_ELEVATION: 0x04000000,
  ROOT: 0x08000000,
  WATERWALKING: 0x10000000,
  SAFE_FALL: 0x20000000,
  HOVER: 0x40000000
};

export const UnitFlags = {
  NONE: 0x00000000,            // No flags
  UNK1: 0x00000001,            // Unknown flag (1)
  NOT_ATTACKABLE: 0x00000002,  // Unit is not attackable
  UNK2: 0x00000004,            // Unknown flag (2)
  PLAYER_CONTROLLED: 0x00000008, // Player-controlled unit
  UNK3: 0x00000010,            // Unknown flag (3)
  PREPARATION: 0x00000020,     // Preparation mode
  UNK4: 0x00000040,            // Unknown flag (4)
  PLUS_AOE: 0x00000080,        // Plus AoE damage taken
  STUNNED: 0x00000400,         // Unit is stunned
  FLAG_UNK5: 0x00000800,       // Unknown flag (5)
  FEARED: 0x00001000,          // Unit is feared
  PACIFIED: 0x00002000,        // Unit is pacified (cannot attack or cast)
  SILENCED: 0x00020000,        // Unit is silenced
  IMMUNE_TO_PC: 0x00010000,    // Immune to player characters
  IMMUNE_TO_NPC: 0x00080000,   // Immune to NPC characters
  DISARMED: 0x00200000,        // Unit is disarmed
  CONFUSED: 0x00400000,        // Unit is confused (similar to feared but may behave differently)
  FLEEING: 0x00800000,         // Unit is fleeing
  NOT_SELECTABLE: 0x02000000,  // Unit is not selectable
  CANNOT_MOVE: 0x04000000,     // Unit cannot move
  FLAG_UNK6: 0x08000000,       // Unknown flag (6)
  UNK7: 0x10000000,            // Unknown flag (7)
  UNK8: 0x20000000,            // Unknown flag (8)
  UNK9: 0x40000000,            // Unknown flag (9)
  UNK10: 0x80000000            // Unknown flag (10)
};
