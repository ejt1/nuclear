import Specialization from "../Enums/Specialization";

export const BehaviorContext = {
  None: 0,
  Normal: 1,
  Instance: 2,
  BattleGround: 4,
}
BehaviorContext.Any = BehaviorContext.Normal | BehaviorContext.Instance | BehaviorContext.BattleGround

export const BehaviorType = {
  Heal: 1,
  Tank: 2,
  Combat: 3,
  Rest: 4,
  Extra: 5
};

export class Behavior {
  name = "defaultName";
  context = BehaviorContext.None;
  specialization = Specialization.Invalid;
  version = -1;
  behaviorType = BehaviorType.Extra;  // Default behavior type is set to Extra
}
