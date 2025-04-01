import { Behavior, BehaviorContext } from '@/Core/Behavior';
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from '@/Core/Spell';
import Settings from "@/Core/Settings";
import CombatTimer from '@/Core/CombatTimer';
import objMgr from "@/Core/ObjectManager";
import { me } from '@/Core/ObjectManager';
import { defaultCombatTargeting as combat } from '@/Targeting/CombatTargeting';

// Define auras and spell IDs
const auras = {
  // Core auras
  combustion: 190319,
  hotStreak: 48108,
  heatingUp: 48107,
  
  // Talent-related auras
  furyOfTheSunKing: 383883, // Fury of the Sun King proc
  hyperthermia: 383874, // Secondary talent Hot Streak
  phoenixFlames: 257541,
  feelTheBurn: 157644, // Feel the Burn talent aura
  flameAccelerant: 203285, // Flame Accelerant talent aura
  sunKingsBlessing: 383882, // Sun King's Blessing talent aura
  improvedScorch: 383605, // Improved Scorch debuff
  frostfireEmpowerment: 383493, // Frostfire Empowerment
  heatShimmer: 375091, // Heat Shimmer (for scorch procs)
  
  // Add Phoenix Reborn buff
  phoenixReborn: 444214,  // Phoenix Reborn buff
  phoenixRebornBurn: 444219,  // Phoenix Reborn burn effect

  // External buffs
  bloodlust: 2825,
  timeWarp: 80353,
  heroism: 32182,
  
  // Consumables
  potionOfColdClarity: 371033
};

export class FireMageSunfuryBehavior extends Behavior {
  name = 'Fire Mage Sunfury';
  context = BehaviorContext.Any;
  specialization = Specialization.Mage.Fire;
  version = wow.GameVersion.Retail;

  static settings = [
    {
      header: "Rotation Settings",
      options: [
        { type: "checkbox", uid: "FireMageUseCombustion", text: "Use Combustion", default: true },
        { type: "checkbox", uid: "FireMageUseTrinkets", text: "Use Trinkets", default: true },
        { type: "checkbox", uid: "FireMageUseRacials", text: "Use Racial Abilities", default: true },
        { type: "checkbox", uid: "FireMageFirestarterCombustion", text: "Use Combustion during Firestarter", default: true }
      ]
    },
    {
      header: "AoE Settings",
      options: [
        { type: "slider", uid: "FireMageHotStreakFlamestrike", text: "Hot Streak Flamestrike Target Count", min: 2, max: 10, default: 3 },
        { type: "slider", uid: "FireMageHardCastFlamestrike", text: "Hard Cast Flamestrike Target Count", min: 2, max: 10, default: 5 },
        { type: "slider", uid: "FireMageCombustionFlamestrike", text: "Combustion Flamestrike Target Count", min: 2, max: 10, default: 3 },
        { type: "slider", uid: "FireMageSKBFlamestrike", text: "Fury of the Sun King Flamestrike Target Count", min: 2, max: 10, default: 3 }
      ]
    },
    {
      header: "Combustion Settings",
      options: [
        { type: "slider", uid: "FireMageCombustionShiftingPower", text: "Combustion Shifting Power Target Count", min: 1, max: 10, default: 5 },
        { type: "slider", uid: "FireMageFireBlastPoolAmount", text: "Extra Fire Blast Pool Amount", min: 0, max: 1, default: 0 }
      ]
    }
  ];

