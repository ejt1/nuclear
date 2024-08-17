export const MovementFlags = {
  MOVEMENTFLAG_NONE: 0x00000000,
  MOVEMENTFLAG_FORWARD: 0x00000001,
  MOVEMENTFLAG_BACKWARD: 0x00000002,
  MOVEMENTFLAG_STRAFE_LEFT: 0x00000004,
  MOVEMENTFLAG_STRAFE_RIGHT: 0x00000008,
  MOVEMENTFLAG_TURN_LEFT: 0x00000010,
  MOVEMENTFLAG_TURN_RIGHT: 0x00000020,
  MOVEMENTFLAG_PITCH_UP: 0x00000040,
  MOVEMENTFLAG_PITCH_DOWN: 0x00000080,
  MOVEMENTFLAG_WALK_MODE: 0x00000100,
  MOVEMENTFLAG_LEVITATING: 0x00000400,
  MOVEMENTFLAG_FLYING: 0x00000800,
  MOVEMENTFLAG_FALLING: 0x00002000,
  MOVEMENTFLAG_FALLINGFAR: 0x00004000,
  MOVEMENTFLAG_SWIMMING: 0x00200000,
  MOVEMENTFLAG_SPLINE_ENABLED: 0x00400000,
  MOVEMENTFLAG_CAN_FLY: 0x00800000,
  MOVEMENTFLAG_FLYING_OLD: 0x01000000,
  MOVEMENTFLAG_ONTRANSPORT: 0x02000000,
  MOVEMENTFLAG_SPLINE_ELEVATION: 0x04000000,
  MOVEMENTFLAG_ROOT: 0x08000000,
  MOVEMENTFLAG_WATERWALKING: 0x10000000,
  MOVEMENTFLAG_SAFE_FALL: 0x20000000,
  MOVEMENTFLAG_HOVER: 0x40000000
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
