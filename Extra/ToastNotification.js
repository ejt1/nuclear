import Settings from '@/Core/Settings';

class ToastNotification {
  static tabName = "Toast Notifications";
  
  static toasts = [];
  static nextToastId = 0;
  
  // Store original console functions
  static originalConsole = {
    log: console.log,
    info: console.info,
    error: console.error
  };
  
  static options = [
    // Enable/Disable Settings
    { type: "checkbox", uid: "ToastEnabled", text: "Enable Toast Notifications", default: true },
    { type: "checkbox", uid: "ToastInterceptConsole", text: "Toast Console Messages", default: false },
    { type: "checkbox", uid: "ToastConsoleLog", text: "Toast console.log()", default: true },
    { type: "checkbox", uid: "ToastConsoleInfo", text: "Toast console.info()", default: true },
    { type: "checkbox", uid: "ToastConsoleError", text: "Toast console.error()", default: true },
    
    // Position Settings
    { type: "combobox", uid: "ToastPosition", text: "Toast Position", options: ["Top Right", "Top Left", "Bottom Right", "Bottom Left", "Top Center", "Bottom Center"], default: "Top Right" },
    { type: "slider", uid: "ToastOffsetX", text: "Horizontal Offset", min: -500, max: 500, default: -20 },
    { type: "slider", uid: "ToastOffsetY", text: "Vertical Offset", min: -500, max: 500, default: 20 },
    { type: "slider", uid: "ToastSpacing", text: "Toast Spacing", min: 0, max: 50, default: 10 },
    
    // Appearance Settings
    { type: "slider", uid: "ToastWidth", text: "Toast Width", min: 150, max: 600, default: 300 },
    { type: "slider", uid: "ToastMaxHeight", text: "Max Toast Height", min: 50, max: 300, default: 100 },
    { type: "slider", uid: "ToastFontSize", text: "Font Size Scale", min: 0.5, max: 2.0, step: 0.1, default: 1.0 },
    { type: "slider", uid: "ToastRounding", text: "Corner Rounding", min: 0, max: 20, default: 8 },
    { type: "slider", uid: "ToastAlpha", text: "Background Alpha", min: 0.1, max: 1.0, step: 0.1, default: 0.9 },
    
    // Timing Settings
    { type: "slider", uid: "ToastDuration", text: "Default Duration (ms)", min: 1000, max: 10000, default: 4000 },
    { type: "slider", uid: "ToastFadeTime", text: "Fade Time (ms)", min: 100, max: 2000, default: 500 },
    { type: "slider", uid: "ToastMaxToasts", text: "Max Visible Toasts", min: 1, max: 10, default: 5 },
    
    // Color Settings
    { type: "color", uid: "ToastColorInfo", text: "Info Toast Color", default: [0.2, 0.6, 1.0, 1.0] },
    { type: "color", uid: "ToastColorSuccess", text: "Success Toast Color", default: [0.2, 0.8, 0.2, 1.0] },
    { type: "color", uid: "ToastColorWarning", text: "Warning Toast Color", default: [1.0, 0.8, 0.2, 1.0] },
    { type: "color", uid: "ToastColorError", text: "Error Toast Color", default: [1.0, 0.3, 0.2, 1.0] },
    { type: "color", uid: "ToastColorDefault", text: "Default Toast Color", default: [0.4, 0.4, 0.4, 1.0] }
  ];

  static renderOptions(renderFunction) {
    renderFunction([
      { header: "Enable/Disable", options: this.options.slice(0, 5) },
      { header: "Position & Layout", options: this.options.slice(5, 9) },
      { header: "Appearance", options: this.options.slice(9, 14) },
      { header: "Timing", options: this.options.slice(14, 17) },
      { header: "Colors", options: this.options.slice(17) }
    ]);
  }

  static init() {
    // Set up console interception
    this.setupConsoleInterception();
    
    // Make toast function globally available
    if (typeof globalThis !== 'undefined') {
      globalThis.toast = this.createToast.bind(this);
    } else if (typeof window !== 'undefined') {
      window.toast = this.createToast.bind(this);
    }
  }

