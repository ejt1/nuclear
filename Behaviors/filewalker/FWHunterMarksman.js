import { Behavior, BehaviorContext } from "@/Core/Behavior";
import * as bt from '@/Core/BehaviorTree';
import Specialization from '@/Enums/Specialization';
import common from '@/Core/Common';
import spell from "@/Core/Spell";
import Pet from "@/Core/Pet";
import { me } from "@/Core/ObjectManager";
import { PowerType } from "@/Enums/PowerType";
import { defaultCombatTargeting as combat } from "@/Targeting/CombatTargeting";

export class HunterMarksmanshipBehavior extends Behavior {
  context = BehaviorContext.Any;
  specialization = Specialization.Hunter.Marksmanship;
  name = "FW Hunter Marksmanship";
  version = 1;
  
  static settings = [
    {
      header: "Marksmanship Configuration",
      options: [
        {
          uid: "UseTrinkets",
          name: "Use Trinkets",
          type: "checkbox",
          default: true
        },
        {
          uid: "UseRacials",
          name: "Use Racial Abilities",
          type: "checkbox",
          default: true
        },
        {
          uid: "AOEThreshold",
          name: "AOE Threshold",
          type: "slider",
          min: 2,
          max: 5,
          default: 3
        },
        {
          uid: "SaveTrueshot",
          name: "Save Trueshot for multiple targets",
          type: "checkbox",
          default: true
        }
      ]
    }
  ];

  build() {
    return new bt.Selector(
      common.waitForNotMounted(),
      common.waitForCastOrChannel(),
      new bt.Action(() => {
        if (this.getCurrentTarget() === null) {
          return bt.Status.Success;
        }
        return bt.Status.Failure;
      }),
      // this.summonPet(),
      spell.interrupt("Counter Shot", false),
      new bt.Decorator(
        () => this.shouldUseCDs(),
        this.useCooldowns(),
        new bt.Action(() => bt.Status.Success)
      ),
      // new bt.Decorator(
      //   () => this.shouldUseTrinkets(),
      //   this.useTrinkets(),
      //   new bt.Action(() => bt.Status.Success)
      // ),
      new bt.Decorator(
        () => this.getEnemyCount() < 3 || !this.hasTalent("Trick Shots"),
        this.singleTargetRotation(),
        new bt.Action(() => bt.Status.Success)
      ),
      new bt.Decorator(
        () => this.getEnemyCount() >= 3 && this.hasTalent("Trick Shots"),
        this.multiTargetRotation(),
        new bt.Action(() => bt.Status.Success)
      )
    );
  }

  summonPet() {
    return new bt.Selector(
      Pet.follow(() => me.hasAura("Feign Death")),
      new bt.Action(() => {
        if (!Pet.isAlive() && !me.isCasting && !me.isChanneling && this.hasTalent("Unbreakable Bond")) {
          const callPetSpell = spell.getSpell("Call Pet 1");
          if (callPetSpell && callPetSpell.isKnown && callPetSpell.cooldown.ready) {
            if (callPetSpell.cast()) {
              console.info("Summoning pet");
              return bt.Status.Success;
            }
          }
        }
        return bt.Status.Failure;
      }),
      // Revive pet if needed
      new bt.Action(() => {
        if (Pet.current && Pet.current.deadOrGhost && !me.isCasting && !me.isChanneling && this.hasTalent("Unbreakable Bond")) {
          const revivePetSpell = spell.getSpell("Revive Pet");
          if (revivePetSpell && revivePetSpell.isKnown && revivePetSpell.cooldown.ready) {
            if (revivePetSpell.cast()) {
              console.info("Reviving pet");
              return bt.Status.Success;
            }
          }
        }
        return bt.Status.Failure;
      }),
      // Set pet to attack current target
      Pet.attack(() => this.getCurrentTarget())
    );
  }

