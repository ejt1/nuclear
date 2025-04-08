// Fuck you Ian :(
const keybindingsPath = `${__dataDir}/keybindings.json`;

class KeyBindingManager {
  constructor() {
    this.keybindings = {};
    this.defaults = {};
    this.isBindingActive = false;
    this.currentBindingKey = null;
    this.modifiers = { ctrl: false, alt: false, shift: false };
    this.loadBindings();
  }

  loadBindings() {
    try {
      try {
        fs.access(keybindingsPath, fs.constants.F_OK);
        const data = fs.readFile(keybindingsPath, 'utf-8');
        const parsed = JSON.parse(data);
        this.keybindings = parsed;
      } catch (error) {
        console.warn('Keybindings file not found, creating a new one.');
        fs.writeFile(keybindingsPath, JSON.stringify(this.keybindings, null, 2));
      }
    } catch (error) {
      console.error('Error initializing keybindings:', error);
    }
  }

  // Save keybindings to file
  saveBindings() {
    try {
      fs.writeFile(keybindingsPath, JSON.stringify(this.keybindings, null, 2));
      console.info('Keybindings saved successfully.');
    } catch (error) {
      console.error('Error saving keybindings:', error);
    }
  }

  // Set default value for a keybind
  setDefault(bindName, key, modifiers = {}) {
    this.defaults[bindName] = { key, modifiers: {
      ctrl: modifiers.ctrl || false,
      alt: modifiers.alt || false,
      shift: modifiers.shift || false
    }};

    // Init default
    if (!this.keybindings[bindName]) {
      this.keybindings[bindName] = JSON.parse(JSON.stringify(this.defaults[bindName]));
      this.saveBindings();
    }

    return this;
  }

  // You happy with this Ian?
  isDown(bindName) {
    // Binding mode dont touch.
    if (this.isBindingActive) {
      return false;
    }

    const binding = this.keybindings[bindName];
    if (!binding) return false;

    // Check if modifiers match current state
    const ctrlDown = imgui.isKeyDown(imgui.Key.LeftCtrl) || imgui.isKeyDown(imgui.Key.RightCtrl);
    const altDown = imgui.isKeyDown(imgui.Key.LeftAlt) || imgui.isKeyDown(imgui.Key.RightAlt);
    const shiftDown = imgui.isKeyDown(imgui.Key.LeftShift) || imgui.isKeyDown(imgui.Key.RightShift);

    if (binding.modifiers.ctrl !== ctrlDown) return false;
    if (binding.modifiers.alt !== altDown) return false;
    if (binding.modifiers.shift !== shiftDown) return false;

    // Check if the key is down
    return imgui.isKeyDown(binding.key);
  }

  // Check if a key was just pressed
  isPressed(bindName, repeat = false) {
    // If we're in binding mode, don't process key presses
    if (this.isBindingActive) {
      return false;
    }

    const binding = this.keybindings[bindName];
    if (!binding) return false;

    // Check if modifiers match current state
    const ctrlDown = imgui.isKeyDown(imgui.Key.LeftCtrl) || imgui.isKeyDown(imgui.Key.RightCtrl);
    const altDown = imgui.isKeyDown(imgui.Key.LeftAlt) || imgui.isKeyDown(imgui.Key.RightAlt);
    const shiftDown = imgui.isKeyDown(imgui.Key.LeftShift) || imgui.isKeyDown(imgui.Key.RightShift);

    if (binding.modifiers.ctrl !== ctrlDown) return false;
    if (binding.modifiers.alt !== altDown) return false;
    if (binding.modifiers.shift !== shiftDown) return false;

    // Check if the key was pressed
    return imgui.isKeyPressed(binding.key, repeat);
  }

  // Format key binding for display (BECAUSE PEOPLE DUMB?)
  formatKeyBinding(binding) {
    if (!binding) return "Not Set";

    let keyName = binding.key !== undefined ? imgui.getKeyName(binding.key) : "None";

    // Add modifiers
    let displayText = "";
    if (binding.modifiers.ctrl) displayText += "Ctrl+";
    if (binding.modifiers.alt) displayText += "Alt+";
    if (binding.modifiers.shift) displayText += "Shift+";

    return displayText + keyName;
  }

  // Reset a specific binding to its default
  reset(bindName) {
    if (this.defaults[bindName]) {
      this.keybindings[bindName] = JSON.parse(JSON.stringify(this.defaults[bindName]));
      this.saveBindings();
    }
  }

  resetAll() {
    this.keybindings = {};
    for (const bindName in this.defaults) {
      this.keybindings[bindName] = JSON.parse(JSON.stringify(this.defaults[bindName]));
    }
    this.saveBindings();
  }

