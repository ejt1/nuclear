import { defaultCombatTargeting as Combat } from '@/Targeting/CombatTargeting';
import Spell from './Spell';
import * as bt from './BehaviorTree';
import { me } from './ObjectManager';

class CommandListener extends wow.EventListener {
  constructor() {
    super();
    this.commandRegex = /Unknown console command \((.+)\)/;
    this.spellQueue = [];
  }

  onEvent(event) {
    if (event.name === 'CONSOLE_MESSAGE') {
      const message = event.args[0];
      const match = this.commandRegex.exec(message);
      if (match) {
        const command = match[1];
        this.handleCommand(command);
      }
    }
  }

  handleCommand(command) {
    const parts = command.toLowerCase().split(' ');
    switch (parts[0]) {
      case 'toggleburst':
        Combat.toggleBurst();
        break;
      case 'queue':
        this.handleQueueCommand(parts.slice(1));
        break;
      default:
        console.info(`Unknown custom command: ${command}`);
    }
  }

  handleQueueCommand(args) {
    if (args.length < 2) {
      console.info('Invalid queue command. Usage: queue [target|focus|me] [spell name]');
      return;
    }
    const target = args[0];
    const spellName = args.slice(1).join(' ');
    if (!['target', 'focus', 'me'].includes(target)) {
      console.info('Invalid target. Use "target", "focus", or "me".');
      return;
    }
    const added = this.addSpellToQueue({ target, spellName });
    if (added) {
      console.info(`Queued spell: ${spellName} on ${target}`);
      // Attempt to cast the spell immediately
      this.processQueuedSpell();
    } else {
      this.processQueuedSpell();
      console.info(`Spell ${spellName} is already in the queue. Ignoring duplicate.`);
    }
  }

  addSpellToQueue(spellInfo) {
    const existingSpellIndex = this.spellQueue.findIndex(spell => spell.spellName === spellInfo.spellName);
    if (existingSpellIndex !== -1) {
      // Spell already exists in the queue
      // Option 1: Update the existing spell's target
      // this.spellQueue[existingSpellIndex].target = spellInfo.target;
      // console.info(`Updated target for queued spell: ${spellInfo.spellName} to ${spellInfo.target}`);

      // Option 2: Ignore the new command (keep the existing spell as is)
      return false;
    }
    this.spellQueue.push(spellInfo);
    return true;
  }

  getNextQueuedSpell() {
    return this.spellQueue.shift();
  }

  hasQueuedSpells() {
    return this.spellQueue.length > 0;
  }

  processQueuedSpell() {
    if (this.hasQueuedSpells()) {
      const spellInfo = this.getNextQueuedSpell();
      let targetFunction;

      switch (spellInfo.target) {
        case 'me':
          targetFunction = () => me;
          break;
        case 'focus':
          targetFunction = () => me.focusTarget;
          break;
        case 'target':
          targetFunction = () => me.targetUnit;
          break;
        default:
          console.error(`Invalid target type: ${spellInfo.target}`);
          return;
      }

      const result = Spell.cast(spellInfo.spellName, targetFunction).tick();

      if (result === bt.Status.Failure) {
        console.info(`Failed to cast ${spellInfo.spellName} on ${spellInfo.target}. Adding back to queue.`);
        this.addSpellToQueue(spellInfo);
      } else {
        console.info(`Successfully cast ${spellInfo.spellName} on ${spellInfo.target}`);
      }
    }
  }
}

export default new CommandListener();
