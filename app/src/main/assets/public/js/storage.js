/**
 * IronLog Unified Storage Layer
 * Supports Capacitor Preferences with localStorage fallback & schema migration.
 */

import { APP_CONFIG } from './config.js';

const LEGACY_ID_MAP = {
  'bench': 'Barbell_Bench_Press_-_Medium_Grip',
  'squat': 'Barbell_Full_Squat',
  'deadlift': 'Barbell_Deadlift',
  'overhead-press': 'Standing_Military_Press',
  'ohp': 'Standing_Military_Press',
  'barbell-row': 'Bent_Over_Barbell_Row',
  'row': 'Bent_Over_Barbell_Row',
  'pullup': 'Pullups',
  'pull-up': 'Pullups',
  'chin-up': 'Chin-Up',
  'chinup': 'Chin-Up',
  'dip': 'Dips_-_Chest_Version',
  'dips': 'Dips_-_Chest_Version',
  'bicep-curl': 'Barbell_Curl',
  'curl': 'Barbell_Curl',
  'tricep-pushdown': 'Triceps_Pushdown',
  'pushdown': 'Triceps_Pushdown',
  'lateral-raise': 'Side_Lateral_Raise',
  'leg-press': 'Leg_Press',
  'leg-curl': 'Lying_Leg_Curls',
  'leg-extension': 'Leg_Extensions',
  'calf-raise': 'Standing_Calf_Raises',
  'standing-calf-raise': 'Standing_Calf_Raises',
  'lat-pulldown': 'Wide-Grip_Lat_Pulldown',
  'cable-fly': 'Cable_Crossover',
  'chest-fly': 'Cable_Crossover',
  'face-pull': 'Face_Pull',
  'plank': 'Plank',
  'crunch': 'Crunches',
  'crunches': 'Crunches',
  'romanian-deadlift': 'Romanian_Deadlift',
  'rdl': 'Romanian_Deadlift',
  'incline-bench': 'Incline_Dumbbell_Press',
  'incline-press': 'Incline_Dumbbell_Press',
  'dumbbell-press': 'Dumbbell_Bench_Press',
  'dumbbell-curl': 'Dumbbell_Bicep_Curl',
  'hammer-curl': 'Alternate_Hammer_Curl',
  'skull-crusher': 'EZ-Bar_Skullcrusher',
  'shrug': 'Barbell_Shrug',
  'shrugs': 'Barbell_Shrug',
  'lunges': 'Dumbbell_Lunges',
  'lunge': 'Dumbbell_Lunges'
};

const DEFAULT_STATE = {
  version: 2,
  workouts: [],
  customExercises: [],
  favorites: ['Barbell_Bench_Press_-_Medium_Grip', 'Barbell_Full_Squat', 'Barbell_Deadlift', 'Standing_Military_Press'],
  draft: null,
  prs: {},
  settings: {
    unit: APP_CONFIG.defaultUnit,
    weeklyGoal: APP_CONFIG.defaultWeeklyGoal,
    restTimerSeconds: APP_CONFIG.defaultRestTime,
    theme: 'system',
    accent: 'orange',
    soundEnabled: true,
    hapticsEnabled: true,
    keepAwake: true,
    onboardingCompleted: false
  }
};