  // Create a bind button in the UI
  button(bindName, label) {
    // If there's no binding yet, use a placeholder
    const binding = this.keybindings[bindName];
    const displayText = this.formatKeyBinding(binding);

    const buttonText = this.isBindingActive && this.currentBindingKey === bindName ?
      "Press a key..." :
      `${label}: ${displayText}`;

    if (imgui.button(buttonText)) {
      // Start binding mode for this key
      this.isBindingActive = true;
      this.currentBindingKey = bindName;

      // Reset modifiers
      this.modifiers = { ctrl: false, alt: false, shift: false };
    }

    // If we're in binding mode for this key, check for any key press
    if (this.isBindingActive && this.currentBindingKey === bindName) {
      // Check for modifiers
      this.modifiers.ctrl = imgui.isKeyDown(imgui.Key.LeftCtrl) || imgui.isKeyDown(imgui.Key.RightCtrl);
      this.modifiers.alt = imgui.isKeyDown(imgui.Key.LeftAlt) || imgui.isKeyDown(imgui.Key.RightAlt);
      this.modifiers.shift = imgui.isKeyDown(imgui.Key.LeftShift) || imgui.isKeyDown(imgui.Key.RightShift);

      // Check if a non-modifier key is pressed
      for (const keyName in imgui.Key) {
        const keyValue = imgui.Key[keyName];

        // Check if the key is pressed first
        if (typeof keyValue === 'number' && imgui.isKeyPressed(keyValue, false)) {
          // Check if it's Escape (cancel binding)
          if (keyValue === imgui.Key.Escape) {
            // Cancel binding mode
            this.isBindingActive = false;
            this.currentBindingKey = null;
            return true;
          }

          // Skip if it's only a modifier key
          if (keyValue === imgui.Key.LeftCtrl ||
              keyValue === imgui.Key.RightCtrl ||
              keyValue === imgui.Key.LeftAlt ||
              keyValue === imgui.Key.RightAlt ||
              keyValue === imgui.Key.LeftShift ||
              keyValue === imgui.Key.RightShift) {
            continue;
          }

          // Bind the key with modifiers
          this.keybindings[bindName] = {
            key: keyValue,
            modifiers: { ...this.modifiers }
          };
          this.saveBindings();

          // Exit binding mode
          this.isBindingActive = false;
          this.currentBindingKey = null;
          break;
        }
      }

      // Return true because we're handling key input
      return true;
    }

    return false;
  }

  // Check if we're currently in binding mode
  isBinding() {
    return this.isBindingActive;
  }

  // Method to create a hotkey setting UI in behavior settings
  renderHotkeySetting(uid, value, onChange) {
    // Initialize this hotkey if it's the first time
    if (!this.keybindings[uid]) {
      // Set a default value if none exists
      let defaultKey = imgui.Key.None;
      this.setDefault(uid, defaultKey);
    }

    // Get the current binding
    const binding = this.keybindings[uid];
    const displayText = this.formatKeyBinding(binding);

    // Create a button in the UI with the current binding
    const buttonText = this.isBindingActive && this.currentBindingKey === uid ?
      "Press a key..." :
      displayText;

    if (imgui.button(buttonText)) {
      // Start binding mode for this key
      this.isBindingActive = true;
      this.currentBindingKey = uid;

      // Reset modifiers
      this.modifiers = { ctrl: false, alt: false, shift: false };
    }

    // If we're in binding mode for this key, check for any key press
    if (this.isBindingActive && this.currentBindingKey === uid) {
      // Check for modifiers
      this.modifiers.ctrl = imgui.isKeyDown(imgui.Key.LeftCtrl) || imgui.isKeyDown(imgui.Key.RightCtrl);
      this.modifiers.alt = imgui.isKeyDown(imgui.Key.LeftAlt) || imgui.isKeyDown(imgui.Key.RightAlt);
      this.modifiers.shift = imgui.isKeyDown(imgui.Key.LeftShift) || imgui.isKeyDown(imgui.Key.RightShift);

      // Check if a non-modifier key is pressed
      for (const keyName in imgui.Key) {
        const keyValue = imgui.Key[keyName];

        // Check if the key is pressed first
        if (typeof keyValue === 'number' && imgui.isKeyPressed(keyValue, false)) {
          // Check if it's Escape (cancel binding)
          if (keyValue === imgui.Key.Escape) {
            // Cancel binding mode
            this.isBindingActive = false;
            this.currentBindingKey = null;
            return true;
          }

          // Skip if it's only a modifier key
          if (keyValue === imgui.Key.LeftCtrl ||
              keyValue === imgui.Key.RightCtrl ||
              keyValue === imgui.Key.LeftAlt ||
              keyValue === imgui.Key.RightAlt ||
              keyValue === imgui.Key.LeftShift ||
              keyValue === imgui.Key.RightShift) {
            continue;
          }

          // Bind the key with modifiers
          this.keybindings[uid] = {
            key: keyValue,
            modifiers: { ...this.modifiers }
          };
          this.saveBindings();

          // Call the onChange callback if provided
          if (onChange) {
            onChange(this.keybindings[uid]);
          }

          // Exit binding mode
          this.isBindingActive = false;
          this.currentBindingKey = null;
          break;
        }
      }

      // Return true because we're handling key input
      return true;
    }

    return false;
  }

  // Check if a specific behavior hotkey is down (for use in spell.cast requirements)
  isBehaviorHotkeyDown(hotkeyUid) {
    // If we're in binding mode, don't process key presses
    if (this.isBindingActive) {
      return false;
    }
    
    // Call our existing isDown method
    return this.isDown(hotkeyUid);
  }

  // Check if a specific behavior hotkey was just pressed
  isBehaviorHotkeyPressed(hotkeyUid, repeat = false) {
    // If we're in binding mode, don't process key presses
    if (this.isBindingActive) {
      return false;
    }

    // Call our existing isPressed method
    return this.isPressed(hotkeyUid, repeat);
  }
  
  // Create a requirement function for a spell that checks if a hotkey is down
  createSpellRequirement(hotkeyUid) {
    return () => this.isBehaviorHotkeyDown(hotkeyUid);
  }
  
  // Create a combined requirement function
  createCombinedRequirement(hotkeyUid, additionalCheck) {
    return () => this.isBehaviorHotkeyDown(hotkeyUid) && additionalCheck();
  }
}

// Export singleton instance
const KeyBinding = new KeyBindingManager();
export default KeyBinding;
