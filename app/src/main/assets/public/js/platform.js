/**
 * IronLog Platform Native Bridge
 * Smoothly binds Capacitor plugins with fallback to standard Web APIs.
 */

export const isNative = typeof window !== 'undefined' &&
  window.Capacitor &&
  window.Capacitor.isNativePlatform &&
  window.Capacitor.isNativePlatform();

// Global Capacitor plugin references (provided via Capacitor runtime or imported)
const {
  Haptics,
  StatusBar,
  SplashScreen,
  LocalNotifications,
  Preferences,
  Share,
  Filesystem,
  Camera,
  App
} = window.Capacitor?.Plugins || {};

const KeepAwake = window.Capacitor?.Plugins?.KeepAwake;

/**
 * Audio Synthesizer for Rest Timer beep (Web Audio API fallback)
 */
let audioCtx = null;
function playBeep(freq = 880, durationMs = 250) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  } catch (e) {
    console.warn('Audio beep error', e);
  }
}

export const Native = {
  isNative,

  // ------------------------------------------------------------------------
  // Haptics
  // ------------------------------------------------------------------------
  async hapticLight() {
    if (Haptics) {
      try {
        await Haptics.impact({ style: 'LIGHT' });
        return;
      } catch (e) {}
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  },

  async hapticSuccess() {
    if (Haptics) {
      try {
        await Haptics.notification({ type: 'SUCCESS' });
        return;
      } catch (e) {}
    }
    if ('vibrate' in navigator) {
      navigator.vibrate([40, 60, 80]);
    }
  },

  async hapticPR() {
    if (Haptics) {
      try {
        await Haptics.impact({ style: 'HEAVY' });
        setTimeout(() => Haptics.notification({ type: 'SUCCESS' }), 100);
        return;
      } catch (e) {}
    }
    if ('vibrate' in navigator) {
      navigator.vibrate([80, 50, 120, 50, 150]);
    }
  },

  // ------------------------------------------------------------------------
  // Sound
  // ------------------------------------------------------------------------
  playTimerBeep() {
    playBeep(880, 300);
    setTimeout(() => playBeep(1320, 450), 320);
  },

  playSetBeep() {
    playBeep(587, 150);
  },

  // ------------------------------------------------------------------------
  // Status Bar & Navigation Bar
  // ------------------------------------------------------------------------
  async syncStatusBar(isDark) {
    if (StatusBar) {
      try {
        await StatusBar.setStyle({ style: isDark ? 'DARK' : 'LIGHT' });
        await StatusBar.setBackgroundColor({ color: isDark ? '#090d12' : '#f8fafc' });
      } catch (e) {}
    }
  },

  // ------------------------------------------------------------------------
  // Splash Screen
  // ------------------------------------------------------------------------
  async hideSplash() {
    if (SplashScreen) {
      try {
        await SplashScreen.hide();
      } catch (e) {}
    }
  },

  // ------------------------------------------------------------------------
  // Keep Screen Awake (during active workout)
  // ------------------------------------------------------------------------
  async setKeepAwake(enable) {
    if (KeepAwake) {
      try {
        if (enable) {
          await KeepAwake.keepAwake();
        } else {
          await KeepAwake.allowSleep();
        }
        return;
      } catch (e) {}
    }
    // Web Wake Lock API fallback
    if ('wakeLock' in navigator) {
      try {
        if (enable && !window._wakeLock) {
          window._wakeLock = await navigator.wakeLock.request('screen');
        } else if (!enable && window._wakeLock) {
          await window._wakeLock.release();
          window._wakeLock = null;
        }
      } catch (e) {}
    }
  },

  // ------------------------------------------------------------------------
  // Local Notifications (Rest Timer in background)
  // ------------------------------------------------------------------------
  async scheduleRestTimerNotification(seconds) {
    if (!LocalNotifications) return;
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return;
      }
      // Cancel previous rest timer notifications
      await LocalNotifications.cancel({ notifications: [{ id: 1001 }] });

      const fireAt = new Date(Date.now() + seconds * 1000);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 1001,
            title: 'Rest Time Complete! ⏱️',
            body: 'Ready for your next set. Make it count!',
            schedule: { at: fireAt },
            sound: 'beep.wav',
            smallIcon: 'ic_stat_timer'
          }
        ]
      });
    } catch (e) {
      console.warn('Rest notification error', e);
    }
  },

  async cancelRestTimerNotification() {
    if (!LocalNotifications) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 1001 }] });
    } catch (e) {}
  },

  // ------------------------------------------------------------------------
  // Camera & Photos
  // ------------------------------------------------------------------------
  async capturePhoto() {
    if (Camera) {
      try {
        const photo = await Camera.getPhoto({
          quality: 80,
          allowEditing: true,
          resultType: 'dataUrl', // Base64 data URL
          source: 'PROMPT' // Choose Camera or Photos
        });
        return photo.dataUrl;
      } catch (e) {
        console.warn('Camera error', e);
      }
    }
    // Browser input fallback
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      input.click();
    });
  },

  // ------------------------------------------------------------------------
  // File Export / Share
  // ------------------------------------------------------------------------
  async exportJSON(filename, jsonData) {
    const jsonStr = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);

    if (isNative && Filesystem && Share) {
      try {
        const result = await Filesystem.writeFile({
          path: filename,
          data: jsonStr,
          directory: 'CACHE',
          encoding: 'utf8'
        });
        await Share.share({
          title: 'IronLog Backup',
          text: 'IronLog workout data backup',
          url: result.uri,
          dialogTitle: 'Export IronLog Backup'
        });
        return true;
      } catch (e) {
        console.warn('Native share failed, falling back to web download', e);
      }
    }

    // Web download fallback
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
    return true;
  },

  // ------------------------------------------------------------------------
  // Android Hardware Back Button Setup
  // ------------------------------------------------------------------------
  setupBackButton(onBackRequested) {
    if (App) {
      App.addListener('backButton', () => {
        onBackRequested();
      });
    }
  }
};

export default Native;