  useCooldowns() {
    return new bt.Selector(
      spell.cast("Trueshot", req => this.isTrueshotReady()),
      // spell.cast("Berserking", req => me.hasAura("Trueshot") || this.getFightRemains() < 13),
      // spell.cast("Blood Fury", req => me.hasAura("Trueshot") || spell.getCooldown("Trueshot").timeleft > 30 || this.getFightRemains() < 16),
      // spell.cast("Ancestral Call", req => me.hasAura("Trueshot") || spell.getCooldown("Trueshot").timeleft > 30 || this.getFightRemains() < 16),
      // spell.cast("Fireblood", req => me.hasAura("Trueshot") || spell.getCooldown("Trueshot").timeleft > 30 || this.getFightRemains() < 9),
      // spell.cast("Lights Judgment", req => !me.hasAura("Trueshot")),
      // spell.cast("Bag of Tricks", req => !me.hasAura("Trueshot"))
    );
  }

  useTrinkets() {
    return new bt.Selector(
      common.useEquippedItemByName("Junkmaestro's Mega Magnet", () => me.hasAura("Trueshot")),
      common.useEquippedItemByName("Improvised Seaforium Pacemaker", () => me.hasAura("Trueshot"))
    );
  }

  singleTargetRotation() {
    return new bt.Selector(
      // From actions.st
      spell.cast("Volley", req => !this.hasTalent("Double Tap")),
      spell.cast("Rapid Fire", req => (this.hasTalent("Sentinel") && me.hasAura("Lunar Storm Ready")) || 
                                      (this.hasTalent("Bulletstorm") && !me.hasAura("Bulletstorm"))),
      spell.cast("Volley", req => this.hasTalent("Double Tap") && !me.hasAura("Double Tap")),
      spell.cast("Black Arrow", req => (this.hasTalent("Headshot") && me.hasAura("Precise Shots")) || 
                                      (!this.hasTalent("Headshot") && me.hasAura("Razor Fragments"))),
      spell.cast("Kill Shot", req => (this.hasTalent("Headshot") && me.hasAura("Precise Shots")) || 
                                     (!this.hasTalent("Headshot") && me.hasAura("Razor Fragments"))),
      spell.cast("Arcane Shot", req => me.hasAura("Precise Shots") && 
                                     (!this.getCurrentTarget().hasAuraByMe("Spotter's Mark") || 
                                      !me.hasAura("Moving Target"))),
      spell.cast("Rapid Fire", req => !this.hasTalent("Sentinel") || 
                                     (spell.getCooldown("Lunar Storm").timeleft > 
                                      spell.getCooldown("Rapid Fire").duration/3)),
      spell.cast("Explosive Shot", req => this.hasTalent("Precision Detonation") && 
                                         this.has4PieceBonus() && 
                                         !me.hasAura("Precise Shots") && 
                                         me.hasAura("Lock and Load")),
      spell.cast("Aimed Shot", req => !me.hasAura("Precise Shots") || 
                                      
                                      me.hasAura("Lock and Load") || me.hasAura("Moving Target") || me.hasAura("Deathblow")),
      spell.cast("Explosive Shot", req => !this.has4PieceBonus()),
      spell.cast("Black Arrow", req => !this.hasTalent("Headshot")),
      spell.cast("Steady Shot")
    );
  }

