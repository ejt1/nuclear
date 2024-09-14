import { defaultCombatTargeting as Combat } from '@/Targeting/CombatTargeting';
import Spell from './Spell';
import { me } from './ObjectManager';
import Settings from './Settings';

class CommandListener extends wow.EventListener {
  constructor() {
    super();
    this.commandRegex = /Unknown console command \((.+)\)/;
    this.spellQueue = [];
    this.targetFunctions = {
      me: () => me,
      focus: () => me.focusTarget,
      target: () => me.targetUnit
    };
  }

  onEvent(event) {
    if (event.name === 'CONSOLE_MESSAGE') {
      const match = this.commandRegex.exec(event.args[0]);
      if (match) {
        this.handleCommand(match[1]);
      }
    }
  }

  handleCommand(command) {
    const [action, ...args] = command.toLowerCase().split(' ');
    const handlers = {
      toggleburst: () => Combat.toggleBurst(),
      queue: () => this.handleQueueCommand(args)
    };

    (handlers[action] || (() => console.info(`Unknown custom command: ${command}`)))();
  }

  handleQueueCommand(args) {
    if (args.length < 2) {
      wow.Chat.addMessage('Invalid queue command. Usage: queue [target|focus|me] [spell name]');
      return;
    }

    const [target, ...spellNameParts] = args;
    const spellName = spellNameParts.join(' ');

    if (!this.targetFunctions[target]) {
      console.info('Invalid target. Use "target", "focus", or "me".');
      return;
    }

    if (!this.targetFunctions[target]()) {
      console.info(`${target.charAt(0).toUpperCase() + target.slice(1)} does not exist. Cannot queue spell.`);
      return;
    }

    const spell = Spell.getSpell(spellName);
    if (!spell || !spell.isKnown) {
      console.info(`Spell ${spellName} is not known. Cannot queue.`);
      return;
    }

    if (spell.cooldown && spell.cooldown.timeleft > 2000) {
      console.info(`Spell ${spellName} is on cooldown. Cannot queue.`);
      return;
    }

    const added = this.addSpellToQueue({ target, spellName, spellId: spell.id });
    console.info(added
      ? `Queued spell: ${spellName} (ID: ${spell.id}) on ${target}`
      : `Spell ${spellName} (ID: ${spell.id}) is already in the queue. Ignoring duplicate.`
    );

    this.processQueuedSpell();
  }

  addSpellToQueue(spellInfo) {
    if (this.spellQueue.some(spell => spell.spellId === spellInfo.spellId)) {
      return false;
    }
    this.spellQueue.push({ ...spellInfo, timestamp: wow.frameTime });
    return true;
  }

  getNextQueuedSpell() {
    const currentTime = wow.frameTime;
    const expirationTime = currentTime - Settings.SpellQueueExpirationTimer;

    // Remove expired spells
    this.spellQueue = this.spellQueue.filter(spell => {
      if (spell.timestamp >= expirationTime) {
        return true;
      }
      console.info(`Removed expired queued spell: ${spell.spellName}`);
      return false;
    });

    return this.spellQueue[0] || null;
  }

  processQueuedSpell() {
    const spellInfo = this.getNextQueuedSpell();
    if (spellInfo) {
      const targetFunction = this.targetFunctions[spellInfo.target];
      if (!targetFunction) {
        console.error(`Invalid target type: ${spellInfo.target}`);
        return;
      }

      Spell.cast(spellInfo.spellName, targetFunction).tick();
    }
  }

  removeSpellFromQueue(spellId) {
    this.spellQueue = this.spellQueue.filter(spell => spell.spellId !== spellId);
    console.info(`Removed spell from queue: ID ${spellId}`);
  }
}

export default new CommandListener();
