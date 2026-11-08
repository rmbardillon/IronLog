/**
 * IronLog Workout Engine
 * Manages active and backdated workout sessions, Session Lock (Read-Only after Time Out),
 * set types (Warmup, Working, Failure), suggestions, and permanent records.
 * HARD RULE: NO live timers or clocks. NO edits on locked sessions.
 */

import { Storage } from './storage.js';
import { Exercises } from './exercises.js';

class WorkoutEngine {
  constructor() {
    this.activeWorkout = null;
    this.listeners = new Set();
  }

  init() {
    const draft = Storage.getDraft();
    if (draft) {
      this.activeWorkout = draft;
    }
  }

  get isActive() {
    return this.activeWorkout !== null && !this.activeWorkout.isLocked;
  }

  startWorkout(template = null, customDate = null) {
    const sessionDate = customDate ? new Date(customDate) : new Date();
    this.activeWorkout = {
      id: 'w_' + Date.now(),
      title: template?.title || 'Workout on ' + sessionDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      date: sessionDate.toISOString(),
      timeIn: null,
      timeOut: null,
      durationSeconds: 0,
      isLocked: false,
      isCompleted: false,
      notes: template?.notes || '',
      exercises: template?.exercises ? JSON.parse(JSON.stringify(template.exercises)) : []
    };
    this._persist();
    this._notify();
    return this.activeWorkout;
  }

  setSessionDate(isoDateStr) {
    if (!this.activeWorkout || this.activeWorkout.isLocked) return;

    const newD = new Date(isoDateStr);
    const year = newD.getFullYear();
    const month = newD.getMonth();
    const day = newD.getDate();

    this.activeWorkout.date = newD.toISOString();

    // Auto update title if default "Workout on..."
    const dateTitleStr = newD.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    if (!this.activeWorkout.title || this.activeWorkout.title.startsWith('Workout on ')) {
      this.activeWorkout.title = 'Workout on ' + dateTitleStr;
    }

    // Synchronize year/month/day of timeIn and timeOut
    if (this.activeWorkout.timeIn) {
      const oldIn = new Date(this.activeWorkout.timeIn);
      this.activeWorkout.timeIn = new Date(year, month, day, oldIn.getHours(), oldIn.getMinutes(), oldIn.getSeconds()).toISOString();
    }

    if (this.activeWorkout.timeOut) {
      const oldOut = new Date(this.activeWorkout.timeOut);
      this.activeWorkout.timeOut = new Date(year, month, day, oldOut.getHours(), oldOut.getMinutes(), oldOut.getSeconds()).toISOString();
    }

    this._recalculateDuration();
    this._persist();
    this._notify();
  }

  setTimeIn(isoTimestamp = null) {
    if (!this.activeWorkout || this.activeWorkout.isLocked) return;
    const baseDate = new Date(this.activeWorkout.date || Date.now());
    const ts = isoTimestamp ? new Date(isoTimestamp) : new Date();

    const finalIn = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      ts.getHours(),
      ts.getMinutes(),
      ts.getSeconds()
    );

