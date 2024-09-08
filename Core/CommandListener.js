import { defaultCombatTargeting as Combat } from '@/Targeting/CombatTargeting';

class CommandListener extends wow.EventListener {
  constructor() {
    super();
    this.commandRegex = /Unknown console command \((.+)\)/;
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
    switch (command.toLowerCase()) {
      case 'toggleburst':
        Combat.toggleBurst();
        break;
      // Add Additional commands as we progress!
      default:
        console.info(`Unknown custom command: ${command}`);
    }
  }
}

export default new CommandListener();
