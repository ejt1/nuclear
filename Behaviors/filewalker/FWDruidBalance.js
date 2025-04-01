import { Behavior, BehaviorContext } from '@/Core/Behavior';
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from '@/Core/Spell';
import Settings from '@/Core/Settings';
import { PowerType } from "@/Enums/PowerType";
import { me } from '@/Core/ObjectManager';
import { defaultCombatTargeting as combat } from '@/Targeting/CombatTargeting';

// STATUS : DONE

const auras = {
	solareclipse : 48517,
  lunareclipse : 48518,
};

class AlwaysSucceed extends bt.Composite {
  constructor() {
    super();

    
  }

  tick() {
    return bt.Status.Success;
  }
}

export class BalanceDruidBehavior extends Behavior {
  name = 'Balance Druid';
  context = BehaviorContext.Any;
  specialization = Specialization.Druid.Balance;
  version = wow.GameVersion.Retail;

  static settings = [
    {
      header: 'Cooldowns',
      options: [
        { type: 'checkbox', uid: 'DruidBalanceUseCooldown', text: 'Use Cooldowns', default: true },
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
        spell.interrupt('Solar Beam'),
        this.preCombatCooldowns(),

        new bt.Decorator(
          req => this.enemiesAroundTarget(5) >= 5,
          this.multiTarget(),
            new bt.Action(() => bt.Status.Success)
        ),

        new bt.Decorator(
          req => this.enemiesAroundTarget(5) <= 3,
          this.st(),
            new bt.Action(() => bt.Status.Success)
        ),

        
        //spell.cast('Wrath', this.getCurrentTarget),
      ),
      ),
    );
  }

  st() {
    return new bt.Selector(
      // actions.st=warrior_of_elune,if=talent.lunar_calling|!talent.lunar_calling&variable.eclipse_remains<=7
      spell.cast('Warrior of Elune', this.getCurrentTarget, () => this.hasTalent('Lunar Calling') || (!this.hasTalent('Lunar Calling') && (this.solarRemains() <= 7000 || this.lunarRemains <= 7000))),
  
     // actions.st+=/starsurge,if=astral_power.deficit<variable.passive_asp+action.wrath.energize_amount+(action.starfire.energize_amount+variable.passive_asp)*(buff.eclipse_solar.remains<(gcd.max*3))
     spell.cast('Starsurge', this.getCurrentTarget, () =>
      this.astralPowerDeficit() < this.passiveAsp() + this.energizeAmount('Wrath') +
      ((this.energizeAmount('Starfire') + this.passiveAsp()) * (this.solarRemains() < (this.getGCD() * 3) ? 1 : 0))
    ),

      // actions.st+=/wrath,if=variable.enter_lunar&eclipse.in_eclipse&variable.eclipse_remains<cast_time&!variable.cd_condition
      spell.cast('Wrath', this.getCurrentTarget, req => this.inSolar() && this.solarRemains() >= spell.getSpell('Wrath').castTime),
  
      // actions.st+=/starfire,if=!variable.enter_lunar&eclipse.in_eclipse&variable.eclipse_remains<cast_time&!variable.cd_condition
      spell.cast('Starfire', this.getCurrentTarget, req => this.inLunar() && this.lunarRemains() >= spell.getSpell('Starfire').castTime),
  
      // actions.st+=/sunfire,target_if=remains<3|refreshable&(hero_tree.keeper_of_the_grove&cooldown.force_of_nature.ready|hero_tree.elunes_chosen&variable.cd_condition)
      spell.cast('Sunfire', this.getCurrentTarget, req => (this.getDebuffRemainingTime('Sunfire') < 3000 && ((this.hasTalent('Keeper of the Grove') && this.getCooldown('Force of Nature').ready) || (this.hasTalent('Elunes Chosen') && this.hasCooldownsReady())))),
  
      // actions.st+=/moonfire,target_if=remains<3&(!talent.treants_of_the_moon|cooldown.force_of_nature.remains>3&!buff.harmony_of_the_grove.up)
      spell.cast('Moonfire', this.getCurrentTarget, req => this.getDebuffRemainingTime('Moonfire') > 3000 && (!this.hasTalent('Treants of the Moon') || (spell.getCooldown('Force of Nature').remaining > 3000 && !me.hasAura('Harmony of the Grove')))),
  
      // actions.st+=/call_action_list,name=pre_cd
      this.preCombatCooldowns(),
  
      this.Cooldowns(),  
      
      // // actions.st+=/wrath,if=variable.enter_lunar&(eclipse.in_none|variable.eclipse_remains<cast_time)
      spell.cast('Wrath', this.getCurrentTarget, () => this.inNoEclipse() || this.solarRemains() > spell.getSpell('Wrath').castTime),
  
      // // actions.st+=/starfire,if=!variable.enter_lunar&(eclipse.in_none|variable.eclipse_remains<cast_time)
      spell.cast('Starfire', this.getCurrentTarget, () => this.inNoEclipse() || this.lunarRemains() > spell.getSpell('Starfire').castTime),
  
      // actions.st+=/starsurge,if=variable.cd_condition&astral_power.deficit>variable.passive_asp+action.force_of_nature.energize_amount
      spell.cast('Starsurge', this.getCurrentTarget, () => this.cdCondition() && this.astralPowerDeficit() > this.passiveAsp() + this.energizeAmount('Force of Nature')),
  
      // actions.st+=/force_of_nature
      spell.cast('Force of Nature', this.getCurrentTarget),
  
      // actions.st+=/fury_of_elune,if=5+variable.passive_asp<astral_power.deficit
      spell.cast('Fury of Elune', this.getCurrentTarget, () => 5 + this.passiveAsp() < this.astralPowerDeficit()),
  
      // actions.st+=/starfall,if=buff.starweavers_warp.up
      spell.cast('Starfall', this.getCurrentTarget, () => me.hasAura('Starweaver\'s Warp')),
  
      // actions.st+=/starsurge,if=talent.starlord&buff.starlord.stack<3
      spell.cast('Starsurge', this.getCurrentTarget, () => this.hasTalent('Starlord') && me.getAuraStacks('Starlord') < 3),
  
      // actions.st+=/sunfire,target_if=refreshable
      spell.cast('Sunfire', this.getCurrentTarget, () => !this.getCurrentTarget().hasAura('Sunfire') && this.getDebuffRemainingTime('Sunfire') > 3000),
  
      // actions.st+=/moonfire,target_if=refreshable&(!talent.treants_of_the_moon|cooldown.force_of_nature.remains>3&!buff.harmony_of_the_grove.up)
      spell.cast('Moonfire', this.getCurrentTarget, () => !this.getCurrentTarget().hasAura('Sunfire') && this.getDebuffRemainingTime('Moonfire') > 3000 && (!this.hasTalent('Treants of the Moon') || (spell.getCooldown('Force of Nature').timeleft > 3000 && !me.hasAura('Harmony of the Grove')))),
  
      // actions.st+=/stellar_flare,target_if=refreshable
      spell.cast('Stellar Flare', this.getCurrentTarget, () => !this.getCurrentTarget().hasAura('Stellar Flare') && this.getDebuffRemainingTime('Stellar Flare') < 2500),
  
      // actions.st+=/convoke_the_spirits,if=variable.convoke_condition
      spell.cast('Convoke the Spirits', this.getCurrentTarget, () => spell.getCooldown('Convoke the Spirits').ready),
  
      // actions.st+=/new_moon
      spell.cast('New Moon', this.getCurrentTarget),
  
      // actions.st+=/half_moon
      spell.cast('Half Moon', this.getCurrentTarget),
  
      // actions.st+=/full_moon
      spell.cast('Full Moon', this.getCurrentTarget),
  
      // actions.st+=/wild_mushroom
      spell.cast('Wild Mushroom', this.getCurrentTarget, () => this.dotRemains('Fungal Growth') < 2000),
  
      // actions.st+=/starfire,if=talent.lunar_calling
      spell.cast('Starfire', this.getCurrentTarget, () => this.hasTalent('Lunar Calling')),
  
      // actions.st+=/wrath
      spell.cast('Wrath', this.getCurrentTarget)
    );
  }

  multiTarget() {
    return new bt.Selector(
      // actions.st+=/wrath,if=variable.enter_lunar&eclipse.in_eclipse&variable.eclipse_remains<cast_time&!variable.cd_condition
      spell.cast('Wrath', this.getCurrentTarget, () => this.inSolar() && !this.inLunar() && this.solarRemains() > spell.getSpell('Wrath').castTime),
  
      // actions.st+=/starfire,if=!variable.enter_lunar&eclipse.in_eclipse&variable.eclipse_remains<cast_time&!variable.cd_condition
      spell.cast('Starfire', this.getCurrentTarget, () => !this.inSolar() && this.inLunar() && this.lunarRemains() > spell.getSpell('Starfire').castTime),
  
      // actions.aoe+=/starfall,if=astral_power.deficit<=variable.passive_asp+6
      spell.cast('Starfall', this.getCurrentTarget, () => this.astralPowerDeficit() <= this.passiveAsp() + 6),

      // actions.aoe+=/moonfire,target_if=refreshable&(target.time_to_die-remains)>6
      spell.cast('Moonfire', this.getCurrentTarget, () => this.getDebuffRemainingTime('Moonfire') < 6000),

      // actions.aoe+=/sunfire,target_if=refreshable&(target.time_to_die-remains)>6-(spell_targets%2)
      spell.cast('Sunfire', this.getCurrentTarget, () => this.getDebuffRemainingTime('Sunfire') < 6000),

      // actions.aoe+=/stellar_flare,target_if=refreshable
      spell.cast('Stellar Flare', this.getCurrentTarget, () => this.getDebuffRemainingTime('Stellar Flare') < 7000),

      // actions.aoe+=/force_of_nature
      spell.cast('Force of Nature', this.getCurrentTarget, () => spell.getCooldown('Force of Nature').ready),

      // actions.aoe+=/fury_of_elune,if=eclipse.in_eclipse
      spell.cast('Fury of Elune', this.getCurrentTarget, () => this.inEclipse()),

      // actions.aoe+=/call_action_list,name=pre_cd
      this.preCombatCooldowns(),
      this.Cooldowns(), 

      // actions.aoe+=/warrior_of_elune
      spell.cast('Warrior of Elune', this.getCurrentTarget, () => this.hasTalent('Lunar Calling') || this.solarRemains() < 7000),

      // actions.aoe+=/starfall,if=buff.starweavers_warp.up|buff.touch_the_cosmos.up
      spell.cast('Starfall', this.getCurrentTarget, () => me.hasAura('Starweaver\'s Warp') || me.hasAura('Touch the Cosmos')),

      // actions.aoe+=/starsurge,if=buff.starweavers_weft.up
      spell.cast('Starsurge', this.getCurrentTarget, () => me.hasAura('Starweaver\'s Weft')),

      // actions.aoe+=/convoke_the_spirits
      spell.cast('Convoke the Spirits', this.getCurrentTarget, () => spell.getCooldown('Convoke the Spirits').ready),

      // actions.aoe+=/new_moon
      spell.cast('New Moon', this.getCurrentTarget),

      // actions.aoe+=/half_moon
      spell.cast('Half Moon', this.getCurrentTarget),

      // actions.aoe+=/full_moon
      spell.cast('Full Moon', this.getCurrentTarget),

      // actions.aoe+=/wild_mushroom
      // spell.cast('Wild Mushroom', this.getCurrentTarget, () => !this.prevGcd('Wild Mushroom') && !this.getCurrentTarget().hasAura('Fungal Growth')),

      // actions.aoe+=/starfire
      spell.cast('Starfire', this.getCurrentTarget, () => this.hasTalent('Lunar Calling') || (this.inLunar() && this.enemiesAroundTarget(10) > 1)),

      // actions.st+=/starfire,if=!variable.enter_lunar&eclipse.in_eclipse&variable.eclipse_remains<cast_time&!variable.cd_condition
      spell.cast('Starfire', this.getCurrentTarget, () => !this.inSolar() && !this.inLunar()),

      // actions.aoe+=/wrath
      spell.cast('Wrath', this.getCurrentTarget)
    );
}


  preCombatCooldowns() {
    return new bt.Selector(
      spell.cast('Force of Nature', this.getCurrentTarget, () => this.useCooldowns()),
      spell.cast('Berserking', on => me, () => this.useCooldowns()),
    );
  }

  Cooldowns() {
    return new bt.Selector(
      // actions.st+=/celestial_alignment,if=variable.cd_condition
      spell.cast('Celestial Alignment', on => me, () => this.useCooldowns()),
  
      // actions.st+=/incarnation,if=variable.cd_condition
      spell.cast('Incarnation: Chosen of Elune', on => me), () => this.useCooldowns(),
  
      // actions.st+=/celestial_alignment,if=variable.cd_condition
      spell.cast('Convoke the Spirits', this.getCurrentTarget, () => this.useCooldowns()),
    );
  }
  hasTalent(talentName) {
    return me.hasAura(talentName);
  }

  useCooldowns() {
    return Settings.BalanceUseCooldown;
  }

  findMoonfireTarget() {
    const moonFireTarget = combat.targets.find(unit => !unit.hasAuraByMe("Moonfire"));
    return moonFireTarget ? moonFireTarget : false;
  }

  findSunfireTarget() {
    const moonFireTarget = combat.targets.find(unit => !unit.hasAuraByMe("Sunfire"));
    return moonFireTarget ? moonFireTarget : false;
  }

  inLunar() {
    const inLunar = me.auras.find(aura => aura.name.includes("Eclipse (Lunar)") && aura.remaining > 1000) !== undefined;
    console.debug('IN Lunar ' + inLunar)
    return me.auras.find(aura => aura.name.includes("Eclipse (Lunar)") && aura.remaining > 1000) !== undefined;
  }

  inSolar() {
    const inSolar = me.auras.find(aura => aura.name.includes("Eclipse (Solar)") && aura.remaining > 1000) !== undefined;
    console.debug('IN Solar ' + inSolar)
    return me.auras.find(aura => aura.name.includes("Eclipse (Solar)") && aura.remaining > 1000) !== undefined;
  }

