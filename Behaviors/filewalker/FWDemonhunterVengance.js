import { Behavior, BehaviorContext } from '@/Core/Behavior';
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import Common from '@/Core/Common';
import Spell from '@/Core/Spell';
import Settings from '@/Core/Settings';
import { PowerType } from "@/Enums/PowerType";
import { me } from '@/Core/ObjectManager';
import { defaultCombatTargeting as combat } from '@/Targeting/CombatTargeting';

export class VengeanceDemonHunterBehavior extends Behavior {
  name = 'FW Vengeance Demon Hunter';
  context = BehaviorContext.Any;
  specialization = Specialization.DemonHunter.Vengeance;
  version = wow.gameVersion;

  // Hero Talent detection constants
  static HERO_TALENTS = {
    ALDRACHI_REAVER: "Art of the Glaive", // Top talent for Aldrachi Reaver
    FEL_SCARRED: "Demonsurge",            // Top talent for Fel-Scarred
  };

        static settings = [
    {
      header: 'Vengeance Demon Hunter Settings',
      options: [
        { 
          uid: 'VengUseMetamorphosis', 
          text: 'Use Metamorphosis', 
          type: 'checkbox', 
          default: true 
        },
        { 
          uid: 'VengAOEThreshold', 
          text: 'AOE Threshold', 
          type: 'slider', 
          min: 2, 
          max: 8, 
          default: 3, 
          description: 'Number of enemies needed to use AOE abilities' 
        },
        { 
          uid: 'VengSpiritBombThreshold', 
          text: 'Spirit Bomb Min Targets', 
          type: 'slider', 
          min: 0, 
          max: 8, 
          default: 6,
          description: 'Minimum number of targets to use Spirit Bomb (0 to disable)' 
        },
        { 
          uid: 'VengFelbladeThreshold', 
          text: 'Felblade Fury Threshold', 
          type: 'slider', 
          min: 10, 
          max: 150, 
          default: 80,
          description: 'Use Felblade when below this Fury amount' 
        },
        { 
          uid: 'VengUseSigils', 
          text: 'Use Sigils', 
          type: 'checkbox', 
          default: true 
        },
        {
          uid: 'VengPreferFieryBrand',
          text: 'Optimize for Fiery Brand',
          type: 'checkbox',
          default: true,
          description: 'Optimize Fel Devastation and Soul Carver usage with Fiery Brand'
        }
      ],
    },
    {
      header: 'Defensive Settings',
      options: [
        { 
          uid: 'VengDefensiveThreshold', 
          text: 'Defensive Cooldown Health %', 
          type: 'slider', 
          min: 20, 
          max: 90, 
          default: 60 
        },
        { 
          uid: 'VengDemonSpikesCharges', 
          text: 'Demon Spikes Min Charges', 
          type: 'slider', 
          min: 0, 
          max: 2, 
          default: 1,
          description: 'Minimum charges to keep on Demon Spikes' 
        },
        { 
          uid: 'VengDemonSpikesThreshold', 
          text: 'Demon Spikes Health %', 
          type: 'slider', 
          min: 20, 
          max: 100, 
          default: 85 
        },
        { 
          uid: 'VengFieryBrandThreshold', 
          text: 'Fiery Brand Health %', 
          type: 'slider', 
          min: 20, 
          max: 100, 
          default: 70 
        },
        { 
          uid: 'VengMetamorphosisThreshold', 
          text: 'Metamorphosis Health %', 
          type: 'slider', 
          min: 20, 
          max: 80, 
          default: 50 
        }
      ]
    }
  ];

