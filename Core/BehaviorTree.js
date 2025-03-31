/**
 * Status codes for behavior tree execution.
 * @enum {number}
 */
export const Status = {
  Success: 0,
  Failure: 1,
  Running: 2,
};

/**
 * Base class for all behavior tree nodes.
 * @class
 */
export class Composite {
  /**
   * Creates a new Composite node.
   * @param {string} [name] - The name of the node (defaults to class name).
   */
  constructor(name = this.constructor.name) {
    /** @type {string} */
    this.name = name;
    this.isRunning = false;
  }

  /**
   * Called when the node starts execution.
   * @param {Object} context - Execution context (e.g., depth, debugEnabled).
   */
  start(context) { }

  /**
   * Executes the node's logic.
   * @param {Object} context - Execution context.
   * @returns {number} The execution status (Success, Failure, or Running).
   */
  tick(context) {
    return Status.Failure;
  }

  /**
   * Called when the node stops execution (not Running).
   * @param {Object} context - Execution context.
   */
  stop(context) { }

  /**
   * Executes the node, managing start, tick, and stop lifecycle.
   * @param {Object} context - Execution context with depth and debug settings.
   * @returns {number} The execution status.
   */
  execute(context) {
    if (!this.isRunning) {
      this.start(context);
      this.isRunning = true;
    }
    const status = this.tick(context);
    if (status !== Status.Running) {
      this.stop(context);
      this.isRunning = false;
    }
    return status;
  }
}

/**
 * Composite node that manages a group of child nodes.
 * @extends Composite
 */
export class GroupComposite extends Composite {
  /**
   * Creates a new GroupComposite node.
   * @param {...(string|Composite)} args - Optional name (string) followed by child nodes.
   */
  constructor(...args) {
    let name = null;
    let children = args;
    if (args.length > 0 && typeof args[0] === 'string') {
      name = args[0];
      children = args.slice(1);
    }
    super(name);
    /** @type {Composite[]} */
    this.children = children;
    /** @type {number} */
    this.activeChildIndex = -1;
  }

  /**
   * Adds a child node to the group.
   * @param {Composite} child - The child node to add.
   */
  addChild(child) {
    this.children.push(child);
  }

  /**
   * Resets the active child index.
   */
  reset() {
    this.activeChildIndex = -1;
  }
}

/**
 * Leaf node that executes a specific action.
 * @extends Composite
 */
export class Action extends Composite {
  /**
   * Creates a new Action node.
   * @param {Function|null} runner - The function to execute (returns a Status).
   * @param {string} [name] - The name of the action.
   */
  constructor(runner, name) {
    super(name);
    /** @type {Function|null} */
    this.runner = runner;
  }

  /** @inheritdoc */
  tick(context) {
    try {
      return this.runner ? this.runner(context) : Status.Failure;
    } catch (e) {
      console.error(`Action ${this.name} failed: ${e.message}`);
      return Status.Failure;
    }
  }
}

/**
 * Node that conditionally executes a child based on a condition.
 * @extends Composite
 */
export class Decorator extends Composite {
  /**
   * Creates a new Decorator node.
   * @param {Function} condition - The condition function (returns boolean).
   * @param {Composite} child - The child node to execute if condition passes.
   * @param {string} [name] - The name of the decorator.
   */
  constructor(condition, child, name) {
    super(name);
    /** @type {Function} */
    this.condition = condition;
    /** @type {Composite} */
    this.child = child;
    /** @type {boolean} */
    this.lastCondition = false;
  }

  /** @inheritdoc */
  tick(context) {
    if (this.condition && this.condition(context)) {
      this.lastCondition = true;
      return this.child.execute(context);
    }
    this.lastCondition = false;
    return Status.Failure;
  }
}

/**
 * Executes children in order until one fails or all succeed.
 * @extends GroupComposite
 */
export class Sequence extends GroupComposite {
  /**
   * Creates a new Sequence node.
   * @param {...(string|Composite)} args - Optional name (string) followed by child nodes.
   */
  constructor(...args) {
    super(...args);
    if (!this.name) {
      this.name = "Sequence";
    }
  }

  /** @inheritdoc */
  tick(context) {
    let startIndex = this.activeChildIndex === -1 ? 0 : this.activeChildIndex;

    for (let i = startIndex; i < this.children.length; ++i) {
      let status = this.children[i].execute({ ...context, depth: (context.depth || 0) + 1 });

      if (status === Status.Running) {
        this.activeChildIndex = i;
        return Status.Running;
      }
      if (status === Status.Failure) {
        this.reset();
        return Status.Failure;
      }
    }

    this.reset();
    return Status.Success;
  }
}

/**
 * Executes children until one succeeds or all fail.
 * @extends GroupComposite
 */
export class Selector extends GroupComposite {
  /**
   * Creates a new Selector node.
   * @param {...(string|Composite)} args - Optional name (string) followed by child nodes.
   */
  constructor(...args) {
    super(...args);
    if (!this.name) {
      this.name = "Selector";
    }
  }

