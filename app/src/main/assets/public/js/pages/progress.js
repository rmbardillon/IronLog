/**
 * IronLog Progress Page
 * Interactive SVG charts for Volume progression, 1RM progression, consistency, and muscle volume.
 */

import { Storage } from '../storage.js';
import { Charts } from '../charts.js';
import { Exercises } from '../exercises.js';
import { getIcon } from '../icons.js';
import { Native } from '../platform.js';

export function renderProgress(container) {
  const workouts = Storage.getWorkouts();
  const unit = Storage.getSettings().unit || 'kg';

  // 1. Compute all unique exercises logged in workouts
  const loggedExerciseIds = new Set();
  workouts.forEach(w => {
    (w.exercises || []).forEach(e => {
      if (e.exerciseId) loggedExerciseIds.add(e.exerciseId);
    });
  });

  const availableExercises = Array.from(loggedExerciseIds).map(id => {
    const def = Exercises.getById(id);
    return { id, name: def?.name || id };
  }).sort((a, b) => a.name.localeCompare(b.name));

  let selectedExerciseId = availableExercises[0]?.id || 'Barbell_Bench_Press_-_Medium_Grip';

  function updateView() {
    container.innerHTML = `
      <div class="page-container" style="animation: fadeIn 0.25s ease;">

        <div>
          <h1 style="font-size: var(--text-2xl); font-weight: 800; letter-spacing: -0.025em; margin-bottom: 4px;">Progress & Analytics</h1>
          <p style="font-size: var(--text-sm); color: var(--color-text-secondary);">Visualize strength gains, volume progression, and muscle balance.</p>
        </div>

        <!-- 1. Exercise 1RM Strength Progression -->
        <div class="card">
          <div style="display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h3 style="font-size: var(--text-md); font-weight: 800;">Estimated 1RM Strength</h3>
                <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Calculated via Epley formula</div>
              </div>
              <span class="badge badge-accent">Max 1RM</span>
            </div>

            <!-- Exercise Picker Selector -->
            ${availableExercises.length > 0 ? `
              <select id="progress-exercise-select" style="width: 100%; font-weight: 600;">
                ${availableExercises.map(ex => `
                  <option value="${ex.id}" ${ex.id === selectedExerciseId ? 'selected' : ''}>
                    ${escapeHtml(ex.name)}
                  </option>
                `).join('')}
              </select>
            ` : `
              <div style="font-size: 13px; color: var(--color-text-muted);">No exercises recorded yet.</div>
            `}
          </div>

          <div id="chart-1rm-mount"></div>
        </div>

        <!-- 2. Workout Volume Over Time -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
            <div>
              <h3 style="font-size: var(--text-md); font-weight: 800;">Workout Volume</h3>
              <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Total weight moved per session (${unit})</div>
            </div>
            <span class="badge">Session Volume</span>
          </div>

          <div id="chart-volume-mount"></div>
        </div>

        <!-- 3. Muscle Group Volume Balance -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
            <div>
              <h3 style="font-size: var(--text-md); font-weight: 800;">Muscle Group Balance</h3>
              <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">All-time volume distribution across muscle groups</div>
            </div>
          </div>

          <div id="chart-muscle-mount"></div>
        </div>

      </div>
    `;

    renderCharts();
    bindEvents();
  }

  function renderCharts() {
    // 1. 1RM Chart
    const mount1RM = container.querySelector('#chart-1rm-mount');
    const points1RM = getExercise1RMPoints(workouts, selectedExerciseId);
    Charts.renderLineChart(mount1RM, points1RM, {
      title: 'Estimated 1RM',
      unit,
      height: 200
    });

    // 2. Volume Chart
    const mountVol = container.querySelector('#chart-volume-mount');
    const pointsVol = getVolumePoints(workouts);
    Charts.renderLineChart(mountVol, pointsVol, {
      title: 'Total Volume',
      unit,
      height: 190
    });

    // 3. Muscle Distribution
    const mountMuscle = container.querySelector('#chart-muscle-mount');
    const { map, total } = getMuscleDistribution(workouts);
    Charts.renderMuscleBreakdown(mountMuscle, map, total, unit);
  }

  function bindEvents() {
    const selectEx = container.querySelector('#progress-exercise-select');
    if (selectEx) {
      selectEx.onchange = (e) => {
        selectedExerciseId = e.target.value;
        Native.hapticLight();
        const mount1RM = container.querySelector('#chart-1rm-mount');
        const points1RM = getExercise1RMPoints(workouts, selectedExerciseId);
        Charts.renderLineChart(mount1RM, points1RM, {
          title: 'Estimated 1RM',
          unit,
          height: 200
        });
      };
    }
  }

  updateView();
}

function getExercise1RMPoints(workouts, exerciseId) {
  const points = [];
  // Sort oldest to newest
  const sorted = workouts.slice().sort((a, b) => new Date(a.date) - new Date(b.date));

  sorted.forEach(w => {
    (w.exercises || []).forEach(e => {
      if (e.exerciseId === exerciseId) {
        let best1RM = 0;
        (e.sets || []).forEach(s => {
          if (!s.completed) return;
          const wt = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps, 10) || 0;
          if (wt > 0 && r > 0) {
            const e1rm = r === 1 ? wt : Math.round(wt * (1 + r / 30) * 10) / 10;
            if (e1rm > best1RM) best1RM = e1rm;
          }
        });
        if (best1RM > 0) {
          const d = new Date(w.date);
          points.push({
            label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            value: best1RM
          });
        }
      }
    });
  });
  return points;
}

function getVolumePoints(workouts) {
  const sorted = workouts.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  return sorted.map(w => {
    let vol = 0;
    (w.exercises || []).forEach(e => {
      (e.sets || []).forEach(s => {
        if (s.completed) {
          vol += (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0);
        }
      });
    });
    const d = new Date(w.date);
    return {
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: Math.round(vol)
    };
  }).filter(p => p.value > 0);
}

function getMuscleDistribution(workouts) {
  const map = { chest: 0, back: 0, shoulders: 0, legs: 0, arms: 0, core: 0 };
  let total = 0;

  workouts.forEach(w => {
    (w.exercises || []).forEach(e => {
      const vol = (e.sets || []).reduce((acc, s) => acc + (s.completed ? (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0) : 0), 0);
      if (vol <= 0) return;
      total += vol;

      const name = (e.exerciseName || '').toLowerCase();
      if (name.includes('bench') || name.includes('chest') || name.includes('dip')) map.chest += vol;
      else if (name.includes('squat') || name.includes('leg') || name.includes('calf') || name.includes('lunge')) map.legs += vol;
      else if (name.includes('deadlift') || name.includes('row') || name.includes('lat') || name.includes('pull')) map.back += vol;
      else if (name.includes('press') || name.includes('shoulder') || name.includes('lateral')) map.shoulders += vol;
      else if (name.includes('curl') || name.includes('tricep') || name.includes('pushdown')) map.arms += vol;
      else map.core += vol;
    });
  });

  return { map, total };
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