    this.activeWorkout.timeIn = finalIn.toISOString();
    this._recalculateDuration();
    this._persist();
    this._notify();
  }

  setTimeOut(isoTimestamp = null) {
    if (!this.activeWorkout || this.activeWorkout.isLocked) return;
    const baseDate = new Date(this.activeWorkout.date || Date.now());
    const ts = isoTimestamp ? new Date(isoTimestamp) : new Date();

    const finalOut = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      ts.getHours(),
      ts.getMinutes(),
      ts.getSeconds()
    );

    this.activeWorkout.timeOut = finalOut.toISOString();
    this._recalculateDuration();
    this._persist();
    this._notify();
  }

  resumeSession() {
    if (!this.activeWorkout || this.activeWorkout.isLocked) return;
    this.activeWorkout.timeOut = null;
    this.activeWorkout.durationSeconds = 0;
    this._persist();
    this._notify();
  }

  _recalculateDuration() {
    if (!this.activeWorkout) return;
    const { timeIn, timeOut } = this.activeWorkout;
    if (timeIn && timeOut) {
      const diffMs = new Date(timeOut).getTime() - new Date(timeIn).getTime();
      this.activeWorkout.durationSeconds = Math.max(0, Math.round(diffMs / 1000));
    } else {
      this.activeWorkout.durationSeconds = 0;
    }
  }

  addExercise(exerciseId) {
    if (!this.activeWorkout || this.activeWorkout.isLocked) return;
    const ex = Exercises.getById(exerciseId);
    if (!ex) return;

    // Look up last session suggestions for same exercise
    const prevPerf = this.getPreviousExercisePerformance(exerciseId);
    const suggestedWeight = prevPerf?.sets?.[0]?.weight || 20;
    const suggestedReps = prevPerf?.sets?.[0]?.reps || 10;

    // Each new exercise starts with EXACTLY 1 set by default (type: Warmup)
    const initialSets = [
      {
        type: 'Warmup',
        weight: suggestedWeight,
        reps: suggestedReps,
        completed: false
      }
    ];

    this.activeWorkout.exercises.push({
      exerciseId: ex.id,
      exerciseName: ex.name,
      sets: initialSets
    });

    this._persist();
    this._notify();
  }

  removeExercise(exerciseIndex) {
    if (!this.activeWorkout || this.activeWorkout.isLocked) return;
    this.activeWorkout.exercises.splice(exerciseIndex, 1);
    this._persist();
    this._notify();
  }

  addSet(exerciseIndex) {
    if (!this.activeWorkout || this.activeWorkout.isLocked) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex) return;

    const lastSet = ex.sets[ex.sets.length - 1];
    const newWeight = lastSet ? lastSet.weight : 20;
    const newReps = lastSet ? lastSet.reps : 10;

    // Any added set defaults to Working
    ex.sets.push({
      type: 'Working',
      weight: newWeight,
      reps: newReps,
      completed: false
    });

    this._persist();
    this._notify();
  }

  removeSet(exerciseIndex, setIndex) {
    if (!this.activeWorkout || this.activeWorkout.isLocked) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex || !ex.sets[setIndex]) return;
    ex.sets.splice(setIndex, 1);
    this._persist();
    this._notify();
  }

  toggleSetType(exerciseIndex, setIndex) {
    if (!this.activeWorkout || this.activeWorkout.isLocked) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex || !ex.sets[setIndex]) return;

    const set = ex.sets[setIndex];
    const types = ['Warmup', 'Working', 'Failure'];
    const currentIdx = types.indexOf(set.type || 'Working');
    set.type = types[(currentIdx + 1) % types.length];

    this._persist();
    this._notify();
  }

  setSetType(exerciseIndex, setIndex, newType) {
    if (!this.activeWorkout || this.activeWorkout.isLocked) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex || !ex.sets[setIndex]) return;

    ex.sets[setIndex].type = newType;
    this._persist();
    this._notify();
  }

  updateSet(exerciseIndex, setIndex, updates) {
    if (!this.activeWorkout || this.activeWorkout.isLocked) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex || !ex.sets[setIndex]) return;

    Object.assign(ex.sets[setIndex], updates);
    this._persist();
    this._notify();
  }

  toggleSetCompletion(exerciseIndex, setIndex) {
    if (!this.activeWorkout || this.activeWorkout.isLocked) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex || !ex.sets[setIndex]) return;

    const set = ex.sets[setIndex];
    set.completed = !set.completed;

    if (set.completed) {
      set.isPR = this.checkIfPR(ex.exerciseId, set.weight, set.reps);
    }

    this._persist();
    this._notify();
  }

  checkIfPR(exerciseId, weight, reps) {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    if (w <= 0 || r <= 0) return false;

    const currentPRs = Storage.state.prs[exerciseId];
    if (!currentPRs) return true;

    const est1RM = r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10;
    return w > (currentPRs.maxWeight || 0) || est1RM > (currentPRs.max1RM || 0);
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

    const sessionD = new Date(this.activeWorkout.date || Date.now());
    const year = sessionD.getFullYear();
    const month = sessionD.getMonth();
    const day = sessionD.getDate();

    if (!this.activeWorkout.timeIn) {
      this.activeWorkout.timeIn = sessionD.toISOString();
    } else {
      const oldIn = new Date(this.activeWorkout.timeIn);
      this.activeWorkout.timeIn = new Date(year, month, day, oldIn.getHours(), oldIn.getMinutes(), oldIn.getSeconds()).toISOString();
    }

    if (!this.activeWorkout.timeOut) {
      const now = new Date();
      this.activeWorkout.timeOut = new Date(year, month, day, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
    } else {
      const oldOut = new Date(this.activeWorkout.timeOut);
      this.activeWorkout.timeOut = new Date(year, month, day, oldOut.getHours(), oldOut.getMinutes(), oldOut.getSeconds()).toISOString();
    }

    this._recalculateDuration();

    // Lock session - READ-ONLY PERMANENTLY
    this.activeWorkout.isLocked = true;
    this.activeWorkout.isCompleted = true;

    const finished = {
      ...this.activeWorkout,
      date: this.activeWorkout.date || this.activeWorkout.timeIn
    };

    Storage.addWorkout(finished);
    Storage.clearDraft();

    this.activeWorkout = null;
    this._notify();
    return finished;
  }

  cancelWorkout() {
    this.activeWorkout = null;
    Storage.clearDraft();
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
        listener(this.activeWorkout);
      } catch (e) {
        console.error(e);
      }
    }
  }
}

export const Workout = new WorkoutEngine();
export default Workout;