  build() {
    return new bt.Selector(
      Common.waitForCastOrChannel(),
      Common.waitForNotMounted(),
      new bt.Action(() => {
        if (!this.getCurrentTarget()) return bt.Status.Success;
        
        // Log detected hero talent path for debugging (only once when target changes)
        if (this._lastTarget !== this.getCurrentTarget()) {
          this._lastTarget = this.getCurrentTarget();
          const heroTalent = this.detectHeroTalent();
          if (heroTalent) {
            console.info(`Detected Hero Talent: ${heroTalent}`);
          } else {
            console.info("No Hero Talent detected. Using default rotation.");
          }
        }
        
        return bt.Status.Failure;
      }),
      Common.waitForTarget(),
      Common.waitForFacing(),
      Common.ensureAutoAttack(),

      new bt.Selector(
        this.defensives(),
        
        new bt.Decorator(
          () => !Spell.isGlobalCooldown(),
          new bt.Selector(
            // Interrupt with priority
            Spell.interrupt('Disrupt'),
            
            // Main rotation selector
            new bt.Selector(
              this.aldrachiReaverRotation(),
              this.felScarredRotation(),
            ),
            
          )
        )
      )
    );
  }

  // Defensive cooldown usage
  defensives() {
    return new bt.Decorator(
      () => !Spell.isGlobalCooldown(),
      new bt.Selector(
        // Demon Spikes for physical damage mitigation
        Spell.cast('Demon Spikes', () => me, () => 
          me.pctHealth <= Settings.VengDemonSpikesThreshold && 
          !me.hasAura('Demon Spikes') && 
          Spell.getCharges('Demon Spikes') > Settings.VengDemonSpikesCharges),
        
        // Fiery Brand for major damage reduction
        Spell.cast('Fiery Brand', this.getCurrentTarget, () => 
          me.pctHealth <= Settings.VengFieryBrandThreshold && 
          this.getCurrentTarget() && 
          !this.getCurrentTarget().hasAuraByMe('Fiery Brand')),
        
        // Metamorphosis for emergency damage reduction and healing
        Spell.cast('Metamorphosis', () => me, () => 
          Settings.VengUseMetamorphosis && 
          me.pctHealth <= Settings.VengMetamorphosisThreshold && 
          !me.hasAura('Metamorphosis')),
        
        // Fel Devastation for healing when low health
        Spell.cast('Fel Devastation', this.getCurrentTarget, () => 
          me.pctHealth <= Settings.VengDefensiveThreshold && 
          this.getFury() >= 50),
        
        // Soul Cleave for emergency healing
        Spell.cast('Soul Cleave', this.getCurrentTarget, () => 
          me.pctHealth <= Settings.VengDefensiveThreshold && 
          this.getFury() >= 30)
      )
    );
  }

  // Aldrachi Reaver rotation
  aldrachiReaverRotation() {
    return new bt.Decorator(
      () => this.isAldrachiReaver(),
      new bt.Selector(
        // Use Reaver's Glaive when we have 20 stacks of Art of the Glaive
        // Spell.cast("Reaver's Glaive", this.getCurrentTarget, () => this.canUseReaversGlaive()),
        Spell.cast("Reaver's Glaive", this.getCurrentTarget, () => this.getArtOfTheGlaiveProc()),
        
        // Check for Reaver's Glaive empowerment
        new bt.Decorator(
          () => me.hasAura("Reaver's Glaive"),
          new bt.Selector(
            // Use Fracture Empowered by Reaver's Glaive
            Spell.cast('Fracture', this.getCurrentTarget),
            
            // Use Soul Cleave Empowered by Reaver's Glaive
            Spell.cast('Soul Cleave', this.getCurrentTarget, () => this.getFury() >= 30)
          )
        ),
        
        // Use The Hunt if talented
        Spell.cast('The Hunt', this.getCurrentTarget, () => Spell.isSpellKnown('The Hunt')),
        
        // Use Sigil of Spite if talented
        Spell.cast('Sigil of Spite', this.getCurrentTarget, () => 
          Settings.VengUseSigils && Spell.isSpellKnown('Sigil of Spite')),
        
        // Fiery Brand if no targets have it
        Spell.cast('Fiery Brand', this.getCurrentTarget, () => 
          this.getCurrentTarget() && !this.getCurrentTarget().hasAuraByMe('Fiery Brand')),
        
        // Soul Carver with Fiery Brand synergy
        Spell.cast('Soul Carver', this.getCurrentTarget, () => 
          !Settings.VengPreferFieryBrand || (
            this.getCurrentTarget() && 
            this.getCurrentTarget().hasAuraByMe('Fiery Brand') && 
            this.getRemainingTime(this.getCurrentTarget(), 'Fiery Brand') > 3000
          )),
        
        // Fel Devastation with Fiery Brand synergy
        Spell.cast('Fel Devastation', this.getCurrentTarget, () => 
          this.getFury() >= 50 && (
            !Settings.VengPreferFieryBrand || (
              this.getCurrentTarget() && 
              this.getCurrentTarget().hasAuraByMe('Fiery Brand') && 
              this.getRemainingTime(this.getCurrentTarget(), 'Fiery Brand') > 2000
            )
          )),
        
        // Sigil of Flame
        Spell.cast('Sigil of Flame', this.getCurrentTarget, () => Settings.VengUseSigils),
        
        // Immolation Aura
        Spell.cast('Immolation Aura'),
        
        // Spirit Bomb with enough soul fragments and targets
        Spell.cast('Spirit Bomb', this.getCurrentTarget, () => 
          Settings.VengSpiritBombThreshold > 0 && 
          this.getEnemyCount() >= Settings.VengSpiritBombThreshold),
        
        // Fracture if close to max charges
        Spell.cast('Fracture', this.getCurrentTarget, () => 
          Spell.getCharges('Fracture') > 1.7),
        
        // Felblade for Fury generation
        Spell.cast('Felblade', this.getCurrentTarget, () => 
          this.getFury() < Settings.VengFelbladeThreshold),
        
        // Soul Cleave to spend Fury
        Spell.cast('Soul Cleave', this.getCurrentTarget, () => this.getFury() >= 30),
        
        // Fracture for Soul Fragments and Fury
        Spell.cast('Fracture', this.getCurrentTarget),
        
        // Throw Glaive as filler
        Spell.cast('Throw Glaive', this.getCurrentTarget),
        
        // Regular auto-attacks
        new bt.Action(() => bt.Status.Success)
      )
    );
  }

