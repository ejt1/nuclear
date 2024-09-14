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
      wow.Chat.addMessage('Invalid queue command. Usage: queue [target|focus|me] [spell name]');
      return;
    }
    const target = args[0];
    const spellName = args.slice(1).join(' ');
    if (!['target', 'focus', 'me'].includes(target)) {
      console.info('Invalid target. Use "target", "focus", or "me".');
      return;
    }

    // Check if the target exists
    let targetExists = false;
    switch (target) {
      case 'me':
        targetExists = true;
        break;
      case 'focus':
        targetExists = me.focusTarget != null;
        break;
      case 'target':
        targetExists = me.targetUnit != null;
        break;
    }

    if (!targetExists) {
      console.info(`${target.charAt(0).toUpperCase() + target.slice(1)} does not exist. Cannot queue spell.`);
      return;
    }

    // Check if the spell is known
    const spell = Spell.getSpell(spellName);
    if (!spell || !spell.isKnown) {
      console.info(`Spell ${spellName} is not known. Cannot queue.`);
      return;
    }

    // Check if the spell is on cooldown
    if (spell.cooldown && spell.cooldown.timeleft > 2000) {
      console.info(`Spell ${spellName} is on cooldown. Cannot queue.`);
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
      return false;
    }
    this.spellQueue.push({
      ...spellInfo,
      timestamp: wow.frameTime
    });
    return true;
  }

  getNextQueuedSpell() {
    const currentTime = wow.frameTime;
    while (this.spellQueue.length > 0) {
      const nextSpell = this.spellQueue[0];
      if (currentTime - nextSpell.timestamp > 2000) {
        this.spellQueue.shift();
        console.info(`Removed expired queued spell: ${nextSpell.spellName}`);
      } else {
        return nextSpell; // Return the spell without removing it from the queue
      }
    }
    return null;
  }

  hasQueuedSpells() {
    return this.spellQueue.length > 0;
  }

  processQueuedSpell() {
    if (this.hasQueuedSpells()) {
      const spellInfo = this.getNextQueuedSpell();
      if (spellInfo) {
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
          console.info(`Failed to cast ${spellInfo.spellName} on ${spellInfo.target}. Keeping in queue.`);
        } else {
          console.info(`Successfully cast ${spellInfo.spellName} on ${spellInfo.target}`);
          this.spellQueue.shift(); // Remove the spell from the queue after successful cast
        }
      }
    }
  }
}

export default new CommandListener();
