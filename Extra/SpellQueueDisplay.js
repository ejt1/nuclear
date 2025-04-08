import CommandListener from "@/Core/CommandListener";
import colors from "@/Enums/Colors";

/**
 * SpellQueueDisplay module for the NuclearWindow
 * Provides functionality to display the current spell queue
 */
const SpellQueueDisplay = {
  tabName: "Spell Queue",
  
  options: [],
  
  /**
   * Render the spell queue display
   * @param {Function} renderOptionsGroup - Function to render options groups
   */
  renderOptions: function(renderOptionsGroup) {
    // Display current spell queue
    imgui.text("Current Spell Queue");
    imgui.separator();
    
    const queuedSpells = CommandListener.spellQueue;
    
    if (queuedSpells.length === 0) {
      imgui.textColored([0.7, 0.7, 0.7, 1.0], "No spells in queue");
    } else {
      // Create a table to display the queue
      if (imgui.beginTable("##spellQueueTable", 4, imgui.TableFlags.Borders | imgui.TableFlags.RowBg)) {
        // Set up table headers
        imgui.tableSetupColumn("Position", imgui.TableColumnFlags.WidthFixed, 60);
        imgui.tableSetupColumn("Spell Name", imgui.TableColumnFlags.WidthStretch);
        imgui.tableSetupColumn("Target", imgui.TableColumnFlags.WidthFixed, 80);
        imgui.tableSetupColumn("Actions", imgui.TableColumnFlags.WidthFixed, 60);
        imgui.tableHeadersRow();
        
        // Display each spell in the queue
        queuedSpells.forEach((spell, index) => {
          imgui.tableNextRow();
          
          // Position column
          imgui.tableSetColumnIndex(0);
          imgui.text(`${index + 1}`);
          
          // Spell name column
          imgui.tableSetColumnIndex(1);
          imgui.textColored([0.2, 0.8, 1.0, 1.0], spell.spellName);
          
          // Target column
          imgui.tableSetColumnIndex(2);
          imgui.text(spell.target);
          
          // Actions column
          imgui.tableSetColumnIndex(3);
          const buttonLabel = `X##${index}`;
          if (imgui.button(buttonLabel, { x: 25, y: 20 })) {
            CommandListener.removeSpellFromQueue(spell.spellName);
          }
          if (imgui.isItemHovered()) {
            imgui.setTooltip("Remove from queue");
          }
        });
        
        imgui.endTable();
      }
      
      // Add a button to clear the entire queue
      if (imgui.button("Clear Queue", { x: 100, y: 25 })) {
        // Clear all spells from the queue
        while (CommandListener.spellQueue.length > 0) {
          const spell = CommandListener.getNextQueuedSpell();
          if (spell) {
            CommandListener.removeSpellFromQueue(spell.spellName);
          }
        }
      }
    }
    
    // Add a divider
    imgui.spacing();
    imgui.separator();
    imgui.spacing();
    
    // Display queue command help
    imgui.text("Spell Queue Commands");
    imgui.separator();
    imgui.textWrapped("To add a spell to the queue:");
    imgui.textColored([0.3, 0.9, 0.3, 1.0], "/run SendChatMessage(\"STYX queue [target|focus|me] [spellname]\", \"ADDON\")");
    
    imgui.spacing();
    imgui.text("Example:");
    imgui.textColored([0.3, 0.9, 0.3, 1.0], "/run SendChatMessage(\"STYX queue target Fireball\", \"ADDON\")");
    
    imgui.spacing();
    imgui.textWrapped("Other commands:");
    imgui.textColored([0.3, 0.9, 0.3, 1.0], "/run SendChatMessage(\"STYX toggleburst\", \"ADDON\")");
  }
};

export default SpellQueueDisplay;