import perfMgr from "../Debug/PerfMgr";

class ObjectManager {
  constructor() {
    this.reset();
  }

  /**
   * @type {Map<BigInt, wow.CGObject>}
   */
  objects = new Map();

  /**
  * @type {wow.CGActivePlayer}
  */
  me = null;

  reset() {
    this.objects = new Map();
    this.me = null;
  }

  tick() {
    perfMgr.begin("objmgr");

    const curMgr = new wow.ClntObjMgr();
    const newObjects = curMgr.active;

    // remove invalidated objects
    this.objects.forEach((_, hash) => {
      if (!newObjects.has(hash)) {
        this.objects.delete(hash);
      }
    });

    // add new objects
    newObjects.forEach((obj, hash) => {
      if (!this.objects.has(hash)) {
        this.objects.set(hash, this.createObj(obj));
      }
    });

    perfMgr.end("objmgr");
  }

  createObj(base) {
    let obj = base;
    switch (base.type) {
      case wow.ObjectTypeID.Item:
        obj = new wow.CGItem(base.guid);
        break;
      case wow.ObjectTypeID.Container:
        obj = new wow.CGContainer(base.guid);
        break;
      case wow.ObjectTypeID.AzeriteEmpoweredItem:
        obj = new wow.CGAzeriteEmpoweredItem(base.guid);
        break;
      case wow.ObjectTypeID.AzeriteItem:
        obj = new wow.CGAzeriteItem(base.guid);
        break;
      case wow.ObjectTypeID.Unit:
        obj = new wow.CGUnit(base.guid);
        break;
      case wow.ObjectTypeID.Player:
        obj = new wow.CGPlayer(base.guid);
        break;
      case wow.ObjectTypeID.ActivePlayer:
        obj = new wow.CGActivePlayer(base.guid);
        this.me = obj;
        break;
      case wow.ObjectTypeID.GameObject:
        obj = new wow.CGGameObject(base.guid);
        break;
      case wow.ObjectTypeID.Dynamic:
        obj = new wow.CGDynamicObject(base.guid);
        break;
    }
    return obj;
  }
}

export default new ObjectManager();
