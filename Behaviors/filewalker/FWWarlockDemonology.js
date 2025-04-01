import { Behavior, BehaviorContext } from '@/Core/Behavior';
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from '@/Core/Spell';
import Settings from "@/Core/Settings";
import objMgr from "@/Core/ObjectManager";
import CombatTimer from "@/Core/CombatTimer"
import { me } from '@/Core/ObjectManager';
import Pet from "@/Core/Pet";
import { PowerType } from "@/Enums/PowerType";
import { defaultCombatTargeting as combat } from '@/Targeting/CombatTargeting';

// STATUS: WIP

// Define auras and spell IDs for easier reference
const auras = {
  tyrant: 265273,
  demonicCore: 264173,
  powerSiphon: 334581,
  demonicCalling: 205146,
  dreadstalkers: 193332,
  grimFelguard: 111898,
  vilefiend: 264119,
  diabolicsRitualMother: 405764,
  diabolicsRitualOverlord: 405761,
  diabolicsRitualPitLord: 405765,
  bloodlust: 2825 // Also includes Heroism, Time Warp, etc.
};

const debuffs = {
  doom: 603
};

export class DemonologyWarlockBehavior extends Behavior {
  name = 'Demonology Warlock';
  context = BehaviorContext.Any;
  specialization = Specialization.Warlock.Demonology;
  version = wow.GameVersion.Retail;

  static settings = [
    {
      header: "Cooldowns",
      options: [
        { type: "checkbox", uid: "DemoUsePotion", text: "Use Potion", default: true },
        { type: "checkbox", uid: "DemoUseTrinkets", text: "Use Trinkets", default: true }
      ]
    },
    {
      header: "AoE Settings",
      options: [
        { type: "checkbox", uid: "DemoUseImplosion", text: "Use Implosion in AoE", default: true },
        { type: "slider", uid: "DemoImplThreshold", text: "Min targets for Implosion", min: 2, max: 8, default: 3 }
      ]
    },
    {
      header: "Talent Options",
      options: [
        { type: "checkbox", uid: "DemoHasSacrificedSouls", text: "Using Sacrificed Souls Talent", default: true },
        { type: "checkbox", uid: "DemoHasFelInvocation", text: "Using Fel Invocation Talent", default: false },
        { type: "checkbox", uid: "DemoHasGrimoireFelguard", text: "Using Grimoire Felguard Talent", default: true },
        { type: "checkbox", uid: "DemoHasSummonVilefiend", text: "Using Summon Vilefiend Talent", default: true }
      ]
    }
  ];

  // Variables that would normally be set in precombat
  firstTyrantTime = CombatTimer.getCombatStartTime() + 12000;
  inOpener = true;
  lastDreadstalkerSummonTime = null;
  dreadstalkerExpirationTime = null;
  trinket1Buffs = false;
  trinket2Buffs = false;
  trinket1Exclude = false;
  trinket2Exclude = false;
  trinket1Manual = false;
  trinket2Manual = false;
  trinket1BuffDuration = 0;
  trinket2BuffDuration = 0;
  trinket1Sync = 0.5;
  trinket2Sync = 0.5;
  damageTrinketPriority = 1;
  trinketPriority = 1;
  variablesInitialized = false;
  
  // Additional variables from the APL
  nextTyrantCd = 0;
  impDespawn = 0;
  implFlag = false;
  poolCoresForTyrant = false;
  diabolicRitualRemains = 0;
  