  // Fel-Scarred rotation
  felScarredRotation() {
    return new bt.Decorator(
      () => this.isFelScarred(),
      new bt.Selector(
        // Use Metamorphosis after Fel Devastation cycle
        Spell.cast('Metamorphosis', () => me, () => 
          Settings.VengUseMetamorphosis && 
          !me.hasAura('Metamorphosis') && 
          Spell.getTimeSinceLastCast('Fel Devastation') < 5000),
        
        // Handle any Empowered abilities during Metamorphosis
        new bt.Decorator(
          () => me.hasAura('Metamorphosis'),
          new bt.Selector(
            // Priority to empowered abilities
            Spell.cast('Fel Devastation', this.getCurrentTarget, () => this.getFury() >= 50),
            Spell.cast('Immolation Aura')
          )
        ),
        
        // Use The Hunt if talented
        Spell.cast('The Hunt', this.getCurrentTarget, () => Spell.isSpellKnown('The Hunt')),
        
        // Use Sigil of Spite if talented
        Spell.cast('Sigil of Spite', this.getCurrentTarget, () => 
          Settings.VengUseSigils && Spell.isSpellKnown('Sigil of Spite')),
        
        // Fiery Brand if no targets have it
        Spell.cast('Fiery Brand', this.getCurrentTarget, () => 
          this.getCurrentTarget() && !this.getCurrentTarget().hasAuraByMe('Fiery Brand')),
        
        // Soul Carver with Fiery Brand synergy
        Spell.cast('Soul Carver', this.getCurrentTarget, () => 
          !Settings.VengPreferFieryBrand || (
            this.getCurrentTarget() && 
            this.getCurrentTarget().hasAuraByMe('Fiery Brand') && 
            this.getRemainingTime(this.getCurrentTarget(), 'Fiery Brand') > 3000
          )),
        
        // Fel Devastation with Fiery Brand synergy
        Spell.cast('Fel Devastation', this.getCurrentTarget, () => 
          this.getFury() >= 50 && (
            !Settings.VengPreferFieryBrand || (
              this.getCurrentTarget() && 
              this.getCurrentTarget().hasAuraByMe('Fiery Brand') && 
              this.getRemainingTime(this.getCurrentTarget(), 'Fiery Brand') > 2000
            )
          )),
        
        // Sigil of Flame (special logic for Illuminated Sigils)
        Spell.cast('Sigil of Flame', this.getCurrentTarget, () => 
          Settings.VengUseSigils && (
            !Spell.isSpellKnown('Illuminated Sigils') || 
            !me.hasAura('Student of Suffering')
          )),
        
        // Immolation Aura
        Spell.cast('Immolation Aura'),
        
        // Spirit Bomb with enough soul fragments and targets
        Spell.cast('Spirit Bomb', this.getCurrentTarget, () => 
          Settings.VengSpiritBombThreshold > 0 && 
          this.getEnemyCount() >= Settings.VengSpiritBombThreshold),
        
        // Fracture if close to max charges
        Spell.cast('Fracture', this.getCurrentTarget, () => 
          Spell.getCharges('Fracture') > 1.7),
        
        // Felblade for Fury generation (higher threshold for Fel-Scarred)
        Spell.cast('Felblade', this.getCurrentTarget, () => 
          this.getFury() < 130),
        
        // Soul Cleave to spend Fury
        Spell.cast('Soul Cleave', this.getCurrentTarget, () => this.getFury() >= 30),
        
        // Fracture for Soul Fragments and Fury
        Spell.cast('Fracture', this.getCurrentTarget),
        
        // Throw Glaive as filler
        Spell.cast('Throw Glaive', this.getCurrentTarget),
        
        // Regular auto-attacks
        new bt.Action(() => bt.Status.Success)
      )
    );
  }
  defaultRotation() {
    return new bt.Decorator(
      () => this.isAldrachiReaver(),
      new bt.Selector(
        // Use Reaver's Glaive when we have 20 stacks of Art of the Glaive
        // Spell.cast("Reaver's Glaive", this.getCurrentTarget, () => this.canUseReaversGlaive()),
        Spell.cast("Reaver's Glaive", this.getCurrentTarget, () => this.getArtOfTheGlaiveProc()),
        
        // Check for Reaver's Glaive empowerment
        new bt.Decorator(
          () => me.hasAura("Reaver's Glaive"),
          new bt.Selector(
            // Use Fracture Empowered by Reaver's Glaive
            Spell.cast('Fracture', this.getCurrentTarget),
            
            // Use Soul Cleave Empowered by Reaver's Glaive
            Spell.cast('Soul Cleave', this.getCurrentTarget, () => this.getFury() >= 30)
          )
        ),
        
        // Use The Hunt if talented
        Spell.cast('The Hunt', this.getCurrentTarget, () => Spell.isSpellKnown('The Hunt')),
        
        // Use Sigil of Spite if talented
        Spell.cast('Sigil of Spite', this.getCurrentTarget, () => 
          Settings.VengUseSigils && Spell.isSpellKnown('Sigil of Spite')),
        
        // Fiery Brand if no targets have it
        Spell.cast('Fiery Brand', this.getCurrentTarget, () => 
          this.getCurrentTarget() && !this.getCurrentTarget().hasAuraByMe('Fiery Brand')),
        
        // Soul Carver with Fiery Brand synergy
        Spell.cast('Soul Carver', this.getCurrentTarget, () => 
          !Settings.VengPreferFieryBrand || (
            this.getCurrentTarget() && 
            this.getCurrentTarget().hasAuraByMe('Fiery Brand') && 
            this.getRemainingTime(this.getCurrentTarget(), 'Fiery Brand') > 3000
          )),
        
        // Fel Devastation with Fiery Brand synergy
        Spell.cast('Fel Devastation', this.getCurrentTarget, () => 
          this.getFury() >= 50 && (
            !Settings.VengPreferFieryBrand || (
              this.getCurrentTarget() && 
              this.getCurrentTarget().hasAuraByMe('Fiery Brand') && 
              this.getRemainingTime(this.getCurrentTarget(), 'Fiery Brand') > 2000
            )
          )),
        
        // Sigil of Flame
        Spell.cast('Sigil of Flame', this.getCurrentTarget, () => Settings.VengUseSigils),
        
        // Immolation Aura
        Spell.cast('Immolation Aura'),
        
        // Spirit Bomb with enough soul fragments and targets
        Spell.cast('Spirit Bomb', this.getCurrentTarget, () => 
          Settings.VengSpiritBombThreshold > 0 && 
          this.getEnemyCount() >= Settings.VengSpiritBombThreshold),
        
        // Fracture if close to max charges
        Spell.cast('Fracture', this.getCurrentTarget, () => 
          Spell.getCharges('Fracture') > 1.7),
        
        // Felblade for Fury generation
        Spell.cast('Felblade', this.getCurrentTarget, () => 
          this.getFury() < Settings.VengFelbladeThreshold),
        
        // Soul Cleave to spend Fury
        Spell.cast('Soul Cleave', this.getCurrentTarget, () => this.getFury() >= 30),
        
        // Fracture for Soul Fragments and Fury
        Spell.cast('Fracture', this.getCurrentTarget),
        
        // Throw Glaive as filler
        Spell.cast('Throw Glaive', this.getCurrentTarget),
        
        // Regular auto-attacks
        new bt.Action(() => bt.Status.Success)
      )
    );
  }

