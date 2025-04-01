import { Behavior, BehaviorContext } from '@/Core/Behavior';
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from '@/Core/Spell';
import Settings from '@/Core/Settings';
import { PowerType } from "@/Enums/PowerType";
import { me } from '@/Core/ObjectManager';
import { defaultCombatTargeting as combat } from '@/Targeting/CombatTargeting';

//STATUS : NEEDS TESTING

const auras = {
  demonSpikes: 203819,
  metamorphosis: 187827,
  fieryBrand: 207771,
  soulFragments: 203981,
  immolationAura: 258920,
  felblade: 232893,
  infernalStrike: 189110,
  soulCarver: 207407,
  fracture: 263642,
  spiritBomb: 247454,
  bulwark: 326853,
  feastingStrike: 391378,
  frailty: 247456
};

export class VengeanceDemonHunterBehavior extends Behavior {
  name = 'FW Vengeance Demon Hunter';
  context = BehaviorContext.Any;
  specialization = Specialization.DemonHunter.Vengeance;
  version = wow.GameVersion.Retail;

  static settings = [
    {
      header: 'Vengeance Settings',
      options: [
        { type: 'checkbox', uid: 'DHVengeanceUseCooldown', text: 'Use Defensive Cooldowns', default: true },
        { type: 'checkbox', uid: 'DHVengeanceUseOffensiveCooldown', text: 'Use Offensive Cooldowns', default: true },
        { type: 'slider', uid: 'DHVengeanceDemonSpikesThreshold', text: 'Demon Spikes HP Threshold', default: 80, min: 1, max: 100 },
        { type: 'slider', uid: 'DHVengeanceFieryBrandThreshold', text: 'Fiery Brand HP Threshold', default: 60, min: 1, max: 100 },
        { type: 'slider', uid: 'DHVengeanceMetamorphosisThreshold', text: 'Metamorphosis HP Threshold', default: 40, min: 1, max: 100 },
        { type: 'slider', uid: 'DHVengeanceSoulCleaveSoulFragments', text: 'Soul Cleave Min Soul Fragments', default: 3, min: 0, max: 5 },
      ],
    },
  ];

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForNotSitting(),
      new bt.Action(() => (this.getCurrentTarget() === null ? bt.Status.Success : bt.Status.Failure)),
      common.waitForTarget(),
      common.waitForFacing(),
      common.waitForCastOrChannel(),
      
