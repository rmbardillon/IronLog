/**
 * IronLog Exercise Library Service
 * High-performance search, filtering and indexing for 870+ exercises.
 */

import { Storage } from './storage.js';

const MUSCLE_PARENT_MAP = {
  'chest': 'chest',
  'lats': 'back',
  'middle back': 'back',
  'lower back': 'back',
  'traps': 'back',
  'shoulders': 'shoulders',
  'quadriceps': 'legs',
  'hamstrings': 'legs',
  'glutes': 'legs',
  'calves': 'legs',
  'adductors': 'legs',
  'abductors': 'legs',
  'biceps': 'arms',
  'triceps': 'arms',
  'forearms': 'arms',
  'abdominals': 'core'
};

class ExerciseService {
  constructor() {
    this.exercises = [];
    this.byId = new Map();
    this.legacyMap = {};
    this.isLoaded = false;
  }

  async init() {
    if (this.isLoaded) return;
    try {
      const res = await fetch('data/exercises.json');
      const data = await res.json();
      this.exercises = data.exercises || [];
      this.legacyMap = data.legacyIdMap || {};
      this.rebuildIndex();
      this.isLoaded = true;
    } catch (e) {
      console.error('Failed to load exercises.json', e);
    }
  }

  rebuildIndex() {
    this.byId.clear();
    // 1. Built-in exercises
    for (const ex of this.exercises) {
      this.byId.set(ex.id, ex);
    }
    // 2. Custom user exercises
    for (const custom of Storage.getCustomExercises()) {
      this.byId.set(custom.id, custom);
    }
  }

  getAll() {
    const customs = Storage.getCustomExercises();
    return customs.concat(this.exercises);
  }

  getById(id) {
    if (!id) return null;
    // Check legacy mapping first
    const targetId = this.legacyMap[id] || id;
    if (this.byId.has(targetId)) {
      return this.byId.get(targetId);
    }
    // Case-insensitive fallback
    const lower = targetId.toLowerCase();
    for (const [key, val] of this.byId.entries()) {
      if (key.toLowerCase() === lower || val.name.toLowerCase() === lower) {
        return val;
      }
    }
    return null;
  }

  filter({
    query = '',
    muscle = 'all',
    equipment = 'all',
    category = 'all',
    difficulty = 'all',
    favoritesOnly = false,
    customOnly = false
  }) {
    let list = this.getAll();

    if (customOnly) {
      list = list.filter(e => e.id.startsWith('custom_'));
    }

    if (favoritesOnly) {
      list = list.filter(e => Storage.isFavorite(e.id));
    }

    // Muscle filtering
    if (muscle && muscle !== 'all') {
      const mTarget = muscle.toLowerCase();
      list = list.filter(e => {
        const muscles = (e.primaryMuscles || []).concat(e.secondaryMuscles || []);
        return muscles.some(m => {
          const direct = m.toLowerCase();
          const parent = MUSCLE_PARENT_MAP[direct] || direct;
          return parent === mTarget || direct === mTarget;
        });
      });
    }

    // Equipment filtering
    if (equipment && equipment !== 'all') {
      const eqTarget = equipment.toLowerCase();
      list = list.filter(e => (e.equipment || '').toLowerCase().includes(eqTarget));
    }

    // Category filtering
    if (category && category !== 'all') {
      const catTarget = category.toLowerCase();
      list = list.filter(e => (e.category || '').toLowerCase() === catTarget);
    }

    // Difficulty filtering
    if (difficulty && difficulty !== 'all') {
      const diffTarget = difficulty.toLowerCase();
      list = list.filter(e => (e.difficulty || '').toLowerCase() === diffTarget);
    }

    // Search query matching
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      const terms = q.split(/\s+/);
      list = list.filter(e => {
        const nameStr = (e.name || '').toLowerCase();
        const aliasStr = (e.aliases || []).join(' ').toLowerCase();
        const muscleStr = (e.primaryMuscles || []).concat(e.secondaryMuscles || []).join(' ').toLowerCase();
        const fullSearchStr = `${nameStr} ${aliasStr} ${muscleStr} ${e.equipment || ''}`;
        return terms.every(term => fullSearchStr.includes(term));
      });
    }

    return list;
  }
}

export const Exercises = new ExerciseService();
export default Exercises;