  // Helper methods
  getCurrentTarget() {
    if (me.targetUnit && me.canAttack(me.targetUnit) && !me.targetUnit.deadOrGhost) {
      return me.targetUnit;
    }
    return combat.bestTarget;
  }

  isAldrachiReaver() {
    return this.hasTalent(VengeanceDemonHunterBehavior.HERO_TALENTS.ALDRACHI_REAVER);
  }

  isFelScarred() {
    return this.hasTalent(VengeanceDemonHunterBehavior.HERO_TALENTS.FEL_SCARRED);
  }
  
  // Returns the current hero talent path or null if none is detected
  detectHeroTalent() {
    if (this.hasTalent(VengeanceDemonHunterBehavior.HERO_TALENTS.ALDRACHI_REAVER)) {
      return "Aldrachi Reaver";
    } else if (this.hasTalent(VengeanceDemonHunterBehavior.HERO_TALENTS.FEL_SCARRED)) {
      return "Fel-Scarred";
    } else {
      return null; // No hero talent detected
    }
  }

  hasTalent(talentName) {
    // We check in three different ways to be thorough:
    // 1. Direct spell knowledge check
    // 2. Aura presence check (many talents apply passive auras)
    // 3. Spell book check for abilities granted by talents
    return Spell.isSpellKnown(talentName) || 
           me.hasAura(talentName) ||
           (talentName === VengeanceDemonHunterBehavior.HERO_TALENTS.ALDRACHI_REAVER && 
            Spell.isSpellKnown("Reaver's Glaive")) ||
           (talentName === VengeanceDemonHunterBehavior.HERO_TALENTS.FEL_SCARRED && 
            Spell.isSpellKnown("Demonsurge"));
  }

  getFury() {
    return me.powerByType(PowerType.Fury);
  }

  getSoulFragments() {
    // Soul Fragments are now physical orbs, not an aura
    // We can track them through various game mechanics
    // For gameplay purposes, we can use distance-based detection
    // or infer from related abilities
    
    // Count nearby soul fragments as entities
    const soulFragments = me.getUnitsAroundCount(15).filter(unit => 
      unit.entryId === 177795 || // Soul Fragment entity ID
      unit.name === "Soul Fragment" || 
      unit.name.includes("Soul Fragment")
    ).length;
    
    return soulFragments || 0; // Return 0 if none found
  }

  getArtOfTheGlaiveProc() {
    // Check for Art of the Glaive aura stacks
    return Spell.getSpell("Throw Glaive").overrideId == 442294 ? true : false;
  }
  
  canUseReaversGlaive() {
    // Check if we have 20 stacks of Art of the Glaive
    return this.getArtOfTheGlaiveStacks() >= 20 && this.isAldrachiReaver();
  }

  getRemainingTime(unit, auraName) {
    if (!unit) return 0;
    const aura = unit.getAuraByMe(auraName);
    return aura ? aura.remaining : 0;
  }

  getEnemyCount() {
    return me.getUnitsAroundCount(8);
  }
}