// Subroutinen für benötigte Bedingungen und Parameter
enterLunar() {
  return me.hasAura('Entering Lunar Eclipse');
}

inEclipse() {
  const lunareclipse = me.auras.find(aura => aura.name.includes("Eclipse (Lunar)") && aura.remaining > 1000) !== undefined;
  const solareclipse = me.auras.find(aura => aura.name.includes("Eclipse (Solar)") && aura.remaining > 1000) !== undefined;
  const eclipse = solareclipse || lunareclipse !== null ? true : false;
  return eclipse;
}

inNoEclipse() {

  const lunareclipse = me.auras.find(aura => aura.name.includes("Eclipse (Lunar)") && aura.remaining > 1000) !== undefined;
  const solareclipse = me.auras.find(aura => aura.name.includes("Eclipse (Solar)") && aura.remaining > 1000) !== undefined;
  const noeclipse = solareclipse || lunareclipse !== null ? false : true;
  return noeclipse;
}

hasCooldownsReady() {
  return (
    spell.getCooldown('Celestial Alignment').ready ||
    spell.getCooldown('Incarnation: Chosen of Elune').ready
  );
}

eclipseRemains() {
  const solartimer = this.getAuraById(auras.solareclipse);
  const lunartimer = this.getAuraById(auras.lunareclipse);
  return Math.max(lunartimer.remaining, solartimer.remaining);
}