  build() {

    

    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForNotSitting(),
      
      new bt.Action(() => (this.getCurrentTarget() === null ? bt.Status.Success : bt.Status.Failure)),
      common.waitForTarget(),
      common.waitForFacing(),
      common.waitForCastOrChannel(),
      
      // Main rotation logic
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          // Variables calculation first
          // Use potion
          new bt.Action(() => {
            if (Settings.DemoUsePotion && this.getAuraRemainingTime(auras.tyrant) > 10000) {
              // Potion usage logic would go here
              // Since there's no direct way to use potions in this framework, this is a placeholder
              return bt.Status.Success;
            }
            return bt.Status.Failure;
          }),
          // Call racial abilities
          this.useRacials(),
          this.calculateVariables(),
          // Use trinkets
          this.useTrinkets(),
          
          // Fight end sequence (under 30 seconds remaining)
          new bt.Decorator(
            req => this.getFightRemaining() < 30000,
            this.fightEndActions(),
            new bt.Action(() => bt.Status.Success)
          ),
          
          // Opener sequence
          new bt.Decorator(
            req => this.getTimePassed() < this.firstTyrantTime && this.inOpener,
            this.openerActions(),
            new bt.Action(() => bt.Status.Success)
          ),
          
          // Tyrant setup sequence
          new bt.Decorator(
            req => spell.getCooldown('Summon Demonic Tyrant').timeleft < this.getGcdMax() * 14,
            this.tyrantActions(),
            new bt.Action(() => bt.Status.Success)
          ),

          // Rotation Funnel sequence
          new bt.Decorator(
            this.singleTargetActions(),
            new bt.Action(() => bt.Status.Success)
          ),
          
          
          // Default to Shadow Bolt
          spell.cast('Shadow Bolt', this.getCurrentTarget),
          
          // Last resort
          spell.cast('Infernal Bolt', this.getCurrentTarget),
          
          // Auto attack as fallback
          spell.cast('Auto Attack', this.getCurrentTarget, req => true)
        )
      )
    );
  }

  // Helper to get current target
  getCurrentTarget() {
    const targetPredicate = unit => common.validTarget(unit) && me.isFacing(unit);
    const target = me.target;
    if (target !== null && targetPredicate(target)) {
      return target;
    }
    return combat.targets.find(targetPredicate) || null;
  }

  // Calculate variables and update them
  calculateVariables() {
    
    return new bt.Action(() => {
      // Initialize variables if not done yet
      if (!this.variablesInitialized) {
        this.firstTyrantTime = CombatTimer.getCombatStartTime() + 12000;
        
        // Add execution time for Grimoire Felguard if talented
        if (this.hasTalent('Grimoire Felguard')) {
          this.firstTyrantTime += spell.getSpell('Grimoire: Felguard').castTime;
        }
        
        // Add execution time for Summon Vilefiend if talented
        if (this.hasTalent('Summon Vilefiend')) {
          this.firstTyrantTime += spell.getSpell('Summon Vilefiend').castTime;
        }
        
        // Add GCD if either talent is present
        if (this.hasTalent('Grimoire Felguard') || this.hasTalent('Summon Vilefiend')) {
          this.firstTyrantTime += this.getGcdMax();
        }
        
        // Subtract Tyrant and Shadow Bolt cast times return spell.getSpell(spellName).castTime;
        this.firstTyrantTime -= (spell.getSpell('Summon Demonic Tyrant').castTime + spell.getSpell('Shadow Bolt').castTime);
        
        // Ensure minimum of 10s
        this.firstTyrantTime = Number(Math.max(10000, this.firstTyrantTime));
        
        this.inOpener = true;
        this.variablesInitialized = true;
      }
      
      // Update nextTyrantCd
      this.nextTyrantCd = spell.getCooldown('Summon Demonic Tyrant').timeleft;
      
      const tyrantAura = me.getAura(auras.tyrant);
      if ((tyrantAura && tyrantAura.id === auras.tyrant) || 
          (this.nextTyrantCd > 0 && this.nextTyrantCd < 120000)) {
        if (this.inOpener) {
          console.log("Tyrant detected - turning off opener mode");
          this.inOpener = false;
        }
      }
      
      
      // Update impDespawn logic
      if (this.wasPrevGcd('Hand of Gul\'dan') && 
          this.getActiveStalker() > 0 && 
          spell.getCooldown('Summon Demonic Tyrant').timeleft < 13000 && 
          this.impDespawn === 0) {
        this.impDespawn = 2 * this.getSpellHaste() * 6 + 0.58 + this.getTimePassed();
      }
      
      // Check for dreadstalkers
      if (this.impDespawn) {
        this.impDespawn = Math.max(this.impDespawn, this.getDreadstalkerRemainingTime() + this.getTimePassed());
      }
      
      // Check for grimoire felguard
      if (this.impDespawn && me.hasAura(auras.grimFelguard)) {
        this.impDespawn = Math.max(this.impDespawn, this.getAuraRemainingTime(auras.grimFelguard) + this.getTimePassed());
      }
      
      // Reset impDespawn if Tyrant is active
      if (me.hasAura(auras.tyrant)) {
        this.impDespawn = 0;
      }
      
      // Define impl variable
      const activeEnemies = this.getActiveEnemies();
      const sacrificedSoulsModifier = this.hasTalent('Sacrificed Souls') ? 1 : 0;
      
      if (activeEnemies > 1 + sacrificedSoulsModifier) {
        this.implFlag = !me.hasAura(auras.tyrant);
      }
      
      if (activeEnemies > 2 + sacrificedSoulsModifier && activeEnemies < 5 + sacrificedSoulsModifier) {
        this.implFlag = this.getAuraRemainingTime(auras.tyrant) < 6000;
      }
      
      if (activeEnemies > 4 + sacrificedSoulsModifier) {
        this.implFlag = this.getAuraRemainingTime(auras.tyrant) < 8000;
      }
      
      // Pool cores for tyrant logic
      this.poolCoresForTyrant = this.nextTyrantCd < 20000 && 
                               (me.hasAura(auras.demonicCore) || !me.hasAura(auras.demonicCore)) &&
                               spell.getCooldown('Summon Vilefiend').timeleft < this.getGcdMax() * 8 &&
                               spell.getCooldown('Call Dreadstalkers').timeleft < this.getGcdMax() * 8;
      
      // Set diabolic ritual remains
      if (me.hasAura(auras.diabolicsRitualMother)) {
        this.diabolicRitualRemains = this.getAuraRemainingTime(auras.diabolicsRitualMother);
      } else if (me.hasAura(auras.diabolicsRitualOverlord)) {
        this.diabolicRitualRemains = this.getAuraRemainingTime(auras.diabolicsRitualOverlord);
      } else if (me.hasAura(auras.diabolicsRitualPitLord)) {
        this.diabolicRitualRemains = this.getAuraRemainingTime(auras.diabolicsRitualPitLord);
      } else {
        this.diabolicRitualRemains = 0;
      }
      console.log(this.debugTyrantStatus());
      return bt.Status.Failure; // Continue with the next action
    });
    
  }
  