  /** @inheritdoc */
  tick(context) {
    let startIndex = this.activeChildIndex === -1 ? 0 : this.activeChildIndex;

    for (let i = startIndex; i < this.children.length; ++i) {
      let status = this.children[i].execute({ ...context, depth: (context.depth || 0) + 1 });

      if (status === Status.Running) {
        this.activeChildIndex = i;
        return Status.Running;
      }
      if (status === Status.Success) {
        this.reset();
        return Status.Success;
      }
    }

    this.reset();
    return Status.Failure;
  }
}

/**
 * Decorator that always returns Success, regardless of child outcome.
 * @extends Composite
 */
export class AlwaysSucceed extends Composite {
  /**
   * Creates a new AlwaysSucceed node.
   * @param {Composite} child - The child node to execute.
   * @param {string} [name] - The name of the decorator.
   */
  constructor(child, name = "AlwaysSucceed") {
    super(name);
    /** @type {Composite} */
    this.child = child;
  }

  /** @inheritdoc */
  tick(context) {
    this.child.execute(context); // Run child but ignore its status
    return Status.Success;
  }
}

/**
 * Decorator that always returns Failure, regardless of child outcome.
 * @extends Composite
 */
export class AlwaysFail extends Composite {
  /**
   * Creates a new AlwaysFail node.
   * @param {Composite} child - The child node to execute.
   * @param {string} [name] - The name of the decorator.
   */
  constructor(child, name = "AlwaysFail") {
    super(name);
    /** @type {Composite} */
    this.child = child;
  }

  /** @inheritdoc */
  tick(context) {
    this.child.execute(context); // Run child but ignore its status
    return Status.Failure;
  }
}

/**
 * Action that waits for a duration or condition before succeeding.
 * @extends Action
 */
export class WaitFor extends Action {
  /**
   * Creates a new WaitFor node.
   * @param {number|Function} durationOrCondition - Duration in milliseconds or a condition function (returns boolean).
   * @param {string} [name] - The name of the action.
   */
  constructor(durationOrCondition, name = "WaitFor") {
    super(null, name);
    if (typeof durationOrCondition === 'number') {
      /** @type {number} */
      this.duration = durationOrCondition;
      /** @type {Function|null} */
      this.condition = null;
    } else if (typeof durationOrCondition === 'function') {
      /** @type {number} */
      this.duration = Infinity; // No timeout if condition-based
      /** @type {Function} */
      this.condition = durationOrCondition;
    } else {
      throw new Error("WaitFor requires a number (duration) or function (condition)");
    }
    /** @type {number} */
    this.startTime = 0;
  }

  /** @inheritdoc */
  start(context) {
    this.startTime = wow.frameTime;
  }

  /** @inheritdoc */
  tick(context) {
    const elapsed = wow.frameTime - this.startTime;
    if (this.condition) {
      return this.condition(context) ? Status.Success : Status.Running;
    }
    return elapsed >= this.duration ? Status.Success : Status.Running;
  }

  /** @inheritdoc */
  stop(context) {
    this.startTime = 0; // Reset for next use
  }
}

/**
 * Decorator that inverts the child's status (Success -> Failure, Failure -> Success).
 * @extends Composite
 */
export class Inverter extends Composite {
  /**
   * Creates a new Inverter node.
   * @param {Composite} child - The child node to invert.
   * @param {string} [name] - The name of the decorator.
   */
  constructor(child, name = "Inverter") {
    super(name);
    /** @type {Composite} */
    this.child = child;
  }

  /** @inheritdoc */
  tick(context) {
    const status = this.child.execute(context);
    if (status === Status.Success) return Status.Failure;
    if (status === Status.Failure) return Status.Success;
    return Status.Running; // Running stays Running
  }
}

/**
 * Decorator that repeats the child until it fails, then succeeds.
 * @extends Composite
 */
export class UntilFail extends Composite {
  /**
   * Creates a new UntilFail node.
   * @param {Composite} child - The child node to repeat.
   * @param {string} [name] - The name of the decorator.
   */
  constructor(child, name = "UntilFail") {
    super(name);
    /** @type {Composite} */
    this.child = child;
  }

  /** @inheritdoc */
  tick(context) {
    const status = this.child.execute(context);
    if (status === Status.Failure) return Status.Success;
    return Status.Running; // Keep running until failure
  }
}

/**
 * Action that evaluates a condition and returns Success or Failure.
 * @extends Action
 */
export class Condition extends Action {
  /**
   * Creates a new Condition node.
   * @param {Function} condition - The condition function (returns boolean).
   * @param {string} [name] - The name of the action.
   */
  constructor(condition, name = "Condition") {
    super(null, name);
    /** @type {Function} */
    this.condition = condition;
  }

  /** @inheritdoc */
  tick(context) {
    return this.condition(context) ? Status.Success : Status.Failure;
  }
}