  static setupConsoleInterception() {
    // Override console.log
    console.log = (...args) => {
      this.originalConsole.log(...args);
      if (Settings.ToastInterceptConsole && Settings.ToastConsoleLog) {
        this.createToast('info', 1.0, args.join(' '));
      }
    };

    // Override console.info
    console.info = (...args) => {
      this.originalConsole.info(...args);
      if (Settings.ToastInterceptConsole && Settings.ToastConsoleInfo) {
        this.createToast('info', 1.0, args.join(' '));
      }
    };

    // Override console.error
    console.error = (...args) => {
      this.originalConsole.error(...args);
      if (Settings.ToastInterceptConsole && Settings.ToastConsoleError) {
        this.createToast('error', 1.0, args.join(' '));
      }
    };
  }

  static createToast(type = 'default', size = 1.0, message, duration = null) {
    if (!Settings.ToastEnabled) return;
    
    const toast = {
      id: this.nextToastId++,
      type: type.toLowerCase(),
      size: Math.max(0.5, Math.min(2.0, size)),
      message: String(message || ''),
      duration: duration || Settings.ToastDuration,
      createdTime: wow.frameTime,
      alpha: 0,
      targetAlpha: 1,
      height: 0
    };
    
    this.toasts.push(toast);
    this.cleanupOldToasts();
  }

  static cleanupOldToasts() {
    const currentTime = wow.frameTime;
    const maxToasts = Settings.ToastMaxToasts || 5;
    
    // Remove expired toasts
    this.toasts = this.toasts.filter(toast => {
      const age = currentTime - toast.createdTime;
      return age < (toast.duration + Settings.ToastFadeTime);
    });
    
    // If we have too many toasts, remove oldest ones
    if (this.toasts.length > maxToasts) {
      this.toasts = this.toasts.slice(-maxToasts);
    }
  }

  static getToastColor(type) {
    switch (type) {
      case 'info': return Settings.ToastColorInfo || [0.2, 0.6, 1.0, 1.0];
      case 'success': return Settings.ToastColorSuccess || [0.2, 0.8, 0.2, 1.0];
      case 'warning': return Settings.ToastColorWarning || [1.0, 0.8, 0.2, 1.0];
      case 'error': return Settings.ToastColorError || [1.0, 0.3, 0.2, 1.0];
      default: return Settings.ToastColorDefault || [0.4, 0.4, 0.4, 1.0];
    }
  }

  static getToastPosition(index, totalToasts) {
    const screenSize = imgui.io.displaySize;
    const position = Settings.ToastPosition || "Top Right";
    const offsetX = Settings.ToastOffsetX || -20;
    const offsetY = Settings.ToastOffsetY || 20;
    const spacing = Settings.ToastSpacing || 10;
    const toastHeight = Settings.ToastMaxHeight || 100;
    
    let x, y;
    
    // Calculate stack offset
    const stackOffset = index * (toastHeight + spacing);
    
    switch (position) {
      case "Top Right":
        x = screenSize.x + offsetX - (Settings.ToastWidth || 300);
        y = offsetY + stackOffset;
        break;
      case "Top Left":
        x = offsetX;
        y = offsetY + stackOffset;
        break;
      case "Bottom Right":
        x = screenSize.x + offsetX - (Settings.ToastWidth || 300);
        y = screenSize.y + offsetY - (totalToasts - index) * (toastHeight + spacing) - toastHeight;
        break;
      case "Bottom Left":
        x = offsetX;
        y = screenSize.y + offsetY - (totalToasts - index) * (toastHeight + spacing) - toastHeight;
        break;
      case "Top Center":
        x = (screenSize.x - (Settings.ToastWidth || 300)) / 2 + offsetX;
        y = offsetY + stackOffset;
        break;
      case "Bottom Center":
        x = (screenSize.x - (Settings.ToastWidth || 300)) / 2 + offsetX;
        y = screenSize.y + offsetY - (totalToasts - index) * (toastHeight + spacing) - toastHeight;
        break;
      default:
        x = screenSize.x + offsetX - (Settings.ToastWidth || 300);
        y = offsetY + stackOffset;
    }
    
    return { x, y };
  }

