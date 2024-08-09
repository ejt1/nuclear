export const Status = {
  Success: 0, Failure: 1, Running: 2
};

export class Composite {
  constructor() { }
}

export class GroupComposite extends Composite {
  /** @type {Array<Composite>} */
  children;

  /**
   *
   * @param {Array<Composite>} children
   */
  constructor(children) {
    super();
    this.children = children;
  }

  addChild(child) {
    this.children.push(child);
  }
}

export class Action extends Composite {
  /** @type {Function} */
  runner;

  /**
   *
   * @param {Function} runner
   */
  constructor(runner) {
    super();
    this.runner = runner;
  }

  tick() {
    if (this.runner) {
      return this.runner();
    }
    return Status.Failure;
  }
}

/**
 * Execute child composite only if the condition is met, works similar to an if-statement
 */
export class Decorator extends Composite {
  constructor(cond, child) {
    super();
    this.condition = cond;
    this.child = child;
  }

  tick() {
    if (this.condition && this.condition instanceof Function && this.condition()) {
      return this.child.tick();
    }
    return Status.Failure;
  }
}

/**
 * Execute each child branch in order until all succeeds in where this branch will also succeed.
 * If any child branch fails this branch will also fail.
 * @todo add Status.Running
 */
export class Sequence extends GroupComposite {
  constructor() {
    super(Array.from(arguments));
  }

  tick() {
    for (const child of this.children) {
      child.start?.();
      let status = child.tick?.();
      child.stop?.();
      if (status == Status.Failure) {
        return status;
      }
    }
    return Status.Success;
  }
}

/**
 * Execute each child branch in order until one succeeds in where this branch will also succeed.
 * If all child branches fail this branch will also fail.
 * @todo add Status.Running
 */
export class Selector extends GroupComposite {
  constructor() {
    super(Array.from(arguments));
  }

  tick() {
    for (const child of this.children) {
      child.start?.();
      let status = child.tick?.();
      child.stop?.();
      if (status == Status.Success) {
        return status;
      }
    }
    return Status.Failure;
  }
}