      new bt.Decorator(
        ret => !spell.isGlobalCooldown(),
        new bt.Selector(
          spell.interrupt('Disrupt'),
          // Move defensiveCooldowns here to ensure it runs
          this.defensiveCooldowns(),

          new bt.Decorator(
            req => this.enemiesAroundMe(8) >= 3,
            new bt.Selector(
              this.aoe()
            )
          ),

          new bt.Decorator(
            req => this.enemiesAroundMe(8) < 3,
            new bt.Selector(
              this.singleTarget()
            )
          ),
        ),
      ),
    );
  }

  singleTarget() {
    return new bt.Selector(
      // Keep Sigil of Flame up
      spell.cast('Sigil of Flame', this.getCurrentTarget, () => 
        !this.getCurrentTarget().hasAura('Sigil of Flame')),
      
      // Use Fracture to generate Soul Fragments and Fury
      spell.cast('Fracture', this.getCurrentTarget, () => 
        me.hasAura('Fracture') && this.getSoulFragments() < 5),
      
      // Use Fel Devastation when available - strong damage and healing
      spell.cast('Fel Devastation', this.getCurrentTarget, () => 
        this.getFury() >= 50),
      
      // Use Spirit Bomb if we have enough Soul Fragments and the talent
      spell.cast('Spirit Bomb', this.getCurrentTarget, () => 
        me.hasAura('Spirit Bomb') && 
        this.getSoulFragments() >= 4),
      
      // Use Soul Cleave to consume Soul Fragments for healing and damage
      spell.cast('Soul Cleave', this.getCurrentTarget, () => 
        this.getFury() >= 30 && 
        this.getSoulFragments() >= Settings.DHVengeanceSoulCleaveSoulFragments),
      
      // Use Immolation Aura for AoE damage and Fury generation
      spell.cast('Immolation Aura', on => me),
      
      // Use Felblade to generate Fury and close distance
      spell.cast('Felblade', this.getCurrentTarget, () => 
        me.hasAura('Felblade') && this.getFury() < 80),
      
      // Infernal Strike for mobility and AoE damage
      spell.cast('Infernal Strike', this.getCurrentTarget, () => 
        spell.getCharges('Infernal Strike') >= 1),
      
      // Use Fel Devastation for damage and healing
      spell.cast('Fel Devastation', this.getCurrentTarget, () => 
        this.getFury() >= 50),
      
      // Throw Glaive as filler
      spell.cast('Throw Glaive', this.getCurrentTarget),
      
      // Shear as basic generator if not using Fracture
      spell.cast('Shear', this.getCurrentTarget, () => 
        !me.hasAura('Fracture')),
      
      // Soul Cleave as Fury dump
      spell.cast('Soul Cleave', this.getCurrentTarget, () => 
        this.getFury() >= 30),
    );
  }

  aoe() {
    return new bt.Selector(
      // Sigil of Flame for AoE damage and slow
      spell.cast('Sigil of Flame', this.getCurrentTarget),
      
      // Immolation Aura for AoE damage and Fury generation
      spell.cast('Immolation Aura', on => me),
      
      // Use Spirit Bomb if we have enough Soul Fragments and the talent - higher priority in AoE
      spell.cast('Spirit Bomb', this.getCurrentTarget, () => 
        me.hasAura('Spirit Bomb') && 
        this.getSoulFragments() >= 3),
      
      // Infernal Strike for mobility and AoE damage
      spell.cast('Infernal Strike', this.getCurrentTarget, () => 
        spell.getCharges('Infernal Strike') >= 1),
      
      // Use Fel Devastation for AoE damage and healing
      spell.cast('Fel Devastation', this.getCurrentTarget, () => 
        this.getFury() >= 50),
      
      // Use Fracture to generate Soul Fragments and Fury
      spell.cast('Fracture', this.getCurrentTarget, () => 
        me.hasAura('Fracture') && this.getSoulFragments() < 5),
      
      // Soul Cleave for AoE damage and soul fragment consumption
      spell.cast('Soul Cleave', this.getCurrentTarget, () => 
        this.getFury() >= 30 && 
        this.getSoulFragments() >= Settings.DHVengeanceSoulCleaveSoulFragments),
      
      // Use Felblade to generate Fury
      spell.cast('Felblade', this.getCurrentTarget, () => 
        me.hasAura('Felblade') && this.getFury() < 60),
      
      // Throw Glaive for AoE damage
      spell.cast('Throw Glaive', this.getCurrentTarget),
      
      // Shear as basic generator if not using Fracture
      spell.cast('Shear', this.getCurrentTarget, () => 
        !me.hasAura('Fracture')),
      
      // Soul Cleave as Fury dump
      spell.cast('Soul Cleave', this.getCurrentTarget, () => 
        this.getFury() >= 30),
    );
  }

  defensiveCooldowns() {
    return new bt.Selector(
      // Demon Spikes for physical damage mitigation
      spell.cast('Demon Spikes', on => me, () => 
        me.pctHealth <= Settings.DHVengeanceDemonSpikesThreshold && 
        !me.hasAura('Demon Spikes') && 
        this.useDefensiveCooldowns() &&
        spell.getCharges('Demon Spikes') >= 1),
      
      // Fiery Brand for major damage reduction on a single target
      spell.cast('Fiery Brand', this.getCurrentTarget, () => 
        me.pctHealth <= Settings.DHVengeanceFieryBrandThreshold && 
        !this.getCurrentTarget().hasAura('Fiery Brand') && 
        this.useDefensiveCooldowns()),
      
      // Metamorphosis for emergency damage reduction and healing
      spell.cast('Metamorphosis', on => me, () => 
        me.pctHealth <= Settings.DHVengeanceMetamorphosisThreshold && 
        !me.hasAura('Metamorphosis') && 
        this.useDefensiveCooldowns()),
      
      // Soul Barrier for shield if talented
      spell.cast('Soul Barrier', on => me, () => 
        me.hasAura('Soul Barrier') && 
        me.pctHealth <= 70 && 
        this.getSoulFragments() >= 2 && 
        this.useDefensiveCooldowns()),
      
      // Bulk Extraction to generate Soul Fragments in emergencies
      spell.cast('Bulk Extraction', on => me, () => 
        me.hasAura('Bulk Extraction') && 
        me.pctHealth <= 50 && 
        this.getSoulFragments() <= 1 && 
        this.useDefensiveCooldowns()),
      
      // Soul Cleave for emergency healing (higher priority during defensiveCooldowns)
      spell.cast('Soul Cleave', this.getCurrentTarget, () => 
        this.getFury() >= 30 && 
        me.pctHealth <= 60 && 
        this.getSoulFragments() >= 1),
      
      // Offensive cooldowns that also have defensive value (Metamorphosis can be both)
      spell.cast('Metamorphosis', on => me, () => 
        this.useOffensiveCooldowns() && 
        !this.useDefensiveCooldowns() && 
        !me.hasAura('Metamorphosis')),
      
      // Fel Devastation for healing and damage
      spell.cast('Fel Devastation', this.getCurrentTarget, () => 
        this.getFury() >= 50 && 
        me.pctHealth <= 70),
    );
  }

  hasTalent(talentName) {
    return me.hasAura(talentName);
  }

  useDefensiveCooldowns() {
    return Settings.DHVengeanceUseCooldown;
  }

  useOffensiveCooldowns() {
    return Settings.DHVengeanceUseOffensiveCooldown;
  }

  getFury() {
    return me.powerByType(PowerType.Fury);
  }

  getSoulFragments() {
    const aura = me.getAura('Soul Fragments');
    return aura ? aura.stacks : 0;
  }

  getCurrentTarget() {
    const targetPredicate = unit => common.validTarget(unit) && me.isFacing(unit);
    const target = me.target;
    if (target !== null && targetPredicate(target)) {
      return target;
    }
    return combat.targets.find(targetPredicate) || null;
  }

  getAuraRemainingTime(auraName) {
    const aura = me.getAura(auraName);
    return aura ? aura.remaining : 0;
  }

  getDebuffRemainingTime(debuffName) {
    const target = this.getCurrentTarget();
    if (!target) return 0;
    const debuff = target.getAura(debuffName);
    return debuff ? debuff.remaining : 0;
  }

  getDebuffStacks(debuffName) {
    const target = this.getCurrentTarget();
    if (!target) return 0;
    const debuff = target.getAura(debuffName);
    return debuff ? debuff.stacks : 0;
  }

  enemiesAroundMe(range) {
    return me.getUnitsAroundCount(range);
  }

  enemiesAroundTarget(range) {
    const target = this.getCurrentTarget();
    return target ? target.getUnitsAroundCount(range) : 0;
  }
  
  /**
   * Checks if we're in Metamorphosis form
   * @returns {boolean} - True if Metamorphosis is active
   */
  isMetamorphosisActive() {
    return me.hasAura('Metamorphosis');
  }
  
  /**
   * Checks if target has the Frailty debuff from Spirit Bomb
   * @returns {boolean} - True if target has Frailty debuff
   */
  hasFrailty() {
    const target = this.getCurrentTarget();
    return target && target.hasAura('Frailty');
  }
}