  static updateToastAlpha(toast) {
    const currentTime = wow.frameTime;
    const age = currentTime - toast.createdTime;
    const fadeTime = Settings.ToastFadeTime || 500;
    
    if (age < fadeTime) {
      // Fade in
      toast.alpha = Math.min(1, age / fadeTime);
    } else if (age > toast.duration) {
      // Fade out
      const fadeOutProgress = (age - toast.duration) / fadeTime;
      toast.alpha = Math.max(0, 1 - fadeOutProgress);
    } else {
      // Full visibility
      toast.alpha = 1;
    }
    
    return toast.alpha;
  }

  static render() {
    if (!Settings.ToastEnabled || this.toasts.length === 0) return;
    
    const currentTime = wow.frameTime;
    this.cleanupOldToasts();
    
    // Update and render each toast
    this.toasts.forEach((toast, index) => {
      const alpha = this.updateToastAlpha(toast);
      if (alpha <= 0) return;
      
      const pos = this.getToastPosition(index, this.toasts.length);
      const color = this.getToastColor(toast.type);
      const adjustedAlpha = alpha * (Settings.ToastAlpha || 0.9);
      
      // Set window properties
      imgui.setNextWindowPos({ x: pos.x, y: pos.y });
      imgui.setNextWindowSize({ x: Settings.ToastWidth || 300, y: 0 });
      imgui.setNextWindowBgAlpha(adjustedAlpha);
      
      // Window flags for toast appearance
      const flags = 
        imgui.WindowFlags.NoTitleBar |
        imgui.WindowFlags.NoResize |
        imgui.WindowFlags.NoMove |
        imgui.WindowFlags.NoScrollbar |
        imgui.WindowFlags.NoScrollWithMouse |
        imgui.WindowFlags.NoCollapse |
        imgui.WindowFlags.NoSavedSettings |
        imgui.WindowFlags.NoFocusOnAppearing |
        imgui.WindowFlags.NoNav |
        imgui.WindowFlags.NoDecoration;
      
      // Begin toast window
      if (imgui.begin(`Toast_${toast.id}`, null, flags)) {
        // Apply font scaling
        imgui.setWindowFontScale(toast.size * (Settings.ToastFontSize || 1.0));
        
        // Apply toast color
        imgui.pushStyleColor(imgui.Col.Text, [color[0], color[1], color[2], alpha]);
        imgui.pushStyleVar(imgui.StyleVar.FrameRounding, Settings.ToastRounding || 8);
        
        // Render message with wrapping
        imgui.pushTextWrapPos(imgui.getContentRegionAvail().x);
        imgui.text(toast.message);
        imgui.popTextWrapPos();
        
        // Restore style
        imgui.popStyleVar();
        imgui.popStyleColor();
      }
      imgui.end();
    });
  }

  static tick() {
    this.render();
  }

  // Convenience methods for common toast types
  static info(message, size = 1.0, duration = null) {
    this.createToast('info', size, message, duration);
  }

  static success(message, size = 1.0, duration = null) {
    this.createToast('success', size, message, duration);
  }

  static warning(message, size = 1.0, duration = null) {
    this.createToast('warning', size, message, duration);
  }

  static error(message, size = 1.0, duration = null) {
    this.createToast('error', size, message, duration);
  }

  static default(message, size = 1.0, duration = null) {
    this.createToast('default', size, message, duration);
  }
}

// Initialize the toast system
ToastNotification.init();

// Export both the class and convenience functions
export default ToastNotification;

// Global convenience functions
export const toast = ToastNotification.createToast.bind(ToastNotification);
export const toastInfo = ToastNotification.info.bind(ToastNotification);
export const toastSuccess = ToastNotification.success.bind(ToastNotification);
export const toastWarning = ToastNotification.warning.bind(ToastNotification);
export const toastError = ToastNotification.error.bind(ToastNotification); 