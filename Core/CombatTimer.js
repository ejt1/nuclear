class CombatTimer extends wow.EventListener {
    constructor() {
      super();
      this.combatStartTime = 0;
      this.inCombat = false;
      this.combatTime = 0;
    }
  
    onEvent(event) {
      if (event.name === "PLAYER_ENTER_COMBAT") {
        this.combatStartTime = Date.now();
        this.inCombat = true;
        this.combatTime = 0;
      } else if (event.name === "PLAYER_LEAVE_COMBAT") {
        this.inCombat = false;
        this.combatTime = 0;
      }
    }
  
    /**
     * Returns the current combat time in milliseconds.
     * @returns {number} - The time in milliseconds since entering combat, or 0 if not in combat.
     */
    getCombatTime() {
      if (!this.inCombat) {
        return 0;
      }
      return Date.now() - this.combatStartTime;
    }

    getCombatStartTime() {
      if (!this.inCombat) {
        return 0;
      }
      return this.combatStartTime;
    }
  
    /**
     * Returns the current combat time in seconds.
     * @returns {number} - The time in seconds since entering combat, or 0 if not in combat.
     */
    getCombatTimeSeconds() {
      return Math.floor(this.getCombatTime() / 1000);
    }
  
    /**
     * Returns the current combat time in a formatted string (MM:SS).
     * @returns {string} - The formatted combat time, or "00:00" if not in combat.
     */
    getFormattedCombatTime() {
      const seconds = this.getCombatTimeSeconds();
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }
  
  // Create and use the singleton directly
  export default new CombatTimer();