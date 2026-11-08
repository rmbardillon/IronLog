/**
 * IronLog Workout Engine
 * Manages active workout session, PR calculations, set mechanics, and supersets.
 */

import { Storage } from './storage.js';
import { Exercises } from './exercises.js';
import { Native } from './platform.js';
import { Timer } from './timer.js';

class WorkoutEngine {
  constructor() {
    this.activeWorkout = null;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
    this.listeners = new Set();
  }

  init() {
    const draft = Storage.getDraft();
    if (draft && draft.startTime) {
      this.activeWorkout = draft;
      this.elapsedSeconds = Math.floor((Date.now() - new Date(draft.startTime).getTime()) / 1000);
      this._startElapsedTimer();
      Native.setKeepAwake(true);
    }
  }

  get isActive() {
    return this.activeWorkout !== null;
  }

  startWorkout(template = null) {
    const now = new Date();
    this.activeWorkout = {
      id: 'w_' + Date.now(),
      title: template?.title || 'Workout on ' + now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      startTime: now.toISOString(),
      notes: template?.notes || '',
      exercises: template?.exercises ? JSON.parse(JSON.stringify(template.exercises)) : []
    };
    this.elapsedSeconds = 0;
    this._startElapsedTimer();
    this._persist();
    Native.setKeepAwake(true);
    this._notify();
    return this.activeWorkout;
  }

