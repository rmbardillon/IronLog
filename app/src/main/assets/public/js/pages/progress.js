/**
 * IronLog Weekly Summary & Analytics View
 * Displays clear weekly summaries: sessions, total time (from Time In / Out), set breakdowns (Warmup, Working, Failure),
 * total volume (warmups excluded), exercise best sets, and week-over-week comparisons.
 */

import { Storage } from '../storage.js';
import { Exercises } from '../exercises.js';
import { getIcon } from '../icons.js';
import { Native } from '../platform.js';

let weekOffset = 0; // 0 = current week, -1 = previous week, etc.

export function renderProgress(container) {
  const workouts = Storage.getWorkouts();
  const unit = Storage.getSettings().unit || 'kg';

  function updateView() {
    // 1. Calculate current selected week and previous week workouts
    const weekData = getWeeklySummaryData(workouts, weekOffset);
    const prevWeekData = getWeeklySummaryData(workouts, weekOffset - 1);

    // Week-over-week comparison
    const volChange = calculatePercentageChange(prevWeekData.totalVolume, weekData.totalVolume);
    const sessionsChange = weekData.sessionCount - prevWeekData.sessionCount;

    container.innerHTML = `
      <div class="page-container" style="animation: fadeIn 0.25s ease;">

        <!-- Page Header & Week Navigation Controls -->
        <div style="display: flex; flex-direction: column; gap: var(--space-2);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1 style="font-size: var(--text-2xl); font-weight: 800; letter-spacing: -0.025em;">Weekly Summary</h1>

            <!-- Week Navigator -->
            <div style="display: flex; align-items: center; gap: 4px;">
              <button id="summary-btn-prev-week" class="btn btn-ghost btn-sm btn-icon" title="Previous Week">${getIcon('chevronLeft', 'w-5 h-5')}</button>
              <button id="summary-btn-today" class="btn btn-ghost btn-sm" style="font-size: 12px; font-weight: 700;">Current</button>
              <button id="summary-btn-next-week" class="btn btn-ghost btn-sm btn-icon" title="Next Week">${getIcon('chevronRight', 'w-5 h-5')}</button>
            </div>
          </div>

          <div style="font-size: var(--text-sm); font-weight: 700; color: var(--color-accent);">
            📅 ${weekData.dateRangeLabel}
          </div>
        </div>

        <!-- Metric 1: Sessions & Total Session Time -->
        <div class="card" style="padding: var(--space-4);">
          <div style="font-size: var(--text-xs); font-weight: 800; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 8px;">Sessions Summary</div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3); margin-bottom: 12px;">
            <div style="background: var(--color-surface-elevated); padding: var(--space-3); border-radius: var(--radius-md);">
              <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Sessions Completed</div>
              <div style="font-size: var(--text-2xl); font-weight: 800; margin-top: 2px;">
                ${weekData.sessionCount}
              </div>
              <div style="font-size: 11px; font-weight: 700; margin-top: 4px; color: ${sessionsChange >= 0 ? 'var(--color-success)' : 'var(--color-text-muted)'};">
                ${sessionsChange >= 0 ? `▲ +${sessionsChange}` : `▼ ${sessionsChange}`} vs prev week
              </div>
            </div>

            <div style="background: var(--color-surface-elevated); padding: var(--space-3); border-radius: var(--radius-md);">
              <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Total Session Time</div>
              <div style="font-size: var(--text-2xl); font-weight: 800; color: var(--color-accent); margin-top: 2px;">
                ${formatDuration(weekData.totalDurationSeconds)}
              </div>
              <div style="font-size: 11px; color: var(--color-text-secondary); margin-top: 4px;">From Time In & Time Out</div>
            </div>
          </div>

          ${weekData.sessionTitles.length > 0 ? `
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${weekData.sessionTitles.map(t => `<span class="badge badge-accent">${escapeHtml(t)}</span>`).join('')}
            </div>
          ` : `
            <div style="font-size: 13px; color: var(--color-text-muted);">No sessions logged this week.</div>
          `}
        </div>

        <!-- Metric 2: Total Sets Completed & Type Breakdown -->
        <div class="card" style="padding: var(--space-4);">
          <div style="font-size: var(--text-xs); font-weight: 800; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 8px;">Completed Sets Breakdown</div>

          <div style="font-size: var(--text-3xl); font-weight: 800; margin-bottom: 12px;">
            ${weekData.setsCount.total} <span style="font-size: var(--text-sm); font-weight: 600; color: var(--color-text-secondary);">total completed sets</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2);">
            <div style="background: rgba(245, 158, 11, 0.14); border: 1px solid rgba(245, 158, 11, 0.4); padding: 10px; border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #f59e0b;">WARMUP</div>
              <div style="font-size: var(--text-xl); font-weight: 800; color: var(--color-text); margin-top: 2px;">${weekData.setsCount.warmup}</div>
            </div>

            <div style="background: var(--color-accent-subtle); border: 1px solid var(--color-accent); padding: 10px; border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: var(--color-accent);">WORKING</div>
              <div style="font-size: var(--text-xl); font-weight: 800; color: var(--color-text); margin-top: 2px;">${weekData.setsCount.working}</div>
            </div>

            <div style="background: rgba(239, 68, 68, 0.14); border: 1px solid rgba(239, 68, 68, 0.4); padding: 10px; border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #ef4444;">FAILURE</div>
              <div style="font-size: var(--text-xl); font-weight: 800; color: var(--color-text); margin-top: 2px;">${weekData.setsCount.failure}</div>
            </div>
          </div>
        </div>

        <!-- Metric 3: Total Volume & Week-over-Week Comparison -->
        <div class="card" style="padding: var(--space-4);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: var(--text-xs); font-weight: 800; color: var(--color-text-secondary); text-transform: uppercase;">Total Working Volume</div>
              <div style="font-size: var(--text-3xl); font-weight: 800; color: var(--color-accent); margin-top: 4px;">
                ${weekData.totalVolume.toLocaleString()} ${unit}
              </div>
            </div>

            <div style="text-align: right;">
              <span class="badge ${volChange >= 0 ? 'badge-success' : ''}" style="font-size: 13px; font-weight: 800; padding: 4px 10px;">
                ${volChange >= 0 ? `▲ +${volChange}%` : `▼ ${volChange}%`}
              </span>
              <div style="font-size: 11px; color: var(--color-text-secondary); margin-top: 4px;">vs previous week</div>
            </div>
          </div>
          <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 8px;">
            ℹ️ Calculated from completed sets. Warmup sets are excluded from total volume.
          </div>
        </div>

        <!-- Metric 4: Per Exercise Breakdown -->
        <div class="card" style="padding: var(--space-4);">
          <div style="font-size: var(--text-xs); font-weight: 800; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: var(--space-3);">Per Exercise Summary</div>

          ${weekData.exerciseBreakdown.length === 0 ? `
            <div style="text-align: center; color: var(--color-text-muted); padding: 16px;">No exercise data for this week.</div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: var(--space-2);">
              ${weekData.exerciseBreakdown.map(ex => `
                <div style="padding: 10px 12px; background: var(--color-surface-elevated); border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: 800; font-size: var(--text-base);">${escapeHtml(ex.name)}</div>
                    <div style="font-size: var(--text-xs); color: var(--color-text-secondary); margin-top: 2px;">
                      ${ex.completedSets} completed sets • Best set: <strong style="color: var(--color-text);">${ex.bestWeight} ${unit} × ${ex.bestReps} reps</strong>
                    </div>
                  </div>
                  <div style="font-weight: 800; font-size: var(--text-sm); color: var(--color-accent);">
                    ${ex.volume.toLocaleString()} ${unit}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const btnPrev = container.querySelector('#summary-btn-prev-week');
    if (btnPrev) {
      btnPrev.onclick = () => {
        weekOffset--;
        Native.hapticLight();
        updateView();
      };
    }

    const btnNext = container.querySelector('#summary-btn-next-week');
    if (btnNext) {
      btnNext.onclick = () => {
        if (weekOffset < 0) {
          weekOffset++;
          Native.hapticLight();
          updateView();
        }
      };
    }

    const btnToday = container.querySelector('#summary-btn-today');
    if (btnToday) {
      btnToday.onclick = () => {
        weekOffset = 0;
        Native.hapticLight();
        updateView();
      };
    }
  }

  updateView();
}

function getWeeklySummaryData(workouts, offset = 0) {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Monday = 0, Sunday = 6
  const dayOfWeek = (todayMidnight.getDay() + 6) % 7;
  const currentMonday = new Date(todayMidnight.getFullYear(), todayMidnight.getMonth(), todayMidnight.getDate() - dayOfWeek);
  const monday = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() + offset * 7);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);

  const startTime = monday.getTime();
  const endTime = sunday.getTime();

  const dateRangeLabel = `${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const weekWorkouts = workouts.filter(w => {
    const t = new Date(w.date || w.timeIn).getTime();
    return t >= startTime && t <= endTime;
  });

  const sessionCount = weekWorkouts.length;
  const sessionTitles = weekWorkouts.map(w => w.title || 'Workout Session');

  let totalDurationSeconds = 0;
  let totalVolume = 0;

  const setsCount = {
    total: 0,
    warmup: 0,
    working: 0,
    failure: 0
  };

  const exerciseMap = new Map();

  weekWorkouts.forEach(w => {
    totalDurationSeconds += (w.durationSeconds || 0);

    (w.exercises || []).forEach(e => {
      const exId = e.exerciseId || e.exerciseName;
      const exDef = Exercises.getById(exId);
      const exName = exDef?.name || e.exerciseName || exId;

      if (!exerciseMap.has(exId)) {
        exerciseMap.set(exId, {
          id: exId,
          name: exName,
          completedSets: 0,
          bestWeight: 0,
          bestReps: 0,
          volume: 0
        });
      }

      const exRecord = exerciseMap.get(exId);

      (e.sets || []).forEach(s => {
        if (!s.completed) return;

        setsCount.total++;
        const setType = s.type || 'Working';

        if (setType === 'Warmup') setsCount.warmup++;
        else if (setType === 'Failure') setsCount.failure++;
        else setsCount.working++;

        const wt = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps, 10) || 0;
        exRecord.completedSets++;

        if (wt > exRecord.bestWeight || (wt === exRecord.bestWeight && r > exRecord.bestReps)) {
          exRecord.bestWeight = wt;
          exRecord.bestReps = r;
        }

        // Exclude Warmup sets from volume
        if (setType !== 'Warmup' && wt > 0 && r > 0) {
          const v = wt * r;
          totalVolume += v;
          exRecord.volume += v;
        }
      });
    });
  });

  const exerciseBreakdown = Array.from(exerciseMap.values()).filter(e => e.completedSets > 0);

  return {
    dateRangeLabel,
    sessionCount,
    sessionTitles,
    totalDurationSeconds,
    setsCount,
    totalVolume: Math.round(totalVolume),
    exerciseBreakdown
  };
}

function calculatePercentageChange(oldVal, newVal) {
  if (!oldVal || oldVal <= 0) {
    return newVal > 0 ? 100 : 0;
  }
  const diff = newVal - oldVal;
  return Math.round((diff / oldVal) * 100);
}

function formatDuration(totalSecs) {
  const mins = Math.floor(totalSecs / 60);
  if (mins < 60) return `${mins} mins`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
