import { me } from "@/Core/ObjectManager";
import * as bt from '@/Core/BehaviorTree';

class Pet {
  static attack(targetSelector) {
    return new bt.Action(() => {
      const target = targetSelector();
      if (!me.pet || !target) return bt.Status.Failure;

      if (!me.pet.target?.equals(target.guid)) {
        wow.PetInfo.sendAction(wow.PetInfo.actions[0], target.guid);
        return bt.Status.Failure;
      }

      return bt.Status.Failure;
    });
  }

  static follow(conditionSelector) {
    return new bt.Action(() => {
      if (!me.pet?.target || !conditionSelector() || !wow.PetInfo.attackActive) {
        return bt.Status.Failure;
      }

      wow.PetInfo.sendAction(wow.PetInfo.actions[1], me.guid);

      return me.pet.targetGuid?.equals(me.guid) ? bt.Status.Failure : bt.Status.Failure;
    });
  }

  static getStance = () => wow.PetInfo.stance;
  static getCommand = () => wow.PetInfo.command;
  static isAttackActive = () => wow.PetInfo.attackActive;
  static getPetGuid = () => wow.PetInfo.guid;
  static getAllPets = () => wow.PetInfo.pets;
  static getActions = () => wow.PetInfo.actions;
}

export default Pet;
