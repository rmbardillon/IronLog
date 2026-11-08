/**
 * IronLog Rest Timer
 * Background-resilient countdown timer with notifications, haptics and audio beeps.
 */

import { Native } from './platform.js';
import { Storage } from './storage.js';

class RestTimer {
  constructor() {
    this.totalSeconds = 90;
    this.remainingSeconds = 0;
    this.isRunning = false;
    this.intervalId = null;
    this.targetEndTime = null;
    this.listeners = new Set();
  }

  start(seconds = null) {
    if (seconds === null) {
      seconds = Storage.getSettings().restTimerSeconds || 90;
    }
    this.totalSeconds = seconds;
    this.remainingSeconds = seconds;
    this.targetEndTime = Date.now() + seconds * 1000;
    this.isRunning = true;

    if (this.intervalId) clearInterval(this.intervalId);

    // Schedule background notification
    Native.scheduleRestTimerNotification(seconds);

    this.intervalId = setInterval(() => this._tick(), 250);
    this._notify();
  }

  addTime(seconds = 15) {
    if (!this.isRunning) return;
    this.totalSeconds += seconds;
    this.targetEndTime += seconds * 1000;
    this.remainingSeconds = Math.max(0, Math.ceil((this.targetEndTime - Date.now()) / 1000));
    Native.scheduleRestTimerNotification(this.remainingSeconds);
    this._notify();
  }

  subtractTime(seconds = 15) {
    if (!this.isRunning) return;
    this.targetEndTime -= seconds * 1000;
    const now = Date.now();
    this.remainingSeconds = Math.max(0, Math.ceil((this.targetEndTime - now) / 1000));
    if (this.remainingSeconds <= 0) {
      this._onComplete();
    } else {
      Native.scheduleRestTimerNotification(this.remainingSeconds);
      this._notify();
    }
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.remainingSeconds = 0;
    this.targetEndTime = null;
    Native.cancelRestTimerNotification();
    this._notify();
  }

  _tick() {
    if (!this.isRunning) return;
    const now = Date.now();
    const diff = Math.max(0, Math.ceil((this.targetEndTime - now) / 1000));
    this.remainingSeconds = diff;

    if (diff <= 0) {
      this._onComplete();
    } else {
      this._notify();
    }
  }

  _onComplete() {
    this.stop();
    const settings = Storage.getSettings();
    if (settings.hapticsEnabled !== false) {
      Native.hapticSuccess();
    }
    if (settings.soundEnabled !== false) {
      Native.playTimerBeep();
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify() {
    const data = {
      isRunning: this.isRunning,
      remaining: this.remainingSeconds,
      total: this.totalSeconds,
      progress: this.totalSeconds > 0 ? (this.totalSeconds - this.remainingSeconds) / this.totalSeconds : 0
    };
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (e) {
        console.error(e);
      }
    }
  }
}

export const Timer = new RestTimer();
export default Timer;
