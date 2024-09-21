import { me } from "@/Core/ObjectManager";
import * as bt from '@/Core/BehaviorTree';

class Pet {
  // Static properties
  static getStance = () => wow.PetInfo.stance;
  static getCommand = () => wow.PetInfo.command;
  static isAttackActive = () => wow.PetInfo.attackActive;
  static getPetGuid = () => wow.PetInfo.guid;
  static getAllPets = () => wow.PetInfo.pets;
  static getActions = () => wow.PetInfo.actions;

  static isAlive() {
    return this.current && this.current.health > 0;
  }

  static get current() {
    return wow.PetInfo.pets[0]?.toUnit() ?? null;
  }

  // Behavior tree actions
  static attack(targetSelector) {
    return new bt.Action(() => {
      const target = targetSelector();
      const pet = this.current;
      if (!pet || !target) return bt.Status.Failure;

      if (!pet.target?.equals(target.guid)) {
        wow.PetInfo.sendAction(wow.PetInfo.actions[0], target.guid);
      }

      return bt.Status.Failure;
    });
  }

  static follow(conditionSelector) {
    return new bt.Action(() => {
      const pet = this.current;
      if (!pet?.target || !conditionSelector() || !wow.PetInfo.attackActive) {
        return bt.Status.Failure;
      }

      wow.PetInfo.sendAction(wow.PetInfo.actions[1], me.guid);

      return pet.targetGuid?.equals(me.guid) ? bt.Status.Failure : bt.Status.Failure;
    });
  }
}

export default Pet;
