import { Behavior, BehaviorContext } from './Behavior';
import Specialization from '../Enums/Specialization';
import * as bt from './BehaviorTree';
import Settings from "./Settings";

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

  build(spec, context) {
    const root = new bt.Selector();
    const selectedBehaviorName = Settings.profile?.[spec];

    let behaviors;

    if (selectedBehaviorName) {
      // Try to find the behavior by path if it was saved in settings
      behaviors = this.behaviors.filter(v => v.name === selectedBehaviorName);
      if (behaviors.length === 0) {
        console.error(`Selected behavior "${selectedBehaviorName}" not found. Falling back to defaults.`);
      } else {
        console.info(`You are using "${selectedBehaviorName}"`);
      }
    }

    if (!behaviors || behaviors.length === 0) {
      // Fallback to default behavior selection based on specialization
      behaviors = this.getComposites(spec, context);
    }

    console.debug(`Built ${behaviors.length} composites`);
    behaviors.forEach(v => root.addChild(v.build()));

    return root;
  }

  getComposites(spec, context){
    return this.behaviors.filter(v => v.specialization == spec && ((v.context & context) == context));
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
      return false;
    }
    if (!o.build || !(o.build instanceof Function)) {
      console.error(`${name} missing build() function`);
      return false;
    }
    return true;
  }
}
