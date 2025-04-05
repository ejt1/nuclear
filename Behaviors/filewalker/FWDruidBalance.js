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



export class BalanceDruidBehavior extends Behavior {
  name = 'FW Balance Druid';
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
    console.debug("Dreamstate: "+ me.hasAura("Dreamstate"));
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
          req => this.enemiesAroundTarget(5) >= 2,
          this.multiTarget(),
            new bt.Action(() => bt.Status.Success)
        ),

        new bt.Decorator(
          req => this.enemiesAroundTarget(5) <= 1,
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
      spell.cast('Warrior of Elune', () => 
        this.hasTalent('Lunar Calling') || 
        (!this.hasTalent('Lunar Calling') && Math.max(this.solarRemains(), this.lunarRemains()) <= 7000)
      ),
      
      // Starsurge logic based on astral power management
      spell.cast('Starsurge', this.getCurrentTarget, () =>
        this.astralPowerDeficit() < this.passiveAsp() + this.energizeAmount('Wrath') +
        ((this.energizeAmount('Starfire') + this.passiveAsp()) * (this.solarRemains() < (this.getGCD() * 3) ? 1 : 0))
      ),
      
      // Starlord talent maintenance
      spell.cast('Starsurge', this.getCurrentTarget, () => 
        this.hasTalent('Starlord') && me.getAuraStacks('Starlord') < 3
      ),
      
      // Eclipse transition management - cast appropriate spell to avoid wasting eclipse time
      spell.cast('Wrath', this.getCurrentTarget, () => 
        this.inSolar() && this.solarRemains() < spell.getSpell('Wrath').castTime && !this.cdCondition()
      ),
      
      spell.cast('Starfire', this.getCurrentTarget, () => 
        this.inLunar() && this.lunarRemains() < spell.getSpell('Starfire').castTime && !this.cdCondition()
      ),
      
      // DOT maintenance
      spell.cast('Sunfire', this.getCurrentTarget, () => 
        this.getDebuffRemainingTime('Sunfire') < 3000 || 
        (this.getDebuffRemainingTime('Sunfire') < 7000 && 
          ((this.hasTalent('Keeper of the Grove') && spell.getCooldown('Force of Nature').ready) || 
           (this.hasTalent('Elunes Chosen') && this.cdCondition())))
      ),
      
      spell.cast('Moonfire', this.getCurrentTarget, () => 
        this.getDebuffRemainingTime('Moonfire') < 3000 && 
        (!this.hasTalent('Treants of the Moon') || 
         (spell.getCooldown('Force of Nature').timeleft > 3000 && !me.hasAura('Harmony of the Grove')))
      ),
      
      // Cooldown management
      this.preCombatCooldowns(),
      this.castCooldowns(),
      
      // Eclipse building - cast appropriate spell based on Dreamstate and target count
      spell.cast('Wrath', this.getCurrentTarget, () => 
        this.enterLunar() && (this.inNoEclipse() || this.solarRemains() < spell.getSpell('Wrath').castTime)
      ),
      
      spell.cast('Starfire', this.getCurrentTarget, () => 
        !this.enterLunar() && (this.inNoEclipse() || this.lunarRemains() < spell.getSpell('Starfire').castTime)
      ),
      
      // Astral power management for cooldowns
      spell.cast('Starsurge', this.getCurrentTarget, () => 
        this.cdCondition() && 
        this.astralPowerDeficit() > this.passiveAsp() + this.energizeAmount('Force of Nature')
      ),
      
      // Key abilities
      spell.cast('Force of Nature', this.getCurrentTarget),
      spell.cast('Fury of Elune', this.getCurrentTarget, () => 
        5 + this.passiveAsp() < this.astralPowerDeficit()
      ),
      
      // Special proc management
      spell.cast('Starfall', this.getCurrentTarget, () => 
        me.hasAura('Starweaver\'s Warp')
      ),
      
      // DOT refreshing
      spell.cast('Sunfire', this.getCurrentTarget, () => 
        this.getDebuffRemainingTime('Sunfire') < 7000
      ),
      
      spell.cast('Moonfire', this.getCurrentTarget, () => 
        this.getDebuffRemainingTime('Moonfire') < 7000 && 
        (!this.hasTalent('Treants of the Moon') || 
         (spell.getCooldown('Force of Nature').timeleft > 3000 && !me.hasAura('Harmony of the Grove')))
      ),
      
      spell.cast('Stellar Flare', this.getCurrentTarget, () => 
        this.getDebuffRemainingTime('Stellar Flare') < 7000
      ),
      
      // Convoke management
      spell.cast('Starsurge', this.getCurrentTarget, () => 
        spell.getCooldown('Convoke the Spirits').timeleft < this.getGCD() * 2 && 
        this.convokeCondition() && 
        this.astralPowerDeficit() < 50
      ),
      
      spell.cast('Convoke the Spirits', this.getCurrentTarget, () => 
        this.convokeCondition()
      ),
      
      // Moon cycle abilities
      spell.cast('New Moon', this.getCurrentTarget, () => 
        this.astralPowerDeficit() > this.passiveAsp() + this.energizeAmount('New Moon') || 
        spell.getCooldown('Celestial Alignment').timeleft > 15000
      ),
      
      spell.cast('Half Moon', this.getCurrentTarget, () => 
        this.astralPowerDeficit() > this.passiveAsp() + this.energizeAmount('Half Moon') && 
        (this.lunarRemains() > spell.getSpell('Half Moon').castTime || 
         this.solarRemains() > spell.getSpell('Half Moon').castTime) || 
        spell.getCooldown('Celestial Alignment').timeleft > 15000
      ),
      
      spell.cast('Full Moon', this.getCurrentTarget, () => 
        this.astralPowerDeficit() > this.passiveAsp() + this.energizeAmount('Full Moon') && 
        (this.lunarRemains() > spell.getSpell('Full Moon').castTime || 
         this.solarRemains() > spell.getSpell('Full Moon').castTime) || 
        spell.getCooldown('Celestial Alignment').timeleft > 15000
      ),
      
      // Special proc spell usage
      spell.cast('Starsurge', this.getCurrentTarget, () => 
        me.hasAura('Starweaver\'s Weft') || me.hasAura('Touch the Cosmos')
      ),
      
      // Wild Mushroom
      spell.cast('Wild Mushroom', this.getCurrentTarget, () => 
        !this.prevGcd('Wild Mushroom') && this.dotRemains('Fungal Growth') < 2000
      ),
      
      // Default fillers
      spell.cast('Starfire', this.getCurrentTarget, () => 
        this.hasTalent('Lunar Calling')
      ),
      
      spell.cast('Wrath', this.getCurrentTarget)
    );
  }

  multiTarget() {
    return new bt.Selector(
      // actions.aoe=wrath,if=variable.enter_lunar&eclipse.in_eclipse&variable.eclipse_remains<cast_time
      spell.cast('Wrath', this.getCurrentTarget, () => 
        this.enterLunar() && 
        this.inEclipse() && 
        Math.max(this.solarRemains(), this.lunarRemains()) < spell.getSpell('Wrath').castTime
      ),
      
      // actions.aoe+=/starfire,if=!variable.enter_lunar&eclipse.in_eclipse&variable.eclipse_remains<cast_time
      spell.cast('Starfire', this.getCurrentTarget, () => 
        !this.enterLunar() && 
        this.inEclipse() && 
        Math.max(this.solarRemains(), this.lunarRemains()) < spell.getSpell('Starfire').castTime
      ),
      
      // actions.aoe+=/starfall,if=astral_power.deficit<=variable.passive_asp+6
      spell.cast('Starfall', this.getCurrentTarget, () => 
        this.astralPowerDeficit() <= this.passiveAsp() + 6 || 
        me.hasAura("Touch the Cosmos")
      ),
      
      // actions.aoe+=/moonfire,target_if=refreshable&(target.time_to_die-remains)>6
      spell.cast('Moonfire', this.getCurrentTarget, () => 
        this.getDebuffRemainingTime('Moonfire') < 6000 && 
        (!this.hasTalent('Treants of the Moon') || 
         this.enemiesAroundTarget(10) > 6 || 
         (spell.getCooldown('Force of Nature').timeleft > 3000 && !me.hasAura('Harmony of the Grove')))
      ),
      
      // actions.aoe+=/sunfire,target_if=refreshable&(target.time_to_die-remains)>6-(spell_targets%2)
      spell.cast('Sunfire', this.getCurrentTarget, () => 
        this.getDebuffRemainingTime('Sunfire') < (6000 - (this.enemiesAroundTarget(10) % 2) * 1000)
      ),
      
      // actions.aoe+=/wrath,if=variable.enter_lunar&(eclipse.in_none|variable.eclipse_remains<cast_time)
      spell.cast('Wrath', this.getCurrentTarget, () => 
        this.enterLunar() && 
        (this.inNoEclipse() || Math.max(this.solarRemains(), this.lunarRemains()) < spell.getSpell('Wrath').castTime)
      ),
      
      // actions.aoe+=/starfire,if=!variable.enter_lunar&(eclipse.in_none|variable.eclipse_remains<cast_time)
      spell.cast('Starfire', this.getCurrentTarget, () => 
        !this.enterLunar() && 
        (this.inNoEclipse() || Math.max(this.solarRemains(), this.lunarRemains()) < spell.getSpell('Starfire').castTime)
      ),
      
      // actions.aoe+=/stellar_flare,target_if=refreshable&(target.time_to_die-remains-target>7+spell_targets)
      spell.cast('Stellar Flare', this.getCurrentTarget, () => {
        const targetCount = this.enemiesAroundTarget(10);
        return this.getDebuffRemainingTime('Stellar Flare') < 7000 && 
               targetCount < (11 - (this.hasTalent('Umbral Intensity') ? 1 : 0) - 
                             (this.hasTalent('Astral Smolder') ? 2 : 0) - 
                             (this.hasTalent('Lunar Calling') ? 1 : 0));
      }),
      
      // actions.aoe+=/force_of_nature
      spell.cast('Force of Nature', this.getCurrentTarget),
      
      // actions.aoe+=/fury_of_elune,if=eclipse.in_eclipse
      spell.cast('Fury of Elune', this.getCurrentTarget, () => this.inEclipse()),
      
      // actions.aoe+=/call_action_list,name=pre_cd
      this.preCombatCooldowns(),
      
      // actions.aoe+=/celestial_alignment,if=variable.cd_condition
      // actions.aoe+=/incarnation,if=variable.cd_condition
      this.castCooldowns(),
      
      // actions.aoe+=/warrior_of_elune,if=!talent.lunar_calling&buff.eclipse_solar.remains<7|talent.lunar_calling
      spell.cast('Warrior of Elune', () => 
        (!this.hasTalent('Lunar Calling') && this.solarRemains() < 7000) || 
        this.hasTalent('Lunar Calling')
      ),
      
      // actions.aoe+=/starfire,if=(!talent.lunar_calling&spell_targets.starfire=1)&(buff.eclipse_solar.up&buff.eclipse_solar.remains<action.starfire.cast_time|eclipse.in_none)
      spell.cast('Starfire', this.getCurrentTarget, () => 
        (!this.hasTalent('Lunar Calling') && this.enemiesAroundTarget(10) === 1) && 
        ((this.inSolar() && this.solarRemains() < spell.getSpell('Starfire').castTime) || this.inNoEclipse())
      ),
      
      // actions.aoe+=/starfall,if=buff.starweavers_warp.up|buff.touch_the_cosmos.up
      spell.cast('Starfall', this.getCurrentTarget, () => 
        me.hasAura('Starweaver\'s Warp') || me.hasAura('Touch the Cosmos')
      ),
      
      // actions.aoe+=/starsurge,if=buff.starweavers_weft.up
      spell.cast('Starsurge', this.getCurrentTarget, () => me.hasAura('Starweaver\'s Weft')),
      
      // actions.aoe+=/starfall
      spell.cast('Starfall', this.getCurrentTarget),
      
      // actions.aoe+=/convoke_the_spirits
      spell.cast('Convoke the Spirits', this.getCurrentTarget, () => 
        (!me.hasAura('Dreamstate') && !me.hasAura('Umbral Embrace') && 
         (this.enemiesAroundTarget(10) < 7 || this.enemiesAroundTarget(10) === 1)) && 
        ((me.hasAura('Celestial Alignment') || me.hasAura('Incarnation: Chosen of Elune') || 
          spell.getCooldown('Celestial Alignment').timeleft > 40000) && 
         (!this.hasTalent('Keeper of the Grove') || me.hasAura('Harmony of the Grove') || 
          spell.getCooldown('Force of Nature').timeleft > 15000))
      ),
      
      // actions.aoe+=/new_moon
      spell.cast('New Moon', this.getCurrentTarget),
      
      // actions.aoe+=/half_moon
      spell.cast('Half Moon', this.getCurrentTarget),
      
      // actions.aoe+=/full_moon
      spell.cast('Full Moon', this.getCurrentTarget),
      
      // actions.aoe+=/wild_mushroom,if=!prev_gcd.1.wild_mushroom&!dot.fungal_growth.ticking
      spell.cast('Wild Mushroom', this.getCurrentTarget, () => 
        !this.prevGcd('Wild Mushroom') && !this.getCurrentTarget().hasAura('Fungal Growth')
      ),
      
      // actions.aoe+=/force_of_nature,if=!hero_tree.keeper_of_the_grove
      spell.cast('Force of Nature', this.getCurrentTarget, () => !this.hasTalent('Keeper of the Grove')),
      
      // actions.aoe+=/starfire,if=talent.lunar_calling|buff.eclipse_lunar.up&spell_targets.starfire>3-(talent.umbral_intensity|talent.soul_of_the_forest)
      spell.cast('Starfire', this.getCurrentTarget, () => {
        const targetThreshold = 3 - (this.hasTalent('Umbral Intensity') || this.hasTalent('Soul of the Forest') ? 1 : 0);
        return this.hasTalent('Lunar Calling') || 
               (this.inLunar() && this.enemiesAroundTarget(10) > targetThreshold);
      }),
      
      // actions.aoe+=/wrath
      spell.cast('Wrath', this.getCurrentTarget)
    );
  }


  preCombatCooldowns() {
    return new bt.Selector(
      spell.cast('Force of Nature', this.getCurrentTarget, () => this.useCooldowns()),
      spell.cast('Berserking', on => me, () => this.useCooldowns()),
      new bt.Action(() => bt.Status.Failure)
    );
  }

  castCooldowns() {
    console.debug("CA " + me.hasAura(194223) + " Incarn:" + me.hasAura("Incarnation: Chosen of Elune"));
    return new bt.Selector(
      // Only cast Celestial Alignment if it's not already active
      spell.cast('Celestial Alignment', () => 
        this.useCooldowns() && 
        !me.hasAura(194223) &&
        !me.hasAura('Incarnation: Chosen of Elune')
      ),
      
      // Only cast Incarnation if Celestial Alignment is not active
      spell.cast('Incarnation: Chosen of Elune', () => 
        this.useCooldowns() && 
        !me.hasAura(194223) &&
        !me.hasAura('Incarnation: Chosen of Elune')
      ),
      
      // Only cast Convoke when in eclipse and when CA/Incarnation is active for maximum benefit
      spell.cast('Convoke the Spirits', this.getCurrentTarget, () => 
        this.useCooldowns() && 
        (me.hasAura(194223) || me.hasAura('Incarnation: Chosen of Elune')) &&
        this.inEclipse()
      ),
      new bt.Action(() => bt.Status.Failure)
    );
  }
  hasTalent(talentName) {
    return me.hasAura(talentName);
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
  // If we're already in an eclipse, return based on current eclipse
  if (this.inSolar()) return true;
  if (this.inLunar()) return false;
  
  // Check target count - enter Lunar Eclipse (cast Wrath) for 1-2 targets,
  // enter Solar Eclipse (cast Starfire) for 3+ targets
  const targetCount = this.enemiesAroundTarget(10);
  
  // Return true if we should enter Lunar Eclipse (1-2 targets)
  // Return false if we should enter Solar Eclipse (3+ targets)
  return targetCount < 3;
}

