import { defaultCombatTargeting as Combat } from '@/Targeting/CombatTargeting';

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

    this.spellQueue.push({ target, spellName });
    console.info(`Queued spell: ${spellName} on ${target}`);
  }

  getNextQueuedSpell() {
    return this.spellQueue.shift();
  }

  hasQueuedSpells() {
    return this.spellQueue.length > 0;
  }
}

export default new CommandListener();