class StorageManager {
  constructor() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.isLoaded = false;
    this._saveTimeout = null;
    this.listeners = new Set();
  }

  get Preferences() {
    return window.Capacitor?.Plugins?.Preferences;
  }

  async init() {
    if (this.isLoaded) return this.state;
    await this.load();
    this.isLoaded = true;
    return this.state;
  }

  async load() {
    let rawJson = null;

    // 1. Try reading from Capacitor Preferences
    if (this.Preferences) {
      try {
        const { value } = await this.Preferences.get({ key: APP_CONFIG.preferencesKey });
        if (value) rawJson = value;
      } catch (e) {
        console.warn('Preferences get error', e);
      }
    }

    // 2. Fallback to localStorage if Preferences was empty
    if (!rawJson && typeof localStorage !== 'undefined') {
      rawJson = localStorage.getItem(APP_CONFIG.preferencesKey) || localStorage.getItem(APP_CONFIG.storageKey);
    }

    if (rawJson) {
      try {
        const parsed = JSON.parse(rawJson);
        this.state = this._migrate(parsed);
      } catch (e) {
        console.error('Failed to parse saved state, using default', e);
        this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      }
    } else {
      // First run: provide initial sample workout history for an immediate premium feel
      this._seedInitialData();
    }

    this._recalculatePRs();
    return this.state;
  }

  _seedInitialData() {
    const now = Date.now();
    const day = 86400000;
    this.state.workouts = [
      {
        id: 'sample_w1',
        title: 'Upper Body Power',
        date: new Date(now - day * 2).toISOString(),
        durationSeconds: 3200,
        notes: 'Felt strong on bench press today.',
        exercises: [
          {
            exerciseId: 'Barbell_Bench_Press_-_Medium_Grip',
            exerciseName: 'Barbell Bench Press',
            sets: [
              { type: 'W', weight: 60, reps: 10, completed: true },
              { type: 'N', weight: 85, reps: 8, completed: true },
              { type: 'N', weight: 90, reps: 6, completed: true },
              { type: 'N', weight: 95, reps: 4, completed: true, isPR: true }
            ]
          },
          {
            exerciseId: 'Bent_Over_Barbell_Row',
            exerciseName: 'Bent Over Barbell Row',
            sets: [
              { type: 'N', weight: 70, reps: 10, completed: true },
              { type: 'N', weight: 75, reps: 8, completed: true },
              { type: 'N', weight: 80, reps: 8, completed: true }
            ]
          },
          {
            exerciseId: 'Standing_Military_Press',
            exerciseName: 'Standing Military Press',
            sets: [
              { type: 'N', weight: 50, reps: 8, completed: true },
              { type: 'N', weight: 55, reps: 6, completed: true }
            ]
          }
        ]
      },
      {
        id: 'sample_w2',
        title: 'Lower Body & Core',
        date: new Date(now - day * 4).toISOString(),
        durationSeconds: 2800,
        notes: 'Smooth squat depth and quad drive.',
        exercises: [
          {
            exerciseId: 'Barbell_Full_Squat',
            exerciseName: 'Barbell Full Squat',
            sets: [
              { type: 'W', weight: 70, reps: 10, completed: true },
              { type: 'N', weight: 110, reps: 6, completed: true },
              { type: 'N', weight: 120, reps: 5, completed: true, isPR: true }
            ]
          },
          {
            exerciseId: 'Romanian_Deadlift',
            exerciseName: 'Romanian Deadlift',
            sets: [
              { type: 'N', weight: 90, reps: 10, completed: true },
              { type: 'N', weight: 100, reps: 8, completed: true }
            ]
          }
        ]
      }
    ];
  }

  _migrate(data) {
    if (!data || typeof data !== 'object') {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    const state = {
      version: 2,
      workouts: Array.isArray(data.workouts) ? data.workouts : [],
      customExercises: Array.isArray(data.customExercises) ? data.customExercises : [],
      favorites: Array.isArray(data.favorites) ? data.favorites : DEFAULT_STATE.favorites,
      draft: data.draft || null,
      prs: data.prs || {},
      settings: Object.assign({}, DEFAULT_STATE.settings, data.settings || {})
    };

    // Migrate old exercise IDs in workouts and draft
    const mapExerciseId = (oldId) => LEGACY_ID_MAP[oldId] || oldId;

    state.workouts.forEach(w => {
      if (Array.isArray(w.exercises)) {
        w.exercises.forEach(e => {
          if (e.exerciseId) e.exerciseId = mapExerciseId(e.exerciseId);
        });
      }
    });

    if (state.draft && Array.isArray(state.draft.exercises)) {
      state.draft.exercises.forEach(e => {
        if (e.exerciseId) e.exerciseId = mapExerciseId(e.exerciseId);
      });
    }

    state.favorites = state.favorites.map(mapExerciseId);

    return state;
  }

  _recalculatePRs() {
    const prs = {};
    for (const workout of this.state.workouts) {
      if (!Array.isArray(workout.exercises)) continue;
      for (const ex of workout.exercises) {
        const id = ex.exerciseId;
        if (!id || !Array.isArray(ex.sets)) continue;
        if (!prs[id]) {
          prs[id] = { maxWeight: 0, maxVolume: 0, max1RM: 0, bestDate: workout.date };
        }
        for (const set of ex.sets) {
          if (!set.completed) continue;
          const w = parseFloat(set.weight) || 0;
          const r = parseInt(set.reps, 10) || 0;
          if (w <= 0 || r <= 0) continue;

          // Epley 1RM formula: w * (1 + r / 30)
          const est1RM = r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10;
          const volume = w * r;

          if (w > prs[id].maxWeight) {
            prs[id].maxWeight = w;
            prs[id].bestDate = workout.date;
          }
          if (volume > prs[id].maxVolume) {
            prs[id].maxVolume = volume;
          }
          if (est1RM > prs[id].max1RM) {
            prs[id].max1RM = est1RM;
          }
        }
      }
    }
    this.state.prs = prs;
  }

  save() {
    // Debounce saves
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => this._executeSave(), 150);
  }

  async _executeSave() {
    this._recalculatePRs();
    const jsonStr = JSON.stringify(this.state);

    // Save to Capacitor Preferences
    if (this.Preferences) {
      try {
        await this.Preferences.set({
          key: APP_CONFIG.preferencesKey,
          value: jsonStr
        });
      } catch (e) {
        console.warn('Preferences save error', e);
      }
    }

    // Always mirror in localStorage for instant web access and safety
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(APP_CONFIG.preferencesKey, jsonStr);
        localStorage.setItem(APP_CONFIG.storageKey, jsonStr);
      } catch (e) {
        console.warn('localStorage save error', e);
      }
    }

    this._notifyListeners();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (e) {
        console.error('Storage listener error', e);
      }
    }
  }

  // Workouts CRUD
  getWorkouts() {
    return this.state.workouts || [];
  }

  addWorkout(workout) {
    if (!workout.id) workout.id = 'w_' + Date.now();
    this.state.workouts.unshift(workout);
    this.save();
    return workout;
  }

  deleteWorkout(id) {
    this.state.workouts = this.state.workouts.filter(w => w.id !== id);
    this.save();
  }

  // Active Draft
  getDraft() {
    return this.state.draft;
  }

  setDraft(draft) {
    this.state.draft = draft;
    this.save();
  }

  clearDraft() {
    this.state.draft = null;
    this.save();
  }

  // Custom Exercises
  getCustomExercises() {
    return this.state.customExercises || [];
  }

  addCustomExercise(exercise) {
    if (!exercise.id) exercise.id = 'custom_' + Date.now();
    this.state.customExercises.push(exercise);
    this.save();
    return exercise;
  }

  // Favorites
  isFavorite(exerciseId) {
    return (this.state.favorites || []).includes(exerciseId);
  }

  toggleFavorite(exerciseId) {
    const favs = new Set(this.state.favorites || []);
    if (favs.has(exerciseId)) {
      favs.delete(exerciseId);
    } else {
      favs.add(exerciseId);
    }
    this.state.favorites = Array.from(favs);
    this.save();
    return this.isFavorite(exerciseId);
  }

  // Settings
  getSettings() {
    return this.state.settings;
  }

  updateSettings(partial) {
    this.state.settings = Object.assign({}, this.state.settings, partial);
    this.save();
    return this.state.settings;
  }

  // Full Import / Reset
  importData(importedObj) {
    this.state = this._migrate(importedObj);
    this.save();
    return this.state;
  }
}

export const Storage = new StorageManager();
export default Storage;
