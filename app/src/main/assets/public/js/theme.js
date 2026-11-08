/**
 * IronLog Theme Manager
 * Controls System/Dark/Light modes & Accents with zero flash and live OS sync.
 */

import { Storage } from './storage.js';
import { Native } from './platform.js';

class ThemeManager {
  constructor() {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.listeners = new Set();
  }

  init() {
    const settings = Storage.getSettings();
    this.applyTheme(settings.theme || 'system');
    this.applyAccent(settings.accent || 'orange');

    // Live listener for OS dark mode changes
    this.mediaQuery.addEventListener('change', () => {
      const current = Storage.getSettings().theme;
      if (current === 'system') {
        this.applyTheme('system');
      }
    });
  }

  get isDark() {
    const mode = document.documentElement.getAttribute('data-theme');
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return this.mediaQuery.matches;
  }

  applyTheme(themeMode) {
    document.documentElement.setAttribute('data-theme', themeMode);

    // Sync native status bar style
    const isDarkNow = this.isDark;
    Native.syncStatusBar(isDarkNow);

    this._notify();
  }

  applyAccent(accentId) {
    document.documentElement.setAttribute('data-accent', accentId);
    this._notify();
  }

  setTheme(themeMode) {
    Storage.updateSettings({ theme: themeMode });
    this.applyTheme(themeMode);
  }

  setAccent(accentId) {
    Storage.updateSettings({ accent: accentId });
    this.applyAccent(accentId);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify() {
    for (const cb of this.listeners) {
      try {
        cb(this.isDark);
      } catch (e) {
        console.error(e);
      }
    }
  }
}

export const Theme = new ThemeManager();
export default Theme;
