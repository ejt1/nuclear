import Specialization from "./Specialization";

export const BehaviorContext = {
  None: 0,
  Normal: 1,
  Instance: 2,
  BattleGround: 4,
}
BehaviorContext.Any = BehaviorContext.Normal | BehaviorContext.Instance | BehaviorContext.BattleGround

export class Behavior {
  context = BehaviorContext.None;
  specialization = Specialization.Invalid;
  flavor = -1;
}