singleTargetActions()
{
    return new bt.Selector(

        // Standard rotation when not in tyrant setup
        spell.cast('Call Dreadstalkers', this.getCurrentTarget, req => this.nextTyrantCd > 25000, success => {
          const currentCombatTime = Number(CombatTimer.getCombatTime());
          this.lastDreadstalkerSummonTime = Number(CombatTimer.getCombatTime());
          this.dreadstalkerExpirationTime = this.lastDreadstalkerSummonTime + 12000;
          console.log(`Dreadstalkers summoned at ${currentCombatTime}ms, will expire at ${this.dreadstalkerExpirationTime}ms`);
          return true; // Continue processing
        }),
          
          spell.cast('Summon Vilefiend', this.getCurrentTarget, req =>
            spell.getCooldown('Summon Demonic Tyrant').timeleft > 30000 && this.hasTalent('Summon Vilefiend')
          ),
          
          // Demonbolt with Demonic Core
          spell.cast('Demonbolt', this.getCurrentTarget, req =>
            me.hasAura(auras.demonicCore) &&
            (!this.hasTalent('Doom') || me.hasAura(auras.demonicCore)|| 
             this.getAuraRemainingTime(debuffs.doom) > 10000 || !this.getCurrentTarget().hasAura(debuffs.doom)) &&
            (((!this.hasTalent('Fel Invocation') || 
            wow.SpellBook.petSpells.getSpell('Soul Strike').cooldown > this.getGcdMax() * 2) && 
              this.getSoulShards() < 4)) &&
            !this.wasPrevGcd('Demonbolt') &&
            !this.poolCoresForTyrant
          ),
          Pet.attack(on => combat.targets.find(unit => unit.isTanking())),
          spell.cast('Demonbolt', this.getCurrentTarget, req =>
            me.hasAura(auras.demonicCore) - (this.hasTalent('Doom') && !this.getCurrentTarget().hasAura(debuffs.doom) ? 2 : 0) &&
            this.getSoulShards() <= 3 &&
            !this.poolCoresForTyrant
          ),
          
          spell.cast('Power Siphon', on => me, req =>
            me.hasAura(auras.demonicCore) && spell.getCooldown('Summon Demonic Tyrant').timeleft > 25000
          ),
          
          spell.cast('Demonic Strength', this.getCurrentTarget, req =>
            this.getActiveEnemies() > 1
          ),
          
          spell.cast('Bilescourge Bombers', this.getCurrentTarget, req =>
            this.getActiveEnemies() > 1
          ),
          
          spell.cast('Guillotine', this.getCurrentTarget, req =>
            this.getActiveEnemies() > 1 && 
            (spell.getCooldown('Demonic Strength').timeleft || !this.hasTalent('Demonic Strength'))
          ),
          
          spell.cast('Ruination', this.getCurrentTarget),
          
          spell.cast('Infernal Bolt', this.getCurrentTarget, req =>
            this.getSoulShards() < 3 && spell.getCooldown('Summon Demonic Tyrant').timeleft > 20000
          ),
          
          // Implosion logic
          spell.cast('Implosion', this.getCurrentTarget, req =>
            this.getTwoCastImps() > 0 && this.implFlag && !this.wasPrevGcd('Implosion') &&
            (!this.isRaidEventAddsExists() || 
             (this.isRaidEventAddsExists() && 
              (this.getActiveEnemies() > 3 || 
               (this.getActiveEnemies() <= 3 && this.getLastCastImps() > 0))))
          ),
          
          // Diabolic Ritual handling
          spell.cast('Demonbolt', this.getCurrentTarget, req =>
            this.diabolicRitualRemains > this.getGcdMax() &&
            this.diabolicRitualRemains < this.getGcdMax() + this.getGcdMax() &&
            me.hasAura(auras.demonicCore) &&
            this.getSoulShards() <= 3
          ),
          
          spell.cast('Shadow Bolt', this.getCurrentTarget, req =>
            this.diabolicRitualRemains > this.getGcdMax() &&
            this.diabolicRitualRemains < this.getSoulShardDeficit() * spell.getCastTime('Shadow Bolt') + this.getGcdMax() &&
            this.getSoulShards() < 5
          ),
          
          // Hand of Gul'dan for single target
          spell.cast('Hand of Gul\'dan', this.getCurrentTarget, req =>
            ((this.getSoulShards() > 2 &&
              (spell.getCooldown('Call Dreadstalkers').timeleft > this.getGcdMax() * 4 ||
               this.getAuraRemainingTime(auras.demonicCalling) - this.getGcdMax() > spell.getCooldown('Call Dreadstalkers').timeleft) &&
              spell.getCooldown('Summon Demonic Tyrant').timeleft > 17000) ||
             this.getSoulShards() === 5 ||
             (this.getSoulShards() === 4 && this.hasTalent('Fel Invocation'))) &&
            (this.getActiveEnemies() === 1)
          ),
          
          // Hand of Gul'dan for AoE
          spell.cast('Hand of Gul\'dan', this.getCurrentTarget, req =>
            this.getSoulShards() > 2 && this.getActiveEnemies() > 1
          ),
          
          // More Demonbolt conditions
          spell.cast('Demonbolt', this.getCurrentTarget, req =>
            (!this.getCurrentTarget().hasAura(debuffs.doom) || this.getActiveEnemies() < 4) &&
            me.hasAura(auras.demonicCore) &&
            ((this.getSoulShards() < 4 && !this.hasTalent('Soul Strike') ||
              (this.getSoulStrikeCD() > this.getGcdMax() * 2 && this.hasTalent('Fel Invocation'))) ||
             this.getSoulShards() < 3) &&
            !this.poolCoresForTyrant
          ),
          
          spell.cast('Demonbolt', this.getCurrentTarget, req =>
            me.hasAura(auras.demonicCore) && me.hasAura(auras.tyrant) && this.getSoulShards() < 3
          ),
          
          spell.cast('Demonbolt', this.getCurrentTarget, req =>
            me.hasAura(auras.demonicCore) && this.getSoulShards() < 4
          )
    );
}

  // Fight end sequence (when less than 30 seconds remain)
  fightEndActions() {
    return new bt.Selector(
      spell.cast('Grimoire Felguard', this.getCurrentTarget, req => this.getFightRemaining() < 20),
      spell.cast('Ruination', this.getCurrentTarget),
      spell.cast('Implosion', this.getCurrentTarget, req => 
        this.getFightRemaining() < this.getGcdMax() * 2 && !this.wasPrevGcd('Implosion')
      ),
      spell.cast('Demonbolt', this.getCurrentTarget, req => 
        this.getFightRemaining() < this.getGcdMax() * 2 * (me.hasAura(auras.demonicCore) > 0 ? 1 : 0) + 9 && 
        me.hasAura(auras.demonicCore) && 
        (this.getSoulShards() < 4 || this.getFightRemaining() < (me.hasAura(auras.demonicCore) > 0 ? 1 : 0) * this.getGcdMax())
      ),
      spell.cast('Call Dreadstalkers', this.getCurrentTarget, req => this.getFightRemaining() < 20, success => {
        const currentCombatTime = Number(CombatTimer.getCombatTime());
        this.lastDreadstalkerSummonTime = Number(CombatTimer.getCombatTime());
        this.dreadstalkerExpirationTime = this.lastDreadstalkerSummonTime + 12000; // 12 seconds duration
        console.log(`Dreadstalkers summoned at ${currentCombatTime}ms, will expire at ${this.dreadstalkerExpirationTime}ms`);
        return true; // Continue processing
      }),
      spell.cast('Summon Vilefiend', this.getCurrentTarget, req => this.getFightRemaining() < 20),
      spell.cast('Summon Demonic Tyrant', this.getCurrentTarget, req => this.getFightRemaining() < 20),
      spell.cast('Demonic Strength', this.getCurrentTarget, req => this.getFightRemaining() < 10),
      spell.cast('Power Siphon', on => me, req => 
        me.hasAura(auras.demonicCore) && this.getFightRemaining() < 20
      ),
      spell.cast('Demonbolt', this.getCurrentTarget, req => 
        this.getFightRemaining() < this.getGcdMax() * 2 * (me.hasAura(auras.demonicCore) > 0 ? 1 : 0) + 9 && 
        me.hasAura(auras.demonicCore) && 
        (this.getSoulShards() < 4 || this.getFightRemaining() < (me.hasAura(auras.demonicCore) > 0 ? 1 : 0) * this.getGcdMax())
      ),
      spell.cast('Hand of Gul\'dan', this.getCurrentTarget, req => 
        this.getSoulShards() > 2 && this.getFightRemaining() < this.getGcdMax() * 2 * (me.hasAura(auras.demonicCore) > 0 ? 1 : 0) + 9
      ),
      spell.cast('Infernal Bolt', this.getCurrentTarget)
    );
  }
  
  // Opener sequence
  openerActions() {
    return new bt.Selector(
      spell.cast('Grimoire Felguard', this.getCurrentTarget, req => 
        this.getSoulShards() >= 5 - (this.hasTalent('Fel Invocation') ? 1 : 0)
      ),
      spell.cast('Summon Vilefiend', this.getCurrentTarget, req => this.getSoulShards() === 5),
      spell.cast('Shadow Bolt', this.getCurrentTarget, req => 
        this.getSoulShards() < 5 && spell.getCooldown('Call Dreadstalkers').ready
      ),
      spell.cast('Call Dreadstalkers', this.getCurrentTarget, req => this.getSoulShards() === 5, success => {
        const currentCombatTime = Number(CombatTimer.getCombatTime());
        this.lastDreadstalkerSummonTime = Number(CombatTimer.getCombatTime());
        this.dreadstalkerExpirationTime = this.lastDreadstalkerSummonTime + 12000; // 12 seconds duration
        console.log(`Dreadstalkers summoned at ${currentCombatTime}ms, will expire at ${this.dreadstalkerExpirationTime}ms`);
        return true; // Continue processing
      }),
      spell.cast('Ruination', this.getCurrentTarget)
    );
  }
  
  // Tyrant setup sequence
  tyrantActions() {
    return new bt.Selector(
      // Use racials if imp despawn conditions are met
      new bt.Decorator(
        req => this.impDespawn && 
              this.impDespawn < this.getTimePassed() + this.getGcdMax() * 2 + spell.getSpell('Summon Demonic Tyrant').castTime && 
              (this.wasPrevGcd('Hand of Gul\'dan') || this.wasPrevGcd('Ruination')) && 
              (this.impDespawn && this.impDespawn < this.getTimePassed() + this.getGcdMax() + spell.getSpell('Summon Demonic Tyrant').castTime || 
               this.getSoulShards() < 2),
        this.useRacials(),
        new bt.Action(() => bt.Status.Success)
      ),
      
      spell.cast('Power Siphon', on => me, req => spell.getCooldown('Summon Demonic Tyrant').timeleft < 15000),
      
      spell.cast('Ruination', this.getCurrentTarget, req => 
        this.getDreadstalkerRemainingTime() > this.getGcdMax() + spell.getSpell('Summon Demonic Tyrant').castTime && 
        (this.getSoulShards() === 5 || this.impDespawn)
      ),
      
      spell.cast('Infernal Bolt', this.getCurrentTarget, req => 
        !me.hasAura(auras.demonicCore) && 
        this.impDespawn > this.getTimePassed() + this.getGcdMax() * 2 + spell.getSpell('Summon Demonic Tyrant').castTime && 
        this.getSoulShards() < 3
      ),
      
      spell.cast('Shadow Bolt', this.getCurrentTarget, req => 
        this.wasPrevGcd('Call Dreadstalkers') && this.getSoulShards() < 4 && me.hasAura(auras.demonicCore)
      ),
      
      spell.cast('Shadow Bolt', this.getCurrentTarget, req => 
        this.wasPrevGcd(2, 'Call Dreadstalkers') && this.wasPrevGcd('Shadow Bolt') && 
        me.hasAura(auras.bloodlust) && this.getSoulShards() < 5
      ),
      
      spell.cast('Shadow Bolt', this.getCurrentTarget, req => 
        this.wasPrevGcd('Summon Vilefiend') && 
        (!me.hasAura(auras.demonicCalling) || this.wasPrevGcd(2, 'Grimoire Felguard'))
      ),
      
      spell.cast('Shadow Bolt', this.getCurrentTarget, req => 
        this.wasPrevGcd('Grimoire Felguard') && me.hasAura(auras.demonicCore) && 
        this.getAuraRemainingTime(auras.demonicCalling) > this.getGcdMax() * 3
      ),
      
      // Hand of Gul'dan with various imp despawn conditions
      spell.cast('Hand of Gul\'dan', this.getCurrentTarget, req => 
        this.impDespawn > this.getTimePassed() + this.getGcdMax() * 2 + spell.getSpell('Summon Demonic Tyrant').castTime && 
        !me.hasAura(auras.demonicCore) && me.hasAura('Demonic Art Pit Lord') && 
        this.impDespawn < this.getTimePassed() + this.getGcdMax() * 5 + spell.getSpell('Summon Demonic Tyrant').castTime
      ),
      
      spell.cast('Hand of Gul\'dan', this.getCurrentTarget, req => 
        this.impDespawn > this.getTimePassed() + this.getGcdMax() + spell.getSpell('Summon Demonic Tyrant').castTime && 
        this.impDespawn < this.getTimePassed() + this.getGcdMax() * 2 + spell.getSpell('Summon Demonic Tyrant').castTime && 
        this.getDreadstalkerRemainingTime() > this.getGcdMax() + spell.getSpell('Summon Demonic Tyrant').castTime && 
        this.getSoulShards() > 1
      ),
      
      spell.cast('Shadow Bolt', this.getCurrentTarget, req => 
        !me.hasAura(auras.demonicCore) && 
        this.impDespawn > this.getTimePassed() + this.getGcdMax() * 2 + spell.getSpell('Summon Demonic Tyrant').castTime && 
        this.impDespawn < this.getTimePassed() + this.getGcdMax() * 4 + spell.getSpell('Summon Demonic Tyrant').castTime && 
        this.getSoulShards() < 3 && 
        this.getAuraRemainingTime(auras.dreadstalkers) > this.getGcdMax() * 2 + spell.getSpell('Summon Demonic Tyrant').castTime
      ),
      
      // Grimoire Felguard timing for optimal setup
      spell.cast('Grimoire Felguard', this.getCurrentTarget, req => 
        spell.getCooldown('Summon Demonic Tyrant').timeleft < 13 + this.getGcdMax() && 
        spell.getCooldown('Summon Vilefiend').timeleft < this.getGcdMax() && 
        spell.getCooldown('Call Dreadstalkers').timeleft < this.getGcdMax() * 3.33 && 
        ((this.getSoulShards() === (5 - (this.getSoulStrikeCD() < this.getGcdMax() ? 1 : 0)) && 
          this.hasTalent('Fel Invocation')) || this.getSoulShards() === 5)
      ),
      
      // Summon Vilefiend timing
      spell.cast('Summon Vilefiend', this.getCurrentTarget, req => 
        (me.hasAura(auras.grimFelguard) || spell.getCooldown('Grimoire: Felguard').timeleft > 10000 || 
         !this.hasTalent('Grimoire Felguard')) && 
        spell.getCooldown('Summon Demonic Tyrant').timeleft < 13000 && 
        spell.getCooldown('Call Dreadstalkers').timeleft < this.getGcdMax() * 2.33 && 
        (this.getSoulShards() === 5 || (this.getSoulShards() === 4 && me.hasAura(auras.demonicCore)) || 
         me.hasAura(auras.grimFelguard))
      ),
      
      // Call Dreadstalkers timing
      spell.cast('Call Dreadstalkers', this.getCurrentTarget, req => 
        (!this.hasTalent('Summon Vilefiend') || me.hasAura(auras.vilefiend)) && 
        spell.getCooldown('Summon Demonic Tyrant').timeleft < 10000 && 
        this.getSoulShards() >= (5 - (me.hasAura(auras.demonicCore) ? 1 : 0)) || 
        this.wasPrevGcd(3, 'Grimoire Felguard')
      ),
      
      // Summon Demonic Tyrant when conditions are met
      spell.cast('Summon Demonic Tyrant', this.getCurrentTarget, req => 
        (this.impDespawn && this.impDespawn < this.getTimePassed() + this.getGcdMax() * 2 + spell.getSpell('Summon Demonic Tyrant').castTime) || 
        (me.hasAura(auras.dreadstalkers) && this.getDreadstalkerRemainingTime() < this.getGcdMax() * 2 + spell.getSpell('Summon Demonic Tyrant').castTime)
      ),
      
      // Hand of Gul'dan for soul shard management
      spell.cast('Hand of Gul\'dan', this.getCurrentTarget, req => 
        (this.impDespawn || me.hasAura(auras.dreadstalkers)) && this.getSoulShards() >= 3 || this.getSoulShards() === 5
      ),
      
      // Infernal Bolt if imps are about to despawn and low on soul shards
      spell.cast('Infernal Bolt', this.getCurrentTarget, req => 
        this.impDespawn && this.getSoulShards() < 3
      ),
      
      // Demonbolt with various conditions
      spell.cast('Demonbolt', this.getCurrentTarget, req => 
        this.impDespawn && me.hasAura(auras.demonicCore) && this.getSoulShards() < 4 || 
        (this.wasPrevGcd('Call Dreadstalkers') && this.getSoulShards() < 4 && me.hasAura(auras.demonicCore)) || 
        (me.hasAura(auras.demonicCore) && this.getSoulShards() < 4) || 
        (me.hasAura(auras.demonicCore) && spell.getCooldown('Power Siphon').timeleft < 5000)
      ),
      
      // Ruination with imps about to despawn or at max soul shards
      spell.cast('Ruination', this.getCurrentTarget, req => 
        this.impDespawn || (this.getSoulShards() === 5 && spell.getCooldown('Summon Vilefiend').timeleft > this.getGcdMax() * 3)
      ),
      
      // Default to Shadow Bolt
      spell.cast('Shadow Bolt', this.getCurrentTarget),
      
      // Fallback to Infernal Bolt
      spell.cast('Infernal Bolt', this.getCurrentTarget)
    );
  }
  
  // Racial abilities use
  useRacials() {
    return new bt.Selector(
      spell.cast('Berserking', on => me, req => me.hasAura(auras.tyrant) || this.getFightRemaining() < 22),
      spell.cast('Blood Fury', on => me, req => me.hasAura(auras.tyrant) || this.getFightRemaining() < 22),
      spell.cast('Fireblood', on => me, req => me.hasAura(auras.tyrant) || this.getFightRemaining() < 22),
      spell.cast('Ancestral Call', on => me, req => me.hasAura(auras.tyrant) || this.getFightRemaining() < 22)
    );
  }
  
  // Trinket usage logic
  useTrinkets() {
    return new bt.Action(() => {
      if (!Settings.DemoUseTrinkets) {
        return bt.Status.Failure;
      }
      
      // Here you would implement the complex trinket logic from the APL
      // This is a simplified placeholder
      return bt.Status.Failure;
    });
  }
  
  // Helper methods
  hasTalent(talentName) {
    if (talentName === 'Summon Vilefiend') {
      return Settings.DemoHasSummonVilefiend;
    } else if (talentName === 'Grimoire Felguard') {
      return Settings.DemoHasGrimoireFelguard;
    } else if (talentName === 'Fel Invocation') {
      return Settings.DemoHasFelInvocation;
    } else if (talentName === 'Sacrificed Souls') {
      return Settings.DemoHasSacrificedSouls;
    } else if (talentName === 'Doom') {
      return me.hasAura('Doom');
    } else if (talentName === 'Soul Strike') {
      return me.hasAura('Soul Strike');
    } else {
      return me.hasAura(talentName);
    }
  }
  
  wasPrevGcd(spellName, position = 1) {
    // Get the recent spell history with timestamps
    const spellHistory = spell.getLastSuccessfulSpells(10, true);
    
    // Validate position parameter
    if (position < 1 || position > spellHistory.length) {
      return false;
    }
    
    // Calculate the position from the end (most recent spells are at the end)
    const index = spellHistory.length - position;
    
    // Get the spell at the requested position
    const targetSpell = spellHistory[index];
    
    // If there's no spell at that position, return false
    if (!targetSpell) {
      return false;
    }
    
    // Check if the spell name matches (case-insensitive comparison)
    const spellMatches = targetSpell.spellName.toLowerCase() === spellName.toString().toLowerCase();
    
    // Debug information
    //console.log(`wasPrevGcd check: Looking for '${spellName}' at position ${position}, found '${targetSpell.spellName}', match: ${spellMatches}`);
    
    return spellMatches;
  }
  
  getGcdMax() {
    // Get the base GCD value (usually 1.5s without haste)
    return 1500 / (1 + (me.modSpellHaste / 100));
  }
  
  getSoulShards() {
    return me.powerByType(PowerType.SoulShards);
  }
  
  getSoulShardDeficit() {
    return 5 - this.getSoulShards();
  }
  
  getActiveEnemies(range = 10) {
    return combat.getUnitsAroundUnit(target, 5);
  }
  
  getFightRemaining() {
    const target = this.getCurrentTarget();
    //return target ? target.timeToDeath() : 0;
    return 500000;
  }
  
  getAuraRemainingTime(auraName) {
    const aura = me.getAura(auraName);
    return aura ? aura.timeleft : 0;
  }
  
  /**
 * Calculates the remaining time for Dreadstalkers by checking the object manager
 * @returns {number} Remaining time in milliseconds, or 0 if no Dreadstalkers are active
 */
  getDreadstalkerRemainingTime() {
    // If we don't have a stored expiration time, return 0
    if (!this.dreadstalkerExpirationTime) {
      return 0;
    }
    

    
    // If the Dreadstalkers have expired, reset the expiration time
    if (this.dreadstalkerExpirationTime === 0) {
      this.dreadstalkerExpirationTime = null;
    }
    
    const currentTime = Number(CombatTimer.getCombatTime());
  return Math.max(0, this.dreadstalkerExpirationTime - currentTime);
  }