  _startElapsedTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds++;
      this._notify();
    }, 1000);
  }

  addExercise(exerciseId) {
    if (!this.activeWorkout) this.startWorkout();
    const ex = Exercises.getById(exerciseId);
    if (!ex) return;

    // Look for previous set hint
    const prevWorkout = this.getPreviousExercisePerformance(exerciseId);
    const initialSets = [];

    if (prevWorkout && prevWorkout.sets && prevWorkout.sets.length > 0) {
      prevWorkout.sets.forEach((s) => {
        initialSets.push({
          type: s.type || 'N',
          weight: s.weight,
          reps: s.reps,
          completed: false,
          prevHint: `${s.weight} × ${s.reps}`
        });
      });
    } else {
      // Default initial 3 sets
      initialSets.push(
        { type: 'N', weight: 60, reps: 10, completed: false },
        { type: 'N', weight: 60, reps: 10, completed: false },
        { type: 'N', weight: 60, reps: 10, completed: false }
      );
    }

    this.activeWorkout.exercises.push({
      exerciseId: ex.id,
      exerciseName: ex.name,
      supersetGroupId: null,
      sets: initialSets
    });

    this._persist();
    this._notify();
  }

  removeExercise(exerciseIndex) {
    if (!this.activeWorkout) return;
    this.activeWorkout.exercises.splice(exerciseIndex, 1);
    this._persist();
    this._notify();
  }

  replaceExercise(exerciseIndex, newExerciseId) {
    if (!this.activeWorkout || !this.activeWorkout.exercises[exerciseIndex]) return;
    const ex = Exercises.getById(newExerciseId);
    if (!ex) return;

    const prevWorkout = this.getPreviousExercisePerformance(newExerciseId);
    const initialSets = [];

    if (prevWorkout && prevWorkout.sets && prevWorkout.sets.length > 0) {
      prevWorkout.sets.forEach((s) => {
        initialSets.push({
          type: s.type || 'N',
          weight: s.weight,
          reps: s.reps,
          completed: false
        });
      });
    } else {
      initialSets.push(
        { type: 'N', weight: 60, reps: 10, completed: false },
        { type: 'N', weight: 60, reps: 10, completed: false },
        { type: 'N', weight: 60, reps: 10, completed: false }
      );
    }

    this.activeWorkout.exercises[exerciseIndex] = {
      exerciseId: ex.id,
      exerciseName: ex.name,
      supersetGroupId: null,
      sets: initialSets,
      notes: ''
    };

    this._persist();
    this._notify();
  }

  setExerciseNote(exerciseIndex, note) {
    if (!this.activeWorkout || !this.activeWorkout.exercises[exerciseIndex]) return;
    this.activeWorkout.exercises[exerciseIndex].notes = note;
    this._persist();
    this._notify();
  }

  addSet(exerciseIndex) {
    if (!this.activeWorkout) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex) return;

    const lastSet = ex.sets[ex.sets.length - 1];
    const newWeight = lastSet ? lastSet.weight : 50;
    const newReps = lastSet ? lastSet.reps : 10;
    const newType = lastSet ? lastSet.type : 'N';

    ex.sets.push({
      type: newType,
      weight: newWeight,
      reps: newReps,
      completed: false
    });

    this._persist();
    this._notify();
  }

  removeSet(exerciseIndex, setIndex) {
    if (!this.activeWorkout) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex || !ex.sets[setIndex]) return;
    const removedSet = ex.sets[setIndex];
    ex.sets.splice(setIndex, 1);
    this._persist();
    this._notify();
    return removedSet;
  }

  restoreSet(exerciseIndex, setIndex, set) {
    if (!this.activeWorkout) return;
    let ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex) return;
    ex.sets.splice(Math.min(setIndex, ex.sets.length), 0, set);
    this._persist();
    this._notify();
  }

  updateSet(exerciseIndex, setIndex, updates) {
    if (!this.activeWorkout) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex || !ex.sets[setIndex]) return;

    Object.assign(ex.sets[setIndex], updates);
    this._persist();
    this._notify();
  }

  toggleSetCompletion(exerciseIndex, setIndex) {
    if (!this.activeWorkout) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex || !ex.sets[setIndex]) return;

    const set = ex.sets[setIndex];
    set.completed = !set.completed;

    const settings = Storage.getSettings();

    if (set.completed) {
      // Check for Personal Record
      const isPR = this.checkIfPR(ex.exerciseId, set.weight, set.reps);
      set.isPR = isPR;

      if (isPR) {
        if (settings.hapticsEnabled !== false) Native.hapticPR();
        this._triggerPRCelebration(ex.exerciseName, set.weight, set.reps);
      } else {
        if (settings.hapticsEnabled !== false) Native.hapticLight();
        if (settings.soundEnabled !== false) Native.playSetBeep();
      }

      // Automatically trigger rest timer countdown
      Timer.start(settings.restTimerSeconds);
    }

    this._persist();
    this._notify();
  }

  checkIfPR(exerciseId, weight, reps) {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    if (w <= 0 || r <= 0) return false;

    const currentPRs = Storage.state.prs[exerciseId];
    if (!currentPRs) return true; // First time logging = instant PR

    const est1RM = r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10;
    return w > (currentPRs.maxWeight || 0) || est1RM > (currentPRs.max1RM || 0);
  }

  _triggerPRCelebration(exerciseName, weight, reps) {
    const unit = Storage.getSettings().unit || 'kg';
    const toast = document.createElement('div');
    toast.className = 'pr-toast';
    toast.innerHTML = `🏆 NEW PR! ${exerciseName} ${weight}${unit} × ${reps}`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, -20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 350);
    }, 2800);
  }

  getPreviousExercisePerformance(exerciseId) {
    const workouts = Storage.getWorkouts();
    for (const w of workouts) {
      const match = (w.exercises || []).find(e => e.exerciseId === exerciseId);
      if (match) return match;
    }
    return null;
  }

  finishWorkout() {
    if (!this.activeWorkout) return null;

    const finished = {
      ...this.activeWorkout,
      date: new Date().toISOString(),
      durationSeconds: this.elapsedSeconds
    };

    // Filter out exercises that had 0 completed sets
    finished.exercises = finished.exercises
      .map(e => ({
        ...e,
        sets: e.sets.filter(s => s.completed)
      }))
      .filter(e => e.sets.length > 0);

    Storage.addWorkout(finished);
    Storage.clearDraft();

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.activeWorkout = null;
    this.elapsedSeconds = 0;
    Native.setKeepAwake(false);
    Timer.stop();

    const settings = Storage.getSettings();
    if (settings.hapticsEnabled !== false) Native.hapticSuccess();

    this._notify();
    return finished;
  }

  cancelWorkout() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.activeWorkout = null;
    this.elapsedSeconds = 0;
    Storage.clearDraft();
    Native.setKeepAwake(false);
    Timer.stop();
    this._notify();
  }

  _persist() {
    if (this.activeWorkout) {
      Storage.setDraft(this.activeWorkout);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.activeWorkout, this.elapsedSeconds);
      } catch (e) {
        console.error(e);
      }
    }
  }
}

export const Workout = new WorkoutEngine();
export default Workout;
