// Fuck you Ian :(
const keybindingsPath = `${__dataDir}/keybindings.json`;

class KeyBindingManager {
  constructor() {
    this.keybindings = {};
    this.defaults = {};
    this.isBindingActive = false;
    this.currentBindingKey = null;
    this.modifiers = { ctrl: false, alt: false, shift: false };
    this.errorState = false;
    this.loadBindings();
  }

  loadBindings() {
    try {
      try {
        fs.access(keybindingsPath, fs.constants.F_OK);
        const data = fs.readFile(keybindingsPath, 'utf-8');
        const parsed = JSON.parse(data);

        // Process each binding
        for (const bindName in parsed) {
          // Ensure all bindings have the isActive property
          if (parsed[bindName] && !parsed[bindName].hasOwnProperty('isActive')) {
            // If key is None, set isActive to false, otherwise true
            parsed[bindName].isActive =
              parsed[bindName].key !== undefined &&
              parsed[bindName].key !== null &&
              parsed[bindName].key !== imgui.Key.None;
          }

          // Remove the keyName property as it's just for human readability
          if (parsed[bindName] && parsed[bindName].hasOwnProperty('keyName')) {
            delete parsed[bindName].keyName;
          }
        }

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
      // Add human-readable keyName to each binding before saving
      const bindingsWithKeyNames = {};
      for (const bindName in this.keybindings) {
        const binding = this.keybindings[bindName];
        bindingsWithKeyNames[bindName] = { ...binding };

        // Add human-readable key name using our existing formatter
        bindingsWithKeyNames[bindName].keyName = this.formatKeyBinding(binding);
      }

      fs.writeFile(keybindingsPath, JSON.stringify(bindingsWithKeyNames, null, 2));
      console.info('Keybindings saved successfully.');
    } catch (error) {
      console.error('Error saving keybindings:', error);
    }
  }

  // Set default value for a keybind
  setDefault(bindName, key, modifiers = {}) {
    if (key === null || key === undefined || key === imgui.Key.None) {
      // If no key is specified, create an inactive binding
      this.defaults[bindName] = {
        key: imgui.Key.None,
        modifiers: {
          ctrl: false,
          alt: false,
          shift: false
        },
        isActive: false
      };
    } else {
      // Normal binding with active status
      this.defaults[bindName] = {
        key,
        modifiers: {
          ctrl: modifiers.ctrl || false,
          alt: modifiers.alt || false,
          shift: modifiers.shift || false
        },
        isActive: true
      };
    }

    // If this binding doesn't exist yet, initialize it with the default
    if (!this.keybindings[bindName]) {
      this.keybindings[bindName] = JSON.parse(JSON.stringify(this.defaults[bindName]));
      this.saveBindings();
    }

    return this;
  }

  // Check if a key is currently down
  isDown(bindName) {
    // Binding mode - don't process key presses
    if (this.isBindingActive) {
      return false;
    }

    const binding = this.keybindings[bindName];

    // If no binding or binding is None/inactive, return false
    if (!binding || binding.key === undefined || binding.key === imgui.Key.None || binding.isActive === false) {
      return false;
    }

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

    // If no binding or binding is None/inactive, return false
    if (!binding || binding.key === undefined || binding.key === imgui.Key.None || binding.isActive === false) {
      return false;
    }

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

  // Format key binding for display
  formatKeyBinding(binding) {
    if (!binding || binding.isActive === false || binding.key === imgui.Key.None) return "Not Set";

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

  // Method to create a hotkey setting UI in behavior settings
  renderHotkeySetting(uid, value, onChange) {
    // Initialize this hotkey if it's the first time
    if (!this.keybindings[uid]) {
      // Set a default value if none exists
      this.setDefault(uid, imgui.Key.None);
    }

    // Get the current binding
    const binding = this.keybindings[uid];
    const displayText = this.formatKeyBinding(binding);

    // Create button text based on state
    const buttonText = this.isBindingActive && this.currentBindingKey === uid ?
      "Press a key..." : displayText;

    // Normal button without style changes
    if (imgui.button(buttonText)) {
      // Start binding mode for this key
      this.isBindingActive = true;
      this.currentBindingKey = uid;
      this.errorState = false;

      // Reset modifiers
      this.modifiers = { ctrl: false, alt: false, shift: false };
    }

    // Add option to clear the binding
    imgui.sameLine();
    if (imgui.button(`Clear##${uid}`)) {
      this.keybindings[uid] = {
        key: imgui.Key.None,
        modifiers: { ctrl: false, alt: false, shift: false },
        isActive: false
      };
      this.saveBindings();

      if (onChange) {
        onChange(this.keybindings[uid]);
      }
    }

    // If we're in error state, display a message
    if (this.errorState && this.isBindingActive && this.currentBindingKey === uid) {
      imgui.textColored({ r: 1.0, g: 0.3, b: 0.3, a: 1.0 }, "Key already in use! Try another key.");
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
            this.errorState = false;
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

          // Check if this key combination is already used elsewhere
          if (this.isKeyUsedElsewhere(keyValue, this.modifiers, uid)) {
            console.warn(`Key combination already assigned to another function. Please choose a different key.`);
            this.errorState = true;
            return true;
          }

          // Bind the key with modifiers
          this.keybindings[uid] = {
            key: keyValue,
            modifiers: { ...this.modifiers },
            isActive: true // Set active flag when binding a key
          };
          this.saveBindings();

          // Call the onChange callback if provided
          if (onChange) {
            onChange(this.keybindings[uid]);
          }

          // Exit binding mode
          this.isBindingActive = false;
          this.currentBindingKey = null;
          this.errorState = false;
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

    const binding = this.keybindings[hotkeyUid];

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

  // Check if a key combination is already used by another binding
  isKeyUsedElsewhere(key, modifiers, excludeBindName) {
    if (key === imgui.Key.None) return false;

    for (const bindName in this.keybindings) {
      // Skip the current binding being set
      if (bindName === excludeBindName) continue;

      const binding = this.keybindings[bindName];
      if (!binding || !binding.isActive) continue;

      if (binding.key === key &&
          binding.modifiers.ctrl === modifiers.ctrl &&
          binding.modifiers.alt === modifiers.alt &&
          binding.modifiers.shift === modifiers.shift) {
        return true;
      }
    }

    return false;
  }

  // Find which binding is conflicting
  findConflictingBinding(key, modifiers, excludeBindName) {
    if (key === imgui.Key.None) return null;

    for (const bindName in this.keybindings) {
      // Skip the current binding being set
      if (bindName === excludeBindName) continue;

      const binding = this.keybindings[bindName];
      if (!binding || !binding.isActive) continue;

      if (binding.key === key &&
          binding.modifiers.ctrl === modifiers.ctrl &&
          binding.modifiers.alt === modifiers.alt &&
          binding.modifiers.shift === modifiers.shift) {
        return bindName;
      }
    }

    return null;
  }

  // Check if we're currently in binding mode
  isBinding() {
    return this.isBindingActive;
  }

  // Modify the button method to use the same approach
  button(bindName, label) {
    // If there's no binding yet, use a placeholder
    const binding = this.keybindings[bindName];
    const displayText = this.formatKeyBinding(binding);

    // Create button text based on state
    const buttonText = this.isBindingActive && this.currentBindingKey === bindName ?
      `${label}: Press a key...` : `${label}: ${displayText}`;

    // Normal button without style changes
    if (imgui.button(buttonText)) {
      // Start binding mode for this key
      this.isBindingActive = true;
      this.currentBindingKey = bindName;
      this.errorState = false;

      // Reset modifiers
      this.modifiers = { ctrl: false, alt: false, shift: false };
    }

    // Add option to clear the binding
    imgui.sameLine();
    if (imgui.button(`Clear##${bindName}`)) {
      this.keybindings[bindName] = {
        key: imgui.Key.None,
        modifiers: { ctrl: false, alt: false, shift: false },
        isActive: false
      };
      this.saveBindings();
    }

    // If we're in error state, display a message
    if (this.errorState && this.isBindingActive && this.currentBindingKey === bindName) {
      imgui.textColored({ r: 1.0, g: 0.3, b: 0.3, a: 1.0 }, "Key already in use! Try another key.");
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
            this.errorState = false;
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

          // Check if this key combination is already used elsewhere
          if (this.isKeyUsedElsewhere(keyValue, this.modifiers, bindName)) {
            console.warn(`Key combination already assigned to another function. Please choose a different key.`);
            this.errorState = true;
            return true; // Exit key handling but stay in binding mode
          }

          // Bind the key with modifiers
          this.keybindings[bindName] = {
            key: keyValue,
            modifiers: { ...this.modifiers },
            isActive: true
          };
          this.saveBindings();

          // Exit binding mode
          this.isBindingActive = false;
          this.currentBindingKey = null;
          this.errorState = false;
          break;
        }
      }

      // Return true because we're handling key input
      return true;
    }

    return false;
  }
}

// Export singleton instance
const KeyBinding = new KeyBindingManager();
export default KeyBinding;