/**
 * Alternative implementation that uses a tracker variable for Dreadstalker summons
 * This should be integrated into the class and called when Dreadstalkers are summoned
 */
trackDreadstalkerSummon() {
  // This would be called when "Call Dreadstalkers" is successfully cast
  this.lastDreadstalkerSummonTime = Number(CombatTimer.getCombatTime());
  this.dreadstalkerExpirationTime = this.lastDreadstalkerSummonTime + 12000; // 12 seconds duration
}

/**
 * Gets the remaining time of Dreadstalkers based on tracked summon time
 * This is a simpler approach if direct object detection doesn't work
 * @returns {number} Remaining time in milliseconds, or 0 if no Dreadstalkers are active
 */
getTrackedDreadstalkerRemainingTime() {
  if (!this.dreadstalkerExpirationTime) {
    return 0;
  }
  
  const currentTime = Number(CombatTimer.getCombatTime());
  return Math.max(0, this.dreadstalkerExpirationTime - currentTime);
}

/**
 * A comprehensive approach that combines both methods
 * @returns {number} Remaining time in milliseconds, or 0 if no Dreadstalkers are active
 */
getDreadstalkerRemainingTimeComprehensive() {
  // Try to detect Dreadstalkers in the world first
  const detectedTime = getDreadstalkerRemainingTime();
  
  // If detected, return that value
  if (detectedTime > 0) {
    return detectedTime;
  }
  
  // Otherwise, fall back to our tracking mechanism
  return getTrackedDreadstalkerRemainingTime();
}