  build() {
    
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForNotSitting(),
      
      // Interrupt enemy casts
      spell.cast('Counterspell', () => combat.interruptTarget),
      
      // Target validation
      new bt.Action(() => (this.getCurrentTarget() === null ? bt.Status.Success : bt.Status.Failure)),
      common.waitForTarget(),
      common.waitForFacing(),
      common.waitForCastOrChannel(),
      
     
      // Pre-combat buffs
      new bt.Decorator(
        () => !me.inCombat(),
        new bt.Selector(
          spell.cast('Arcane Intellect', () => me, () => !me.hasAura('Arcane Intellect')),
          spell.cast('Mirror Image', () => me),
          spell.cast('Pyroblast', this.getCurrentTarget, () => me.hasAura(auras.hotStreak))
        )
      ),
      
      // Combat rotation
      new bt.Decorator(
        () => !spell.isGlobalCooldown(),
        new bt.Selector(
          // Calculate time to combustion
          this.calculateCombustionTiming(),
          
          // Use Shifting Power outside of combustion
          this.useShiftingPower(),

          // Combustion phase
          new bt.Decorator(
            () => this.shouldStartCombustion() || me.hasAura(auras.combustion),
            this.combustionPhase(),
            new bt.Action(() => bt.Status.Success)
          )

        )
      ),
      
      // Single target standard sustained
      new bt.Decorator(
        req => this.getCurrentTarget(),
        this.standardRotation(),
        new bt.Action(() => bt.Status.Success)
      ),
      
      // Auto attack fallback
      spell.cast('Auto Attack', this.getCurrentTarget, req => true)

      // Default actions if nothing else can be done
      // spell.cast('Ice Nova', this.getCurrentTarget, () => !this.isScorchExecutePhase()),
      // spell.cast('Scorch', this.getCurrentTarget)
    );
  }

  // Helper method to get the current primary target
  getCurrentTarget() {
    const targetPredicate = unit => unit && !unit.dead && !unit.deadOrGhost && me.canAttack(unit);
    const target = me.targetUnit;
    
    if (target !== null && targetPredicate(target)) {
      return target;
    }
    
    return combat.targets.find(targetPredicate) || null;
  }

  // Calculate timing for combustion
  calculateCombustionTiming() {
    return new bt.Action(() => {
      // Base combustion cooldown in milliseconds
      const combustionCD = spell.getCooldown('Combustion');
      let timeToCombustion = combustionCD.timeleft;
      
      // If Combustion is already available and not on cooldown, set time to 0
      if (combustionCD.ready && !me.hasAura(auras.combustion)) {
        // console.debug('Combustion is ready to use!');
        this.timeToCombustion = 0;
        return bt.Status.Failure; // Continue to next action
      }
      
      // Account for Kindling talent cooldown reduction (if present)
      if (this.hasTalent('Kindling')) {
        timeToCombustion *= 0.9; // Simplified reduction estimate
      }
      
      // Delay combustion if Firestarter is active and setting is false
      if (this.isFirestarterActive() && !Settings.FireMageFirestarterCombustion) {
        timeToCombustion = Math.max(timeToCombustion, this.getFirestarterRemains() * 1000); // Convert to ms
      }
      
      // Delay for Sun King's Blessing during Firestarter
      if (this.hasTalent('Sun King\'s Blessing') && this.isFirestarterActive() && !me.hasAura(auras.furyOfTheSunKing)) {
        const missingStacks = 4 - (me.getAuraStacks(auras.sunKingsBlessing) || 0);
        timeToCombustion = Math.max(timeToCombustion, missingStacks * 3 * 1500); // 3 GCDs × 1.5s in ms
      }
      
      // // Don't delay if fight is about to end
      // if (this.fightRemains() < 20000) { // 20 seconds in ms
      //   timeToCombustion = Math.min(timeToCombustion, 0);
      // }
      
      // Log the calculated time for debugging
      // console.debug(`Time to Combustion: ${timeToCombustion/1000} seconds, CD: ${combustionCD.timeleft/1000}s, Ready: ${combustionCD.ready}`);
      
      // Store for use in other methods (in milliseconds)
      this.timeToCombustion = timeToCombustion;
      
      return bt.Status.Failure; // Always continue to next action
    });
  }
  

  // Combustion phase rotation
  combustionPhase() {
    return new bt.Selector(
      // Combustion cooldowns (racials, trinkets, etc)
      new bt.Decorator(
        () => me.hasAura(auras.combustion) && Settings.FireMageUseCombustion,
        this.combustionCooldowns()
      ),
      
      // Active talents usage (Meteor)
      this.useActiveTalents(),
      
      // Precast for combustion
      new bt.Selector(
        spell.cast('Flamestrike', this.getCurrentTarget, () => 
          !me.hasAura(auras.combustion) && 
          me.hasAura(auras.furyOfTheSunKing) && 
          spell.getCooldown('Combustion').remains < spell.getSpell('Flamestrike').castTime &&
          this.enemyCount() >= Settings.FireMageSKBFlamestrike
        ),
        
        spell.cast('Pyroblast', this.getCurrentTarget, () => {
          const hasHotStreak = me.hasAura(auras.hotStreak);
          const hasCombustion = me.hasAura(auras.combustion);
          
          // console.debug(`Combustion Pyroblast check: Hot Streak: ${hasHotStreak}, Combustion: ${hasCombustion}`);
          
          return hasHotStreak && hasCombustion;
        }),
        
        spell.cast('Meteor', this.getCurrentTarget, () =>
          !me.hasAura(auras.combustion) &&
          this.hasTalent('Isothermic Core') &&
          !this.hasTalent('Unleashed Inferno') &&
          spell.getCooldown('Combustion').timeleft < spell.getSpell('Meteor').castTime
        ),
        
        spell.cast('Fireball', this.getCurrentTarget, () =>
          !me.hasAura(auras.combustion) &&
          spell.getCooldown('Combustion').timeleft < spell.getSpell('Fireball').castTime &&
          this.enemyCount() < 2 &&
          !this.isScorchExecutePhase() &&
          !(this.hasTalent('Sun King\'s Blessing') && this.hasTalent('Flame Accelerant'))
        ),
        
        spell.cast('Scorch', this.getCurrentTarget, () =>
          !me.hasAura(auras.combustion) &&
          spell.getCooldown('Combustion').timeleft < spell.getSpell('Scorch').castTime
        ),
        
        // Spend Frostfire Empowerment before combustion
        spell.cast('Fireball', this.getCurrentTarget, () =>
          !me.hasAura(auras.combustion) &&
          me.hasAura(auras.frostfireEmpowerment)
        )
      ),
      
      // Use combustion when precast is almost finished
       // Improved Combustion cast with fewer restrictions
      spell.cast('Combustion', this.getCurrentTarget, () => {
        if (me.hasAura(auras.combustion) || !Settings.FireMageUseCombustion) {
          return false;
        }
        
        const combustionCD = spell.getCooldown('Combustion');
        if (!combustionCD.ready) {
          return false;
        }
        
        // console.debug('Attempting to cast Combustion!');
        
        // Allow casting combustion either during a cast or standalone
        return true; // If Combustion is ready and we want to use it, just cast it
      }),
      
      // Cancel Hyperthermia if SKB proc is available
      new bt.Action(() => {
        if (me.hasAura('Hyperthermia') && me.hasAura(auras.furyOfTheSunKing)) {
          // In a real script we would use wow.CancelAura() here
          // console.info('Canceling Hyperthermia aura for Fury of the Sun King usage');
        }
        return bt.Status.Failure;
      }),
      
      // Hot streak and Hyperthermia usage
      spell.cast('Flamestrike', this.getCurrentTarget, () => 
        ((me.hasAura(auras.hotStreak) && this.enemyCount() >= Settings.FireMageCombustionFlamestrike) || 
         (me.hasAura(auras.hyperthermia) && this.enemyCount() >= (Settings.FireMageCombustionFlamestrike - 1))) &&
        me.hasAura(auras.combustion)
      ),
      
      spell.cast('Pyroblast', this.getCurrentTarget, () => me.hasAura(auras.hyperthermia)),
      
      spell.cast('Pyroblast', this.getCurrentTarget, () => 
        me.hasAura(auras.hotStreak) && me.hasAura(auras.combustion)
      ),
      
      // Fury of the Sun King usage during combustion
      spell.cast('Flamestrike', this.getCurrentTarget, () => 
        me.hasAura(auras.furyOfTheSunKing) && 
        this.enemyCount() >= Settings.FireMageSKBFlamestrike && 
        me.hasAura(auras.combustion)
      ),
      
      spell.cast('Pyroblast', this.getCurrentTarget, () => 
        me.hasAura(auras.furyOfTheSunKing) && me.hasAura(auras.combustion)
      ),
      
      // Fireball with Frostfire Empowerment
      spell.cast('Fireball', this.getCurrentTarget, () => 
        me.hasAura(auras.frostfireEmpowerment) && 
        !me.hasAura(auras.hotStreak)
      ),
      
      // Improved Scorch management
      spell.cast('Scorch', this.getCurrentTarget, () => 
        this.hasTalent('Improved Scorch') && 
        this.improviedScorchDebuffRemains() < 3 * 1.5 && // 3 GCDs
        this.enemyCount() < Settings.FireMageCombustionFlamestrike
      ),
      
      // Call the dedicated Phoenix Flames method
      this.usePhoenixFlames(),

      // Heat Shimmer proc usage
      spell.cast('Scorch', this.getCurrentTarget, () => 
        me.hasAura(auras.heatShimmer) && 
        (this.hasTalent('Scald') || this.hasTalent('Improved Scorch')) && 
        this.enemyCount() < Settings.FireMageCombustionFlamestrike
      ),
      
      // Phoenix Flames for Hot Streak generation during combustion
      spell.cast('Phoenix Flames', this.getCurrentTarget, () => 
        spell.getCharges('Phoenix Flames') > 0 &&
        !spell.isGlobalCooldown()
      ),
      
      // Scorch as filler during combustion
      spell.cast('Scorch', this.getCurrentTarget, () => 
        me.hasAura(auras.combustion) && 
        spell.getSpell('Scorch').castTime >= 1.5
      ),
      
      // Fireball as last resort
      spell.cast('Fireball', this.getCurrentTarget)
    );
  }

  // Combustion cooldowns (trinkets, racials, etc.)
  combustionCooldowns() {
    return new bt.Selector(
      // Consumables
      // spell.cast('Potion', () => me, () => me.hasAura(auras.combustion)),
      
      // Racials
      new bt.Decorator(
        () => Settings.FireMageUseRacials,
        new bt.Selector(
          spell.cast('Blood Fury', () => me, () => me.hasAura(auras.combustion)),
          spell.cast('Berserking', () => me, () => me.hasAura(auras.combustion)),
          spell.cast('Fireblood', () => me, () => me.hasAura(auras.combustion)),
          spell.cast('Ancestral Call', () => me, () => me.hasAura(auras.combustion))
        )
      ),
      
      // External buffs (handled by invoke_external_buff in SimC)
      
      // Trinket usage
      new bt.Decorator(
        () => Settings.FireMageUseTrinkets && me.hasAura(auras.combustion),
        new bt.Selector(
          common.useEquippedItemByName("Gladiators Badge"),
          common.useEquippedItemByName("Treacherous Transmitter"),
          common.useEquippedItemByName("Imperfect Ascendancy Serum"),
          common.useEquippedItemByName("Neural Synapse Enhancer"),
          common.useEquippedItemByName("Flarendos Pilot Light"),
          common.useEquippedItemByName("House of Cards"),
          common.useEquippedItemByName("Funhouse Lens"),
          common.useEquippedItemByName("Quickwick Candlestick"),
          common.useEquippedItemByName("Signet of the Priory"),
          common.useEquippedItemByName("Soulletting Ruby"),
          common.useEquippedItemByName("Hyperthread Wristwraps", () => spell.getCharges('Fire Blast') === 0)
        )
      )
    );
  }

  // Active talents like Meteor and Dragon's Breath
  useActiveTalents() {
    return new bt.Selector(
      // Meteor usage
      spell.cast('Meteor', this.getCurrentTarget, () => {
        if (!me.hasAura('Meteor'))
          return null;

        const combustionAura = me.getAura(auras.combustion);
        const combustionRemaining = combustionAura ? combustionAura.remaining : 0;
        
        return (me.hasAura(auras.combustion) && me.getAura(auras.combustion).remaining < spell.getSpell('Meteor').castTime) || 
               (this.timeToCombustion <= 0 || (combustionAura && combustionRemaining > spell.getSpell('Meteor').travelTime));
      }),
      
      // Dragon's Breath with Alexstrasza's Fury
      spell.cast('Dragon\'s Breath', this.getCurrentTarget, () =>
        this.hasTalent('Alexstrasza\'s Fury') && 
        !me.hasAura(auras.combustion) && 
        !me.hasAura(auras.hotStreak) && 
        (me.hasAura(auras.feelTheBurn) || CombatTimer.getCombatTimeSeconds() > 15) && 
        !this.isScorchExecutePhase()
      )
    );
  }

  // Shifting Power usage outside of combustion
  // Improved Shifting Power implementation
 // Updated Shifting Power implementation to exactly match the APL