inEclipse() {
  const lunareclipse = me.auras.find(aura => aura.name.includes("Eclipse (Lunar)") && aura.remaining > 1000) !== undefined;
  const solareclipse = me.auras.find(aura => aura.name.includes("Eclipse (Solar)") && aura.remaining > 1000) !== undefined;
  const eclipse = solareclipse || lunareclipse !== null ? true : false;
  return eclipse;
}

inNoEclipse() {
  // We're not in eclipse if we're not in Solar or Lunar AND we have Dreamstate stacks
  const notInEclipse = !this.inSolar() && !this.inLunar();
  const hasDreamstate = me.getAuraStacks('Dreamstate') > 0;
  
  return notInEclipse && hasDreamstate;
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
  // console.debug('Lunar ' +lunartime.remaining)
  return lunartime.remaining;
}

getAuraById(spellId) {
  return me.auras.find(aura => aura.spellId === spellId) || 0;
}

getBoatStacks() {
  const aura = me.getAura('Balance of All Things');
  return aura ? aura.stacks : 0;
}

castTime(spellName) {
  console.debug("Get Casttime of: " + spellName);
  return spell.getSpell(spellName).castTime;
}

cdCondition() {
  return Settings.DruidBalanceUseCooldown;
}

astralPowerDeficit() {
  return 120 - me.powerByType(PowerType.LunarPower);
}

passiveAsp() {
  return 6; // Beispielwert, abhängig von Charakter-Stats
}

useCooldowns() {
  return Settings.DruidBalanceUseCooldown;
}

energizeAmount(spellName) {
  const spellEnergizeAmounts = { 'Force of Nature': 20, 'Wrath' : 10, 'Starfire' : 10 }; // Beispielwerte, anpassen nach Spell
  return spellEnergizeAmounts[spellName] || 0;
}

convokeCondition() {
  return this.cdCondition() && spell.getCooldown('Convoke the Spirits').ready;
}

prevGcd(spellName) {
  return spell.getLastSuccessfulSpell() === spellName ? spellName : null;
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