getSoulStrikeCD()
{
    const soulStrikeSpell = wow.SpellBook.getSpellByName('Soul Strike');
    const cooldownTime = soulStrikeSpell ? soulStrikeSpell.cooldown.timeleft : 0;

    return cooldownTime;
}

  getSpellHaste() {
    return (1 + me.modSpellHaste / 100);
  }
  
  getTimePassed() {
    // Time since combat started in seconds
    return CombatTimer.getCombatTime();
  }
  
  // Angepasste getTwoCastImps() Funktion
getTwoCastImps() {
  // Diese Funktion sollte Wild Imps zurückgeben, die mindestens 2 Casts alt sind
  // Wir nutzen die neue getLastSuccessfulSpells() Funktion, um die Historie zu prüfen
  
  const recentSpells = spell.getLastSuccessfulSpells(5, true); // Mit Zeitstempel für Altersbestimmung
  const currentTime = wow.frameTime;
  const twoGcdsAgo = currentTime - (this.getGcdMax() * 2);
  
  // Zähle alle "Hand of Gul'dan" Casts, die älter als 2 GCDs sind
  const oldHandOfGuldanCasts = recentSpells.filter(
    castInfo => castInfo.spellName.toLowerCase() === 'hand of gul\'dan' && 
                castInfo.timestamp < twoGcdsAgo
  ).length;
  
  // Pro Hand of Gul'dan werden normalerweise 3-4 Imps beschworen
  // Wir verwenden einen Multiplikator von 3 für eine konservative Schätzung
  return oldHandOfGuldanCasts * 3;
}