useShiftingPower() {
  if(spell.getCooldown('Combustion').ready || spell.getCooldown('Combustion').timeleft < 20000) {
    return false;
  }

  return spell.cast('Shifting Power', this.getCurrentTarget, () => {
    // Get the current target for debuff checks
    const target = this.getCurrentTarget();
    if (!target) return false;
    
    // Check if Improved Scorch is talented and relevant conditions
    const isImprovedScorchTalented = this.hasTalent('Improved Scorch');
    const improvedScorchDebuff = isImprovedScorchTalented ? target.hasAuraByMe(auras.improvedScorch) : null;
    const shiftingPowerCastTime = spell.getSpell('Shifting Power').castTime;
    const scorchCastTime = spell.getSpell('Scorch').castTime;
    
    // Precisely matching the APL condition by condition:
    // 1. Combustion is down
    const combustionDown = !me.hasAura(auras.combustion);
    
    // 2. Either Improved Scorch is not talented, OR debuff has enough time AND no Fury of the Sun King
    // const improvedScorchCondition = !isImprovedScorchTalented || 
    //                                (improvedScorchDebuff && 
    //                                 improvedScorchDebuff.remaining > (shiftingPowerCastTime + scorchCastTime) && 
    //                                 !me.hasAura(auras.furyOfTheSunKing));

    const improvedScorchCondition = true;
    
    // 3. No Hot Streak
    const noHotStreak = !me.hasAura(auras.hotStreak);
    
    // 4. No Hyperthermia
    const noHyperthermia = !me.hasAura(auras.hyperthermia);
    
    // 5. Either Phoenix Flames has 1 or fewer charges OR Combustion cooldown is less than 20 seconds
    const cooldownCondition = spell.getCharges('Phoenix Flames') <= 1 || 
                             spell.getCooldown('Combustion').timeleft < 20000; // in ms
    
    // All conditions must be true for Shifting Power to be used
    return combustionDown && improvedScorchCondition && noHotStreak && 
           noHyperthermia && cooldownCondition;
  });
}

  // Standard rotation outside of combustion
  standardRotation() {
    return new bt.Selector(
      // Hot Streak and AoE flamestrike usage
      spell.cast('Flamestrike', this.getCurrentTarget, () => 
        this.enemyCount() >= Settings.FireMageHotStreakFlamestrike && 
        (me.hasAura(auras.hotStreak) || me.hasAura(auras.hyperthermia))
      ),
      
      // Meteor with Unleashed Inferno
      spell.cast('Meteor', this.getCurrentTarget, () => 
        this.hasTalent('Unleashed Inferno') && 
        me.getAuraStacks('Excess Fire') < 2
      ),
      
      // Hot Streak Pyroblast for single target
      spell.cast('Pyroblast', this.getCurrentTarget, req => (me.hasAura(auras.hotStreak) || me.hasAura(auras.hyperthermia))),
      
      // Fury of the Sun King AoE Flamestrike
      spell.cast('Flamestrike', this.getCurrentTarget, () => 
        this.enemyCount() >= Settings.FireMageSKBFlamestrike && 
        me.hasAura(auras.furyOfTheSunKing) && 
        me.getAura(auras.furyOfTheSunKing).expiration_delay_remains === 0
      ),
      
      // Improved Scorch management
      spell.cast('Scorch', this.getCurrentTarget, () => 
        this.hasTalent('Improved Scorch') && 
        this.improviedScorchDebuffRemains() < 3 * 1.5 && 
        (this.wasLastSpell() != 'Scorch')
      ),
      
      // Fury of the Sun King Pyroblast
      spell.cast('Pyroblast', this.getCurrentTarget, () => 
        me.hasAura(auras.furyOfTheSunKing) && 
        me.getAura(auras.furyOfTheSunKing).expiration_delay_remains === 0
      ),
      
      // Fire Blast usage during non-combustion
      spell.cast('Fire Blast', this.getCurrentTarget, () => {
        // Don't use during Firestarter
        if (this.isFirestarterActive() || this.isFireBlastPooling()) {
          return false;
        }
        
        // Don't use when Fury of the Sun King is up
        if (me.hasAura(auras.furyOfTheSunKing)) {
          return false;
        }
        
        // Fireball/Pyroblast cast with Heating Up
        const duringCast = (me.isCasting && 
                            (this.isCurrentlyCasting('Fireball') || this.isCurrentlyCasting('Pyroblast')) && 
                            me.hasAura(auras.heatingUp) && 
                            me.getCurrentCastTimeRemaining() < 0.5);
        
        // Execute phase with Searing Touch
        const duringExecute = this.isScorchExecutePhase() && 
                             (!this.hasTalent('Improved Scorch') || 
                             target.getAuraByMe(auras.improvedScorch)?.stack === target.getAuraByMe(auras.improvedScorch)?.max_stack || 
                             spell.getFullRechargeTime('Fire Blast') < 3000) && 
                             ((me.hasAura(auras.heatingUp) && !this.isCurrentlyCasting('Scorch')) || 
                             (!me.hasAura(auras.hotStreak) && !me.hasAura(auras.heatingUp) && 
                             this.isCurrentlyCasting('Scorch') && this.getHotStreakSpellsInFlight() === 0));
        
        return duringCast || duringExecute;
      }),
      
      // Fire Blast with Hyperthermia
      spell.cast('Fire Blast', this.getCurrentTarget, () => 
        me.hasAura(auras.hyperthermia) && 
        spell.getChargesFractional('Fire Blast') > 1 && 
        me.hasAura(auras.heatingUp)
      ),
      
      // Pyroblast after Scorch during execute
      spell.cast('Pyroblast', this.getCurrentTarget, () => 
        this.wasLastSpell('Scorch') && 
        me.hasAura(auras.heatingUp) && 
        this.isScorchExecutePhase() && 
        this.enemyCount() < Settings.FireMageHotStreakFlamestrike
      ),
      
      // Fireball with Frostfire Empowerment
      spell.cast('Fireball', this.getCurrentTarget, () => me.hasAura(auras.frostfireEmpowerment)),
      
      // Heat Shimmer proc usage
      spell.cast('Scorch', this.getCurrentTarget, () => 
        me.hasAura(auras.heatShimmer) && 
        (this.hasTalent('Scald') || this.hasTalent('Improved Scorch')) && 
        this.enemyCount() < Settings.FireMageCombustionFlamestrike
      ),
      
      // Phoenix Flames usage
      spell.cast('Phoenix Flames', this.getCurrentTarget, () => {
        // Don't use if we're pooling for combustion
        if (this.isPhoenixFlamesPooling()) {
          return false;
        }
        
        // Check if we have charges and not on GCD
        return spell.getCharges('Phoenix Flames') > 0 && !spell.isGlobalCooldown();
      }),
      
      // Dragon's Breath for AoE with Alexstrasza's Fury
      spell.cast('Dragon\'s Breath', this.getCurrentTarget, () => 
        this.enemyCount() > 1 && this.hasTalent('Alexstrasza\'s Fury')
      ),
      
      // Scorch during execute phase or with Heat Shimmer
      spell.cast('Scorch', this.getCurrentTarget, () => 
        this.isScorchExecutePhase() || me.hasAura(auras.heatShimmer)
      ),
      
      // Hard cast flamestrike for large AoE
      spell.cast('Flamestrike', this.getCurrentTarget, () => 
        this.enemyCount() >= Settings.FireMageHardCastFlamestrike
      ),
      
      // Arcane Explosion for AoE if enough mana
      spell.cast('Arcane Explosion', this.getCurrentTarget, () => 
        this.enemyCount() >= this.arcaneExplosionTargets && 
        me.powerByType(0) >= (me.maxPowerByType(0) * this.arcaneExplosionManaPercent / 100)
      ),
      
      // Fireball as filler
      spell.cast('Fireball', this.getCurrentTarget)
    );
  }
  

  // Helper functions
  shouldStartCombustion() {
    // Check if Combustion is available
    const combustionCD = spell.getCooldown('Combustion');
    const shouldStart = (combustionCD.ready || this.timeToCombustion <= 0) &&
           !me.hasAura(auras.combustion) &&
           Settings.FireMageUseCombustion;
    
    // Log the decision for debugging
    // console.debug(`Should start Combustion: ${shouldStart}, timeToCombustion: ${this.timeToCombustion/1000}s, cooldown ready: ${combustionCD.ready}, hasAura: ${me.hasAura(auras.combustion)}, setting: ${Settings.FireMageUseCombustion}`);
    
    return shouldStart;
  }

  isCurrentlyCasting(spellName) {
    if (!me.isCasting) {
      return false;
    }
    
    const currentSpellId = me.currentCast;
    if (!currentSpellId) {
      return false;
    }
    const currentSpell = spell.getSpell(currentSpellId);
    return currentSpell && currentSpell.name.toLowerCase() === spellName.toLowerCase();
  }

  hasValidHotStreak() {
    // Check for actual Hot Streak or Hyperthermia buffs
    const hasHotStreak = me.hasAura(auras.hotStreak);
    const hasHyperthermia = me.hasAura(auras.hyperthermia);
    
    // Debug the aura check
    // console.debug(`Hot Streak check: Hot Streak aura: ${hasHotStreak}, Hyperthermia: ${hasHyperthermia}`);
    
    return hasHotStreak || hasHyperthermia;
  }
  isFirestarterActive() {
    const target = this.getCurrentTarget();
    return target && this.hasTalent('Firestarter') && target.pctHealth >= 90;
  }

  getFirestarterRemains() {
    const target = this.getCurrentTarget();
    // Estimate how long until target drops below 90% health
    // This is a simplified approach - in reality you'd need better estimation
    return target && target.pctHealth >= 90 ? 15 : 0;
  }

  isFireBlastPooling() {
    return this.timeToCombustion <= 8 + Settings.FireMageFireBlastPoolAmount;
  }
