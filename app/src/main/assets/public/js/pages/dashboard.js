/**
 * IronLog Dashboard Page
 * Today's workout card, weekly calendar strip, streak flame, quick-start, and body heat map.
 */

import { Storage } from '../storage.js';
import { Workout } from '../workout-engine.js';
import { getIcon } from '../icons.js';
import { Native } from '../platform.js';

export function renderDashboard(container) {
  const settings = Storage.getSettings();
  const workouts = Storage.getWorkouts();
  const draft = Storage.getDraft();
  const unit = settings.unit || 'kg';

  // 1. Calculate Active Streak
  const streak = calculateStreak(workouts);

  // 2. Weekly Calendar Days (Mon - Sun of current week)
  const weekDays = getWeekDays(workouts);
  const completedThisWeek = weekDays.filter(d => d.completed).length;
  const weeklyGoal = settings.weeklyGoal || 4;

  // 3. Body Heat Map volume calculations (Chest, Back, Shoulders, Legs, Arms, Core)
  const muscleTrainedMap = getTrainedMusclesThisWeek(workouts);

  // 4. Quick-start recent templates
  const recentTemplates = getRecentTemplates(workouts);

  // Metric stats
  const totalVolumeThisWeek = calculateWeeklyVolume(workouts);
  const totalWorkouts = workouts.length;

  container.innerHTML = `
    <div class="page-container" style="animation: fadeIn 0.25s ease;">

      <!-- Top Header -->
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 1px; color: var(--color-text-secondary); font-weight: 700;">Welcome back</div>
          <h1 style="font-size: var(--text-2xl); font-weight: 800; letter-spacing: -0.025em; line-height: 1.2;">Dashboard</h1>
        </div>

        <!-- Streak Badge -->
        <div class="streak-badge">
          <span class="streak-flame-icon">${getIcon('flame', 'w-5 h-5')}</span>
          <span>${streak} Day Streak</span>
        </div>
      </div>

      <!-- Weekly Calendar Strip -->
      <div class="card" style="padding: var(--space-3) var(--space-4);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
          <div style="font-size: var(--text-sm); font-weight: 700;">Weekly Goal</div>
          <div style="font-size: var(--text-xs); font-weight: 700; color: var(--color-accent);">${completedThisWeek} / ${weeklyGoal} Workouts</div>
        </div>
        <div class="week-strip">
          ${weekDays.map(d => `
            <div class="day-cell ${d.isToday ? 'today' : ''} ${d.completed ? 'completed' : ''}">
              <span class="day-name">${d.name}</span>
              <span class="day-number">${d.dayNum}</span>
              <span class="dot"></span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Active Workout Draft Card OR Start Workout Hero Card -->
      ${draft ? `
        <div class="card" style="background: linear-gradient(135deg, rgba(249, 115, 22, 0.15), var(--color-surface-card)); border-color: var(--color-accent);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3);">
            <div>
              <span class="badge badge-accent" style="margin-bottom: 6px;">Workout In Progress</span>
              <h2 style="font-size: var(--text-lg); font-weight: 800;">${draft.title || 'Current Workout'}</h2>
              <div style="font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: 2px;">
                ${draft.exercises?.length || 0} exercises added
              </div>
            </div>
            <button id="dash-btn-resume" class="btn btn-primary">
              Resume ${getIcon('play', 'w-4 h-4')}
            </button>
          </div>
        </div>
      ` : `
        <div class="card card-elevated" style="background: linear-gradient(135deg, var(--color-surface-elevated), var(--color-surface-card)); border: 1px solid var(--color-border);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2 style="font-size: var(--text-lg); font-weight: 800;">Ready to train?</h2>
              <p style="font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: 4px;">Log sets, track rest intervals and break personal records.</p>
            </div>
            <button id="dash-btn-start-empty" class="btn btn-primary" style="flex-shrink: 0;">
              ${getIcon('plus', 'w-5 h-5')} Start Workout
            </button>
          </div>
        </div>
      `}

      <!-- Quick Start Recent Workouts -->
      ${recentTemplates.length > 0 ? `
        <div>
          <div style="font-size: var(--text-md); font-weight: 700; margin-bottom: var(--space-3);">Quick Start Recent</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-3);">
            ${recentTemplates.map((t, idx) => `
              <div class="card card-clickable quick-template-card" data-idx="${idx}" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 700; font-size: var(--text-base);">${t.title}</div>
                  <div style="font-size: var(--text-xs); color: var(--color-text-secondary); margin-top: 4px;">
                    ${t.exerciseCount} exercises • ${t.dateAgo}
                  </div>
                </div>
                <div style="color: var(--color-accent);">${getIcon('chevronRight', 'w-5 h-5')}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Muscle Groups Heat Map Card -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
          <div>
            <div style="font-size: var(--text-md); font-weight: 700;">Muscle Heat Map</div>
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Targeted body parts this week</div>
          </div>
          <span class="badge">${completedThisWeek} Sessions</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: var(--space-2);">
          ${['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'].map(group => {
            const key = group.toLowerCase();
            const vol = muscleTrainedMap[key] || 0;
            const isTrained = vol > 0;
            return `
              <div style="padding: var(--space-3); border-radius: var(--radius-lg); background-color: ${isTrained ? 'var(--color-accent-subtle)' : 'var(--color-surface)'}; border: 1px solid ${isTrained ? 'var(--color-accent)' : 'var(--color-border)'};">
                <div style="font-size: var(--text-sm); font-weight: 700; color: ${isTrained ? 'var(--color-accent)' : 'var(--color-text)'};">${group}</div>
                <div style="font-size: var(--text-xs); color: var(--color-text-secondary); margin-top: 2px;">
                  ${isTrained ? `${vol.toLocaleString()} ${unit}` : 'Resting'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Quick Metrics Summary -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3);">
        <div class="card" style="text-align: center; padding: var(--space-3);">
          <div style="font-size: var(--text-xs); color: var(--color-text-secondary); font-weight: 600;">Workouts</div>
          <div style="font-size: var(--text-xl); font-weight: 800; color: var(--color-text); margin-top: 2px;">${totalWorkouts}</div>
        </div>
        <div class="card" style="text-align: center; padding: var(--space-3);">
          <div style="font-size: var(--text-xs); color: var(--color-text-secondary); font-weight: 600;">Week Volume</div>
          <div style="font-size: var(--text-xl); font-weight: 800; color: var(--color-accent); margin-top: 2px;">${totalVolumeThisWeek > 1000 ? (totalVolumeThisWeek/1000).toFixed(1) + 'k' : totalVolumeThisWeek}</div>
        </div>
        <div class="card" style="text-align: center; padding: var(--space-3);">
          <div style="font-size: var(--text-xs); color: var(--color-text-secondary); font-weight: 600;">Total PRs</div>
          <div style="font-size: var(--text-xl); font-weight: 800; color: #f59e0b; margin-top: 2px;">${Object.keys(Storage.state.prs || {}).length}</div>
        </div>
      </div>

    </div>
  `;

  // Bind Interactions
  const btnResume = container.querySelector('#dash-btn-resume');
  if (btnResume) {
    btnResume.onclick = () => {
      Native.hapticLight();
      window.location.hash = '#logger';
    };
  }

  const btnStart = container.querySelector('#dash-btn-start-empty');
  if (btnStart) {
    btnStart.onclick = () => {
      Native.hapticLight();
      Workout.startWorkout();
      window.location.hash = '#logger';
    };
  }

  container.querySelectorAll('.quick-template-card').forEach(el => {
    el.onclick = () => {
      const idx = parseInt(el.dataset.idx, 10);
      const tmpl = recentTemplates[idx];
      if (tmpl && tmpl.workoutRef) {
        Native.hapticLight();
        // Start workout cloning the previous exercise structure
        Workout.startWorkout({
          title: tmpl.title,
          exercises: tmpl.workoutRef.exercises.map(e => ({
            exerciseId: e.exerciseId,
            exerciseName: e.exerciseName,
            sets: e.sets.map(s => ({
              type: s.type || 'N',
              weight: s.weight,
              reps: s.reps,
              completed: false,
              prevHint: `${s.weight} × ${s.reps}`
            }))
          }))
        });
        window.location.hash = '#logger';
      }
    };
  });
}

function calculateStreak(workouts) {
  if (!workouts || workouts.length === 0) return 0;
  const sortedDates = Array.from(new Set(
    workouts.map(w => new Date(w.date).toDateString())
  )).map(d => new Date(d)).sort((a, b) => b - a);

  let streak = 0;
  const now = new Date();
  let currentCheck = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // If trained today or yesterday, streak is live
  const firstWorkout = sortedDates[0];
  const diffHours = (currentCheck - firstWorkout) / (1000 * 3600);
  if (diffHours > 48) return 0;

  for (const date of sortedDates) {
    const diffDays = Math.round((currentCheck - date) / (1000 * 86400));
    if (diffDays <= 1) {
      streak++;
      currentCheck = date;
    } else {
      break;
    }
  }
  return Math.max(1, streak);
}

function getWeekDays(workouts) {
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 is Sunday
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekDays = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateStr = d.toDateString();
    const hasWorkout = workouts.some(w => new Date(w.date).toDateString() === dateStr);
    const isToday = d.toDateString() === now.toDateString();

    weekDays.push({
      name: dayNames[i],
      dayNum: d.getDate(),
      completed: hasWorkout,
      isToday
    });
  }
  return weekDays;
}

function getTrainedMusclesThisWeek(workouts) {
  const map = { chest: 0, back: 0, shoulders: 0, legs: 0, arms: 0, core: 0 };
  const oneWeekAgo = Date.now() - 7 * 86400000;

  workouts.forEach(w => {
    if (new Date(w.date).getTime() < oneWeekAgo) return;
    (w.exercises || []).forEach(e => {
      const vol = (e.sets || []).reduce((acc, s) => acc + (s.completed ? (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0) : 0), 0);
      const name = (e.exerciseName || '').toLowerCase();
      if (name.includes('bench') || name.includes('chest') || name.includes('dip')) map.chest += vol;
      else if (name.includes('squat') || name.includes('leg') || name.includes('calf') || name.includes('lunge')) map.legs += vol;
      else if (name.includes('deadlift') || name.includes('row') || name.includes('lat') || name.includes('pull')) map.back += vol;
      else if (name.includes('press') || name.includes('shoulder') || name.includes('lateral')) map.shoulders += vol;
      else if (name.includes('curl') || name.includes('tricep') || name.includes('pushdown')) map.arms += vol;
      else map.core += vol;
    });
  });
  return map;
}

function calculateWeeklyVolume(workouts) {
  const oneWeekAgo = Date.now() - 7 * 86400000;
  let total = 0;
  workouts.forEach(w => {
    if (new Date(w.date).getTime() < oneWeekAgo) return;
    (w.exercises || []).forEach(e => {
      (e.sets || []).forEach(s => {
        if (s.completed) total += (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0);
      });
    });
  });
  return Math.round(total);
}

function getRecentTemplates(workouts) {
  const uniqueTitles = new Map();
  for (const w of workouts) {
    if (uniqueTitles.size >= 3) break;
    if (!uniqueTitles.has(w.title)) {
      const d = new Date(w.date);
      const daysAgo = Math.round((Date.now() - d.getTime()) / 86400000);
      uniqueTitles.set(w.title, {
        title: w.title,
        exerciseCount: w.exercises?.length || 0,
        dateAgo: daysAgo === 0 ? 'Today' : `${daysAgo}d ago`,
        workoutRef: w
      });
    }
  }
  return Array.from(uniqueTitles.values());
}