  multiTargetRotation() {
    return new bt.Selector(
      // From actions.trickshots
      spell.cast("Volley", req => !this.hasTalent("Double Tap")),
      spell.cast("Multi-Shot", req => me.hasAura("Precise Shots") && 
                                    (!this.getCurrentTarget().hasAuraByMe("Spotter's Mark") || 
                                     !me.hasAura("Moving Target")) || 
                                    !me.hasAura("Trick Shots")),
      spell.cast("Volley", req => this.hasTalent("Double Tap") && !me.hasAura("Double Tap")),
      spell.cast("Black Arrow", req => me.hasAura("Withering Fire") && me.hasAura("Trick Shots")),
      spell.cast("Rapid Fire", req => this.getAuraRemainingTime("Trick Shots") > 2 && 
                                    (!this.hasTalent("Sentinel") || 
                                     spell.getCooldown("Lunar Storm").timeleft > 
                                     spell.getCooldown("Rapid Fire").duration/3 || 
                                     me.hasAura("Lunar Storm Ready"))),
      spell.cast("Explosive Shot", req => this.hasTalent("Precision Detonation") && 
                                         (me.hasAura("Lock and Load") || !this.has4PieceBonus()) && 
                                         (!me.hasAura("Precise Shots") || 
                                          (this.getCurrentTarget().hasAuraByMe("Spotter's Mark") && 
                                           me.hasAura("Moving Target")))),
      spell.cast("Aimed Shot", req => (!me.hasAura("Precise Shots") || 
                                      (this.getCurrentTarget().hasAuraByMe("Spotter's Mark") && 
                                       me.hasAura("Moving Target"))) && 
                                      me.hasAura("Trick Shots")),
      spell.cast("Explosive Shot"),
      spell.cast("Black Arrow"),
      spell.cast("Steady Shot", req => (me.powerByType(PowerType.Focus) + this.getCastRegen("Steady Shot")) < me.maxPowerByType(PowerType.Focus)),
      spell.cast("Multi-Shot")
    );
  }

  // Helper methods
  getCurrentTarget() {
    const target = me.target;
    if (target && !target.deadOrGhost && me.canAttack(target)) {
      return target;
    }
    return combat.bestTarget;
  }

  getEnemyCount() {
    const aoeThreshold = 3; // Using default from SimC file
    return combat.targets.filter(unit => unit.distanceTo(me) <= 40).length;
  }

  isTrueshotReady() {
    // Implementing the variable.trueshot_ready logic from SimC
    const trueshotCD = spell.getCooldown("Trueshot");
    
    if (!trueshotCD.ready) return false;
    
    // Fight remains check
    if (this.getFightRemains() < 25) return true;
    
    // Bullseye talent check
    if (this.hasTalent("Bullseye")) {
      if (this.getFightRemains() <= trueshotCD.duration + 7) return false; // Estimation of duration_guess + buff.trueshot.duration%2
      
      const bullseyeStack = me.getAuraStacks("Bullseye");
      const maxStack = 8; // Assuming max stack is 8, adjust if needed
      if (bullseyeStack === maxStack) return true;
    }
    
    // Trinket sync logic (simplified)
    const trinket1HasUseBuff = true; // We can't easily check this, assume true
    const trinket2HasUseBuff = true;
    
    // const trinket1CD = spell.getCooldown("Trinket1");
    // const trinket2CD = spell.getCooldown("Trinket2");
    
    // if (trinket1HasUseBuff && trinket1CD.timeleft > 5 && !trinket1CD.ready && 
    //     !trinket2HasUseBuff && !trinket2CD.ready) {
    //   return false;
    // }
    
    return true;
  }

  getFightRemains() {
    // This is a placeholder for real boss fight remaining time
    // In practice, we could look at boss health % and estimate
    return 999; // Assume plenty of time remains
  }

  getCastRegen(spellName) {
    // Estimate focus regen during a cast
    const castSpell = spell.getSpell(spellName);
    if (!castSpell) return 0;
    
    const castTime = castSpell.castTime / 1000; // Convert to seconds
    return me.regenRate * castTime;
  }

  getAuraRemainingTime(auraName) {
    const aura = me.getAura(auraName);
    return aura ? aura.remaining / 1000 : 0; // Convert to seconds
  }

  shouldUseCDs() {
    return true; // Can be expanded with additional logic
  }

  shouldUseTrinkets() {
    return true; // Can be expanded with additional logic
  }

  hasTalent(talentName) {
    return spell.isSpellKnown(talentName);
  }

  has4PieceBonus() {
    // This is a placeholder - would need to be implemented to check for tier set bonuses
    return false;
  }
}