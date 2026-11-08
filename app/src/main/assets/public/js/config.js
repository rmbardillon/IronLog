/**
 * IronLog Application Configuration & Constants
 */

export const APP_CONFIG = {
  name: 'IronLog',
  version: '2.0.0',
  storageKey: 'ironlog.v1',
  preferencesKey: 'ironlog_state',
  defaultRestTime: 90, // seconds
  defaultWeeklyGoal: 4, // days
  defaultUnit: 'kg' // 'kg' | 'lb'
};

export const ACCENTS = [
  { id: 'orange', name: 'Iron Orange', hex: '#f97316' },
  { id: 'blue', name: 'Electric Blue', hex: '#3b82f6' },
  { id: 'green', name: 'Emerald', hex: '#10b981' },
  { id: 'purple', name: 'Violet', hex: '#8b5cf6' },
  { id: 'pink', name: 'Neon Pink', hex: '#ec4899' }
];

export const THEMES = [
  { id: 'system', name: 'System (Auto)' },
  { id: 'dark', name: 'Dark Mode' },
  { id: 'light', name: 'Light Mode' }
];

export const MUSCLE_GROUPS = [
  { id: 'all', name: 'All Muscles' },
  { id: 'chest', name: 'Chest' },
  { id: 'back', name: 'Back' },
  { id: 'shoulders', name: 'Shoulders' },
  { id: 'legs', name: 'Legs' },
  { id: 'arms', name: 'Arms' },
  { id: 'core', name: 'Core / Abs' }
];

export const EQUIPMENT_TYPES = [
  { id: 'all', name: 'All Equipment' },
  { id: 'barbell', name: 'Barbell' },
  { id: 'dumbbell', name: 'Dumbbell' },
  { id: 'cable', name: 'Cable' },
  { id: 'machine', name: 'Machine' },
  { id: 'bodyweight', name: 'Bodyweight' },
  { id: 'kettlebell', name: 'Kettlebell' },
  { id: 'resistance band', name: 'Bands' },
  { id: 'e-z curl bar', name: 'EZ-Bar' },
  { id: 'exercise ball', name: 'Ball' }
];

export const CATEGORIES = [
  { id: 'all', name: 'All Categories' },
  { id: 'strength', name: 'Strength' },
  { id: 'powerlifting', name: 'Powerlifting' },
  { id: 'olympic weightlifting', name: 'Olympic' },
  { id: 'plyometrics', name: 'Plyometrics' },
  { id: 'stretching', name: 'Stretching' },
  { id: 'cardio', name: 'Cardio' }
];
