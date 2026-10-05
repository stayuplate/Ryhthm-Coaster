/**
 * Gamepad Service & Diagnostic Engine - Rhythm Coaster
 * 
 * Manages Web Gamepad API connection, Firefox-specific environment diagnostics,
 * iframe sandbox restrictions, button remapping, and edge-triggered input state polling.
 */

export interface GamepadCustomMapping {
  leftBtn: number;    // default 2 (Y on Nintendo / X on Xbox)
  topBtn: number;     // default 3 (X on Nintendo / Y on Xbox)
  bottomBtn: number;  // default 0 (B on Nintendo / A on Xbox)
  rightBtn: number;   // default 1 (A on Nintendo / B on Xbox)
}

const STORAGE_KEY = 'rhythm_coaster_gamepad_mapping';

const DEFAULT_MAPPING: GamepadCustomMapping = {
  leftBtn: 2,   // Y (Nintendo Left / Xbox X)
  topBtn: 3,    // X (Nintendo Top / Xbox Y)
  bottomBtn: 0, // B (Nintendo Bottom / Xbox A)
  rightBtn: 1,  // A (Nintendo Right / Xbox B)
};

export function getStoredGamepadMapping(): GamepadCustomMapping {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_MAPPING, ...parsed };
    }
  } catch {
    // Ignore error
  }
  return { ...DEFAULT_MAPPING };
}

export function saveGamepadMapping(mapping: GamepadCustomMapping): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
  } catch {
    // Ignore error
  }
}

// Global cached gamepads to catch events in Firefox immediately
let globalConnectedGamepads: Gamepad[] = [];
let hasReceivedEvent = false;

if (typeof window !== 'undefined') {
  window.addEventListener('gamepadconnected', (e: Event) => {
    hasReceivedEvent = true;
    const gp = (e as GamepadEvent).gamepad;
    if (gp) {
      const existingIdx = globalConnectedGamepads.findIndex(g => g && g.index === gp.index);
      if (existingIdx >= 0) {
        globalConnectedGamepads[existingIdx] = gp;
      } else {
        globalConnectedGamepads.push(gp);
      }
    }
  });

  window.addEventListener('gamepaddisconnected', (e: Event) => {
    const gp = (e as GamepadEvent).gamepad;
    if (gp) {
      globalConnectedGamepads = globalConnectedGamepads.filter(g => g && g.index !== gp.index);
    }
  });
}

export interface GamepadEnvironmentCheck {
  isSupported: boolean;
  isInIframe: boolean;
  isFirefox: boolean;
  isLinux: boolean;
  isWindows: boolean;
  isMac: boolean;
  isBlockedByPolicy: boolean;
  hasFocus: boolean;
  errorMessage: string | null;
  connectedGamepads: Gamepad[];
  hasReceivedEvent: boolean;
  standaloneUrl: string;
}

export function checkGamepadEnvironment(): GamepadEnvironmentCheck {
  const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
  const isFirefox = /firefox/i.test(ua);
  const isLinux = /linux/i.test(ua);
  const isWindows = /win/i.test(ua);
  const isMac = /mac/i.test(ua);

  const isSupported = typeof navigator !== 'undefined' && 'getGamepads' in navigator;
  let isInIframe = false;
  try {
    isInIframe = window.self !== window.top;
  } catch {
    isInIframe = true;
  }

  const hasFocus = typeof document !== 'undefined' ? document.hasFocus() : true;
  let isBlockedByPolicy = false;
  let errorMessage: string | null = null;
  const connectedGamepads: Gamepad[] = [];

  // Check Permissions-Policy / Feature-Policy if supported
  if (typeof document !== 'undefined') {
    try {
      const docAny = document as unknown as { permissionsPolicy?: { allowsFeature?: (f: string) => boolean }; featurePolicy?: { allowsFeature?: (f: string) => boolean } };
      const pp = docAny.permissionsPolicy || docAny.featurePolicy;
      if (pp && typeof pp.allowsFeature === 'function') {
        if (!pp.allowsFeature('gamepad')) {
          isBlockedByPolicy = true;
        }
      }
    } catch {
      // Ignore error
    }
  }

  if (isSupported) {
    try {
      const getPads = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : null;
      if (getPads) {
        const gamepads = getPads();
        if (gamepads) {
          for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i];
            if (gp) {
              connectedGamepads.push(gp);
            }
          }
        }
      }
    } catch (err: unknown) {
      isBlockedByPolicy = true;
      errorMessage = err instanceof Error ? err.message : String(err);
      console.warn("Gamepad API blocked by environment/permissions policy:", err);
    }
  }

  // Also include any gamepads captured by event listener if getGamepads() is lagging
  if (connectedGamepads.length === 0 && globalConnectedGamepads.length > 0) {
    connectedGamepads.push(...globalConnectedGamepads);
  }

  const standaloneUrl = typeof window !== 'undefined' ? window.location.href : '';

  return {
    isSupported,
    isInIframe,
    isFirefox,
    isLinux,
    isWindows,
    isMac,
    isBlockedByPolicy,
    hasFocus,
    errorMessage,
    connectedGamepads,
    hasReceivedEvent,
    standaloneUrl,
  };
}

/**
 * Reads 4-lane boolean inputs from a gamepad using custom or standard diamond mapping:
 * Col 0: Left (Y)
 * Col 1: Up / Top (X)
 * Col 2: Down / Bottom (B)
 * Col 3: Right (A)
 * 
 * Works with both standard and non-standard gamepad mappings in Firefox and Chrome.
 */
export function pollGamepadLanes(gp: Gamepad, mapping: GamepadCustomMapping): [boolean, boolean, boolean, boolean] {
  const isDown = (index: number) => {
    if (index < 0 || !gp.buttons || index >= gp.buttons.length) return false;
    const b = gp.buttons[index];
    if (!b) return false;
    if (typeof b === 'object') {
      return Boolean(b.pressed || (typeof b.value === 'number' && b.value > 0.45));
    }
    return typeof b === 'number' && b > 0.45;
  };

  const axisX = gp.axes && gp.axes[0] !== undefined ? gp.axes[0] : 0;
  const axisY = gp.axes && gp.axes[1] !== undefined ? gp.axes[1] : 0;

  // Some non-standard DirectInput controllers in Firefox expose D-pad on axis 4/5 or 9 (hat switch)
  const hatX = gp.axes && gp.axes[4] !== undefined ? gp.axes[4] : 0;
  const hatY = gp.axes && gp.axes[5] !== undefined ? gp.axes[5] : 0;

  // Col 0: Left (Custom mapping OR Y button [2] OR D-Pad Left [14] OR Left Stick OR Hat X)
  const left = isDown(mapping.leftBtn) || isDown(14) || axisX < -0.55 || hatX < -0.55;

  // Col 1: Top / Up (Custom mapping OR X button [3] OR D-Pad Up [12] OR Stick Up OR Hat Y)
  const up = isDown(mapping.topBtn) || isDown(12) || axisY < -0.55 || hatY < -0.55;

  // Col 2: Bottom / Down (Custom mapping OR B button [0] OR D-Pad Down [13] OR Stick Down OR Hat Y)
  const down = isDown(mapping.bottomBtn) || isDown(13) || axisY > 0.55 || hatY > 0.55;

  // Col 3: Right (Custom mapping OR A button [1] OR D-Pad Right [15] OR Stick Right OR Hat X)
  const right = isDown(mapping.rightBtn) || isDown(15) || axisX > 0.55 || hatX > 0.55;

  return [left, up, down, right];
}