solarRemains() {
  const solartime = this.getAuraById(auras.solareclipse);
  // console.debug('Solar ' + solartime.remaining)
  return solartime.remaining;
}

lunarRemains() {
  const lunartime = this.getAuraById(auras.lunareclipse);
  console.debug('Lunar ' +lunartime.remaining)
  return lunartime.remaining;
}

getAuraById(spellId) {
  return me.auras.find(aura => aura.spellId === spellId) || 0;
}

castTime(spellName) {
  return spell.getSpell(spellName).castTime;
}

cdCondition() {
  return this.useCooldowns();
}

astralPowerDeficit() {
  return 120 - me.powerByType(PowerType.LunarPower);
}

passiveAsp() {
  return 6; // Beispielwert, abhängig von Charakter-Stats
}

useCooldowns() {
  return Settings.DruidBalanceUseCooldown === true ? true : false;
}

energizeAmount(spellName) {
  const spellEnergizeAmounts = { 'Force of Nature': 20, 'Wrath' : 10, 'Starfire' : 10 }; // Beispielwerte, anpassen nach Spell
  return spellEnergizeAmounts[spellName] || 0;
}

convokeCondition() {
  return this.cdCondition() && spell.getCooldown('Convoke the Spirits').ready;
}

prevGcd(spellName) {
  return spell.previousGcd() === spellName;
}

dotRemains(debuffName) {
    const target = this.getCurrentTarget();
    const debuff = target.getAura(debuffName);
    return debuff ? debuff.remaining : 0;
}

getGCD() {
  return 1500;
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
    const debuff = target.getAura(debuffName);
    return debuff ? debuff.remaining : 0;
  }
  enemiesAroundTarget(range) {
    const target = this.getCurrentTarget();
    return target ? target.getUnitsAroundCount(range) : 0;
  }
}
