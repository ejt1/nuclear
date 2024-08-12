import perfMgr from "../Debug/PerfMgr";

/**
* @type {wow.CGActivePlayer}
*/
export let me = null;

class ObjectManager {
  constructor() {
    this.reset();
  }

  /**
   * @type {Map<BigInt, wow.CGObject>}
   */
  objects = new Map();

  reset() {
    this.objects = new Map();
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

    // invalidate 'me' if removed
    if (me && (!curMgr.localGuid || !newObjects.has(curMgr.localGuid.hash))) {
      me = null;
    }

    // add new objects
    newObjects.forEach((obj, hash) => {
      if (!this.objects.has(hash)) {
        this.objects.set(hash, this.createObj(obj));
      }
    });

    perfMgr.end("objmgr");
  }

  getObjectByGuid(guid) {
    if (guid instanceof wow.Guid && this.objects.has(guid.hash)) {
      return this.objects.get(guid.hash);
    }
    return null;
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
        me = obj;
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
