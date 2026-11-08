/**
 * IronLog History Page
 * Chronological workout logs, master/detail on tablet, swipe-to-delete, and set summaries.
 */

import { Storage } from '../storage.js';
import { getIcon } from '../icons.js';
import { Native } from '../platform.js';

export function renderHistory(container) {
  let workouts = Storage.getWorkouts();
  let selectedWorkoutId = workouts[0]?.id || null;
  let searchQuery = '';
  const unit = Storage.getSettings().unit || 'kg';

  function updateView() {
    workouts = Storage.getWorkouts();

    let filtered = workouts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = workouts.filter(w => {
        const titleMatch = (w.title || '').toLowerCase().includes(q);
        const exMatch = (w.exercises || []).some(e => (e.exerciseName || '').toLowerCase().includes(q));
        return titleMatch || exMatch;
      });
    }

    if (!selectedWorkoutId && filtered.length > 0) {
      selectedWorkoutId = filtered[0].id;
    }

    const selectedWorkout = workouts.find(w => w.id === selectedWorkoutId) || filtered[0] || null;

    container.innerHTML = `
      <div class="master-detail-view" style="animation: fadeIn 0.25s ease;">

        <!-- Left / Master Column -->
        <div class="master-column" style="padding: var(--space-4);">

          <div style="margin-bottom: var(--space-4);">
            <h1 style="font-size: var(--text-2xl); font-weight: 800; letter-spacing: -0.025em; margin-bottom: 8px;">History</h1>
            <input type="search" id="history-search-input" value="${escapeHtml(searchQuery)}" placeholder="Search workouts or exercises..." style="width: 100%;" />
          </div>

          ${filtered.length === 0 ? `
            <div style="text-align: center; padding: 48px 16px; color: var(--color-text-secondary);">
              <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--color-surface); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; color: var(--color-text-muted);">
                ${getIcon('calendar', 'w-6 h-6')}
              </div>
              <div style="font-weight: 700; font-size: var(--text-md); color: var(--color-text);">No workouts found</div>
              <p style="font-size: var(--text-sm); margin-top: 4px;">Completed workouts will appear here chronologically.</p>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: var(--space-3);">
              ${filtered.map(w => renderMasterWorkoutItem(w, w.id === selectedWorkoutId)).join('')}
            </div>
          `}

        </div>

        <!-- Right / Detail Column (Visible on Tablet, or as modal/drawer on Mobile) -->
        <div class="detail-column" id="history-detail-pane">
          ${selectedWorkout ? renderDetailPane(selectedWorkout) : `
            <div style="text-align: center; padding: 64px 24px; color: var(--color-text-muted);">
              Select a workout from the list to view full details.
            </div>
          `}
        </div>

      </div>
    `;

    bindEvents();
  }

  function renderMasterWorkoutItem(w, isSelected) {
    const d = new Date(w.date);
    const dateFormatted = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const durationMins = Math.round((w.durationSeconds || 0) / 60);

    const totalVolume = (w.exercises || []).reduce((acc, e) => {
      return acc + (e.sets || []).reduce((sAcc, s) => sAcc + ((parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0)), 0);
    }, 0);

    const totalSets = (w.exercises || []).reduce((acc, e) => acc + (e.sets?.length || 0), 0);

    return `
      <div class="card card-clickable history-item-card ${isSelected ? 'selected' : ''}" data-id="${w.id}" style="padding: var(--space-3) var(--space-4); border-color: ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}; background-color: ${isSelected ? 'var(--color-accent-subtle)' : 'var(--color-surface-card)'};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-weight: 800; font-size: var(--text-md);">${escapeHtml(w.title)}</div>
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary); margin-top: 2px;">
              ${dateFormatted} • ⏱️ ${durationMins}m
            </div>
          </div>
          <span class="badge badge-accent">${totalVolume > 1000 ? (totalVolume/1000).toFixed(1) + 'k' : totalVolume} ${unit}</span>
        </div>

        <!-- Exercise preview chips -->
        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px;">
          ${(w.exercises || []).slice(0, 3).map(e => `
            <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: var(--color-surface-elevated); color: var(--color-text-secondary);">
              ${escapeHtml(e.exerciseName)}
            </span>
          `).join('')}
          ${(w.exercises || []).length > 3 ? `
            <span style="font-size: 11px; padding: 2px 6px; color: var(--color-text-muted);">
              +${w.exercises.length - 3} more
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderDetailPane(w) {
    const d = new Date(w.date);
    const dateFormatted = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const durationMins = Math.round((w.durationSeconds || 0) / 60);

    const totalVolume = (w.exercises || []).reduce((acc, e) => {
      return acc + (e.sets || []).reduce((sAcc, s) => sAcc + ((parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0)), 0);
    }, 0);

    return `
      <div style="display: flex; flex-direction: column; gap: var(--space-4);">

        <!-- Header & Delete Action -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: var(--space-3); border-bottom: 1px solid var(--color-border);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: 800;">${escapeHtml(w.title)}</h2>
            <div style="font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: 2px;">
              ${dateFormatted} • Duration: ${durationMins} mins
            </div>
          </div>

          <button id="btn-delete-workout" class="btn btn-danger-ghost btn-sm" data-id="${w.id}">
            ${getIcon('trash2', 'w-4 h-4')} Delete
          </button>
        </div>

        <!-- Stats Bar -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3);">
          <div class="card" style="text-align: center; padding: var(--space-3);">
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Total Volume</div>
            <div style="font-size: var(--text-lg); font-weight: 800; color: var(--color-accent); margin-top: 2px;">
              ${totalVolume.toLocaleString()} ${unit}
            </div>
          </div>
          <div class="card" style="text-align: center; padding: var(--space-3);">
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Exercises</div>
            <div style="font-size: var(--text-lg); font-weight: 800; margin-top: 2px;">
              ${w.exercises?.length || 0}
            </div>
          </div>
          <div class="card" style="text-align: center; padding: var(--space-3);">
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Sets Logged</div>
            <div style="font-size: var(--text-lg); font-weight: 800; margin-top: 2px;">
              ${(w.exercises || []).reduce((a, e) => a + (e.sets?.length || 0), 0)}
            </div>
          </div>
        </div>

        <!-- Exercises List -->
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          ${(w.exercises || []).map(ex => `
            <div class="card" style="padding: var(--space-3) var(--space-4);">
              <div style="font-weight: 800; font-size: var(--text-md); margin-bottom: 8px;">
                <a href="#exercise/${ex.exerciseId}" style="color: var(--color-text); text-decoration: none;">
                  ${escapeHtml(ex.exerciseName)}
                </a>
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                ${(ex.sets || []).map((s, sIdx) => `
                  <div style="display: flex; justify-content: space-between; font-size: var(--text-sm); padding: 4px 0; border-bottom: 1px solid var(--color-border-subtle);">
                    <span style="color: var(--color-text-secondary); font-weight: 600;">Set ${sIdx + 1} (${s.type || 'N'})</span>
                    <span style="font-weight: 700;">${s.weight} ${unit} × ${s.reps} reps</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

      </div>
    `;
  }

  function bindEvents() {
    const sInput = container.querySelector('#history-search-input');
    if (sInput) {
      sInput.oninput = (e) => {
        searchQuery = e.target.value;
        updateView();
      };
    }

    container.querySelectorAll('.history-item-card').forEach(card => {
      card.onclick = () => {
        selectedWorkoutId = card.dataset.id;
        Native.hapticLight();
        updateView();
      };
    });

    const btnDelete = container.querySelector('#btn-delete-workout');
    if (btnDelete) {
      btnDelete.onclick = () => {
        const id = btnDelete.dataset.id;
        if (confirm('Are you sure you want to delete this workout log?')) {
          Native.hapticLight();
          Storage.deleteWorkout(id);
          selectedWorkoutId = null;
          updateView();
        }
      };
    }
  }

  updateView();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
