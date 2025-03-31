import { Status, Composite, GroupComposite, Action, Decorator } from '@/Core/BehaviorTree';
import colors from '@/Enums/Colors';

/**
 * @typedef {Object} DebugContext
 * @property {boolean} debugEnabled - Whether debugging is enabled.
 * @property {number} [depth] - The current depth in the tree for indentation.
 */

/**
 * Global counter for unique IDs.
 * @private
 */
let nextId = 0;

/**
 * Extends a Composite instance with debug capabilities.
 * @param {Composite} instance - The node to extend.
 */
export function enableDebug(instance) {
  instance.id = nextId++;
  instance.lastStatus = null;
  instance.lastExecuted = 0;

  // Override execute to track status
  const originalExecute = instance.execute;
  instance.execute = function (context) {
    const status = originalExecute.call(this, context);
    this.lastStatus = status;
    this.lastExecuted = wow.frameTime;
    return status;
  };

  // Add debug rendering
  if (instance instanceof GroupComposite) {
    instance.renderDebug = function (context) {
      if (!context.debugEnabled) return;
      const statusStr = this.statusToString(this.lastStatus);
      imgui.pushStyleColor(imgui.Col.Text, this.statusColor(this.lastStatus));
      if (imgui.treeNode(`Composite${this.id}`, `[${this.id}] ${this.name}: ${statusStr}`)) {
        const childContext = { ...context, depth: (context.depth || 0) + 1 };
        for (let i = 0; i < this.children.length; i++) {
          this.children[i].renderDebug(childContext);
        }
        imgui.treePop();
      }
      imgui.popStyleColor(1);
    };
  } else if (instance instanceof Decorator) {
    instance.renderDebug = function (context) {
      if (!context.debugEnabled) return;
      const statusStr = this.statusToString(this.lastStatus);
      imgui.pushStyleColor(imgui.Col.Text, this.statusColor(this.lastStatus));
      if (imgui.treeNode(`Composite${this.id}`, `[${this.id}] ${this.name}: ${statusStr}`)) {
        imgui.textColored(this.statusColor(this.lastStatus), `Condition: ${this.lastCondition ? 'True' : 'False'}`);
        const childContext = { ...context, depth: (context.depth || 0) + 1 };
        this.child.renderDebug(childContext);
        imgui.treePop();
      }
      imgui.popStyleColor(1);
    };
  } else {
    instance.renderDebug = function (context) {
      if (!context.debugEnabled) return;
      const statusStr = this.statusToString(this.lastStatus);
      imgui.textColored(this.statusColor(this.lastStatus), `${'  '.repeat(context.depth || 0)}[${this.id}] ${this.name}: ${statusStr}`);
    };
  }

  // Add status string helper
  instance.statusToString = status => {
    return status === null ? "Not Executed" : Object.keys(Status).find(key => Status[key] === status) || status;
  };

  instance.statusColor = status => {
    switch (status) {
      case Status.Failure: return colors.red;
      case Status.Success: return colors.green;
      case Status.Running: return colors.blue;
      default: return colors.gray;
    }
  }

  // Enable debug for children if applicable
  if (instance.children) {
    instance.children.forEach(child => enableDebug(child));
  } else if (instance.child) {
    enableDebug(instance.child);
  }
}

/**
 * Renders the entire behavior tree in an ImGui window.
 * @param {Composite} tree - The root node of the behavior tree.
 * @param {string} [title] - The title of the ImGui window (optional; if omitted, assumes external window management).
 */
export function renderBehaviorTree(tree, title) {
  const context = { debugEnabled: true, depth: 0 };
  if (title) {
    if (imgui.begin(title)) {
      tree.renderDebug(context);
      imgui.end();
    }
  } else {
    tree.renderDebug(context);
  }
}