// Improve Phoenix Flames pooling logic
  // Replace the isPhoenixFlamesPooling method with a simpler version
isPhoenixFlamesPooling() {
  // Don't pool if we have Phoenix Reborn active
  if (this.hasPhoenixRebornActive()) {
    return false;
  }
  
  // Very basic pooling logic - only pool when Combustion is coming up soon
  // and we have the Sun King's Blessing talent
  return this.timeToCombustion <= 5 && this.hasTalent('Sun King\'s Blessing');
}

  isScorchExecutePhase() {
    const target = this.getCurrentTarget();
    return target && target.pctHealth <= 30;
  }

  enemyCount(range = 8) {
    return me.getUnitsAroundCount(range);
  }

  fightRemains() {
    // In real implementation, this would use more sophisticated logic
    return 300; // Default to 5 minutes
  }

  hasTalent(talentName) {
    // This is a simplified implementation since we don't have direct access
    // to the talent tree in this framework
    // In a real implementation, would check actual talents
    return true;
  }

  // Add specific Phoenix Reborn tracking method
  hasPhoenixRebornActive() {
    return me.hasAura(auras.phoenixReborn) || me.hasAura(auras.phoenixRebornBurn);
  }

  // First, add this to your FireMageSunfuryBehavior class
usePhoenixFlames() {
  return spell.cast('Phoenix Flames', this.getCurrentTarget, () => {
    // Basic requirements to cast
    const hasCharges = spell.getCooldown('Phoenix Flames').charges > 0;
    const notOnGCD = !spell.isGlobalCooldown();
    
    // Check Phoenix Reborn status
    const phoenixRebornActive = this.hasPhoenixRebornActive();
    
    // Pooling check (simplify to make sure it's not blocking casts)
    const shouldPool = this.timeToCombustion <= 5 && 
                      !phoenixRebornActive && 
                      this.hasTalent('Sun King\'s Blessing');
    
    // Debug output to help identify the issue
    // console.debug(`Phoenix Flames status: Has charges: ${hasCharges}, Not on GCD: ${notOnGCD}, Phoenix Reborn: ${phoenixRebornActive}, Pooling: ${shouldPool}`);
    
    // Simplified condition: cast if we have charges and either we have Phoenix Reborn active or we're not pooling
    return hasCharges && notOnGCD && (phoenixRebornActive || !shouldPool);
  });
}

/**
 * Gets the remaining time on the Improved Scorch debuff on the current target.
 * 
 * @returns {number} - The remaining time in milliseconds, or 0 if no debuff is present.
 */
improviedScorchDebuffRemains() {
  const target = this.getCurrentTarget();
  if (!target) return 0;
  
  const debuff = target.hasAuraByMe(auras.improvedScorch);
  // console.debug('Debuff found ' + target.hasAuraByMe(auras.improvedScorch));
  return debuff ? debuff.remaining : 0;
}

// Helper method to check if we have a valid Hot Streak or Hyperthermia proc
hasHotStreakProc() {
  // Check both auras directly
  return me.hasAura(auras.hotStreak) || me.hasAura(auras.hyperthermia);
}
wasLastSpell() {
    let lastSpell = spell.getLastSuccessfulSpell();
    return lastSpell;
  }

  debugFunction(){
    if(!me.isCastingOrChanneling){
      console.debug('Not Casting');
    }
    let currentSpellName = spell.getSpell(me.currentCast).name;
    console.debug("In Cast : " + currentSpellName);
  }
}