// Angepasste getLastCastImps() Funktion
getLastCastImps() {
  // Diese Funktion sollte Wild Imps zurückgeben, die aus dem letzten Cast stammen
  const lastSpell = spell.getLastSuccessfulSpell();
  
  // Wenn der letzte Zauber "Hand of Gul'dan" war, gehen wir davon aus, dass 3-4 Imps beschworen wurden
  if (lastSpell && lastSpell.spellName.toLowerCase() === 'hand of gul\'dan') {
    // Verwenden eines Standardwerts von 3 Imps pro Hand of Gul'dan
    return 3;
  }
  
  return 0;
}
  
  getActivePets() {
    // Sucht alle Einheiten, die vom Spieler beschworen wurden
    let count = 0;
    
    // Durchsuche alle Objekte im ObjectManager
    objMgr.objects.forEach(obj => {
        // Prüfe, ob das Objekt eine Einheit ist
        if (obj instanceof wow.CGUnit) {
            // Prüfe, ob die Einheit vom Spieler beschworen wurde und ein Wild Imp ist
            if (obj.createdBy && 
                me.guid && 
                obj.createdBy.equals(me.guid)) {
                count++;
            }
        }
    });
    return count;
}
    // Dann für Wild Imps spezifisch:
    getActiveImps() {
      // Sucht alle Einheiten, die vom Spieler beschworen wurden
    let count = 0;
    
    // Durchsuche alle Objekte im ObjectManager
    objMgr.objects.forEach(obj => {
        // Prüfe, ob das Objekt eine Einheit ist
        if (obj instanceof wow.CGUnit) {
            // Prüfe, ob die Einheit vom Spieler beschworen wurde und ein Wild Imp ist
            if (obj.createdBy && 
                me.guid && 
                obj.createdBy.equals(me.guid) && 
                obj.name === 'Wild Imp') {
                count++;
            }
        }
    });
    return count;
        return count;
    }

    getActiveStalker() {
      // Sucht alle Einheiten, die vom Spieler beschworen wurden
    let count = 0;
    
    // Durchsuche alle Objekte im ObjectManager
    objMgr.objects.forEach(obj => {
        // Prüfe, ob das Objekt eine Einheit ist
        if (obj instanceof wow.CGUnit) {
            // Prüfe, ob die Einheit vom Spieler beschworen wurde und ein Wild Imp ist
            if (obj.createdBy && 
                me.guid && 
                obj.createdBy.equals(me.guid) && 
                obj.name === 'Dreadstalker') {
                count++;
            }
        }
    });
    return count > 0 ? true : false;
        
    }

  
  isRaidEventAddsExists() {
    // Check if raid event with adds exists
    // Simplified implementation
    return false;
  }

  debugTyrantStatus() {
    console.log("======= Tyrant Debug =======");
    console.log("Time Passed: " + this.getTimePassed());
    console.log("Aktive Imps: " + this.getActiveImps());
    console.log("Soul Shards: " + this.getSoulShards());
    console.log("Demonic Core Stacks: " + me.hasAura(auras.demonicCore));
    console.log("impDespawn Zeit: " + this.impDespawn);
    console.log("Im Opener : " + this.inOpener);
    console.log("==========================");
  }
}