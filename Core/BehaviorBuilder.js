import { Behavior, BehaviorContext } from './Behavior';
import Specialization from './Specialization';
import * as bt from './BehaviorTree';

const kBehaviorPath = __rootDir + '/behaviors';

export default class BehaviorBuilder {
  async initialize() {
    this.behaviors = await this.collectBehaviors();
  }

  async collectBehaviors() {
    const behaviors = new Array();
    await this.searchDir(kBehaviorPath, behaviors);
    console.log(`Found ${behaviors.length} behaviors`);
    return behaviors;
  }

  /**
   *
   * @param {Specialization} spec
   * @param {BehaviorContext} context
   */
  build(spec, context) {
    const root = new bt.Selector();
    const behaviors = this.getComposites(spec, context);
    behaviors.forEach(v => root.addChild(v.build()));
    return root;
  }

  getComposites(spec, context){
    return this.behaviors.filter(v => v.specialization == spec && ((v.context & context) == context || v.context == BehaviorContext.Any));
  }

  async searchDir(path, behaviors) {
    const entries = fs.readdir(path);
    for (const entry of entries) {
      const fullPath = `${entry.parentPath}\\${entry.name}`;
      if (entry.isDirectory) {
        await this.searchDir(fullPath, behaviors);
      } else if (entry.isFile) {
        try {
          const m = await import(fullPath);
          Object.keys(m).forEach(o => {
            if (this.isObjectBehavior(m, o)) {
              const behavior = new m[o]();
              if (this.isValidBehavior(o, behavior)) {
                behaviors.push(behavior);
              }
            }
          });
        } catch (e) {
          console.error(`${entry.name}: ${e}`);
          if (e.stack) {
            console.error(e.stack);
          }
        }
      }
    }
  }

  isClass(cls) {
    return new String(cls).startsWith("class");
  }

  isObjectBehavior(m, o) {
    return this.isClass(m[o]) && (Object.getPrototypeOf(new m[o]()) instanceof Behavior);
  }

  isValidBehavior(name, o) {
    if (o.specialization === undefined) {
      console.error(`Behavior ${name} does not specify specialization`);
      return false;
    }
    if (o.version === undefined) {
      console.error(`Behavior ${name} does not specify game version`);
      return false;
    }
    if (o.specialization == Specialization.Invalid) {
      console.error(`${name} invalid specialization`);
      return false;
    }
    if (o.version != wow.gameVersion) {
      console.debug(`${name}: ${o.version} does match game version ${wow.gameVersion}`)
      // current game version mismatch, ignore this behavior
      return false;
    }
    if (!o.build || !(o.build instanceof Function)) {
      console.error(`${name} missing build() function`);
      return false;
    }
    console.log(`${name} is for ${o.specialization}`);
    return true;
  }
}
