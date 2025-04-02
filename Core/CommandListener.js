import { defaultCombatTargeting as Combat } from '@/Targeting/CombatTargeting';
import Spell from './Spell';
import { me } from './ObjectManager';
import Settings from './Settings';
import colors from '@/Enums/Colors';

class CommandListener extends wow.EventListener {
  constructor() {
    super();
    this.spellQueue = [];
    this.targetFunctions = {
      me: () => me,
      focus: () => me.focusTarget,
      target: () => me.targetUnit
    };

  }

  onEvent(event) {
    if (event.name == 'CHAT_MSG_ADDON') {
      const [prefix, message, channel, sender] = event.args;
      if (prefix === "STYX") {
        this.handleCommand(message);
      }
    }
  }

  handleCommand(command) {
    const [action, ...args] = command.toLowerCase().split(' ');
    const handlers = {
      toggleburst: () => Combat.toggleBurst(),
      queue: () => this.handleQueueCommand(args)
    };

    (handlers[action] || (() => wow.Chat.addMessage(`Unknown custom command: ${command}`)))();
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

      Spell.cast(spellInfo.spellName, targetFunction).tick({});
    }
  }

  removeSpellFromQueue(spellName) {
    this.spellQueue = this.spellQueue.filter(spell => spell.spellName !== spellName);
    console.info(`Removed spell from queue: ${spellName}`);
  }

  renderQueuedSpells() {
    if (this.spellQueue.length === 0) return;

    const drawList = imgui.getBackgroundDrawList();
    if (!drawList) return;

    const viewport = imgui.getMainViewport();
    const pos = {
      x: viewport.workPos.x + viewport.workSize.x * 0.35,
      y: viewport.workPos.y + viewport.workSize.y * 0.20
    };

    let text = "Queued Spells:\n";
    this.spellQueue.forEach((spell, index) => {
      text += `${index + 1}. ${spell.spellName} on ${spell.target}\n`;
    });

    drawList.addText(text, pos, colors.green);
  }
}

const commandListener = new CommandListener();
export default commandListener;
