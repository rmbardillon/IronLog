/**
 * IronLog Workout Logger Page
 * Exact Pixel-Perfect Match to Mockup Design.
 * Features:
 * - Sticky Header with Title, Timer, Cancel (Red), Finish (Accent Pill)
 * - Exercise Card with Thumbnail, Title, (i) Info Icon, Muscle Badge, and X Close Button
 * - Set Table with Headers: SET | WEIGHT (KG/LBS) | REPS | DONE
 * - Set Rows: N Badge | [- Weight +] Pill | [- Reps +] Pill | Checkbox
 * - + Add Set (Dashed Button inside Card)
 * - + Add Exercise (Full-Width Button below Cards)
 * - Persistent DOM Shell to Prevent Floating Rest Timer Re-render Flashing
 */

import { Workout } from '../workout-engine.js';
import { Exercises } from '../exercises.js';
import { Storage } from '../storage.js';
import { Timer } from '../timer.js';
import { Native } from '../platform.js';
import { getIcon } from '../icons.js';

export function renderLogger(container) {
  let workout = Workout.activeWorkout;
  const settings = Storage.getSettings();
  const unitLabel = (settings.unit || 'kg').toUpperCase();
  const stepIncrement = unitLabel === 'KG' ? 2.5 : 5;

  // Auto-start active workout if draft is missing
  if (!workout) {
    workout = Workout.startWorkout();
  }

  // 1. Build Persistent DOM Shell ONCE so mounts are never destroyed on re-renders
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; min-height: 100%; padding-bottom: calc(100px + var(--sab)); overflow-x: hidden; width: 100%; box-sizing: border-box;">

      <!-- Sticky Workout Header Bar Mount -->
      <div class="header-bar" id="logger-header-mount" style="position: sticky; top: 0; z-index: 40; width: 100%; box-sizing: border-box; background-color: var(--color-surface); border-bottom: 1px solid var(--color-border); padding: var(--space-3) var(--space-4); display: flex; align-items: center; justify-content: space-between; min-height: 56px;"></div>

      <!-- Exercise List Container Mount -->
      <div class="page-container" id="logger-exercises-mount" style="flex: 1; width: 100%; max-width: 900px; margin: 0 auto; padding: var(--space-4); box-sizing: border-box; overflow-x: hidden;"></div>

    </div>

    <!-- Floating Rest Timer Overlay Mount (Persistent) -->
    <div id="rest-timer-bar-mount"></div>

    <!-- Exercise Picker Modal Sheet Mount (Persistent) -->
    <div id="picker-modal-mount"></div>

    <!-- Exercise Detail Info Modal Mount (Persistent) -->
    <div id="exercise-info-mount"></div>

    <!-- Confirmation Dialog Modal Mount (Persistent) -->
    <div id="confirm-modal-mount"></div>
  `;

  function updateView() {
    workout = Workout.activeWorkout;
    if (!workout) {
      window.location.hash = '#dashboard';
      return;
    }

    const elapsedFormatted = formatTime(Workout.elapsedSeconds);

    // Update Header Mount
    const headerMount = container.querySelector('#logger-header-mount');
    if (headerMount) {
      const titleInput = headerMount.querySelector('#workout-title-input');
      const currentTitleVal = titleInput ? titleInput.value : workout.title;

      headerMount.innerHTML = `
        <div class="header-title-container" style="flex: 1; min-width: 0;">
          <input type="text" id="workout-title-input" value="${escapeHtml(currentTitleVal)}" style="font-size: var(--text-lg); font-weight: 800; background: transparent; border: none; padding: 0; color: var(--color-text); width: 100%; max-width: 240px; outline: none;" placeholder="Workout Name" />
          <div style="font-size: var(--text-xs); color: var(--color-accent); font-weight: 700; font-family: var(--font-mono); font-variant-numeric: tabular-nums; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
            ⏱️ ${elapsedFormatted}
          </div>
        </div>

        <div class="header-actions" style="display: flex; align-items: center; gap: var(--space-3); flex-shrink: 0;">
          <button id="btn-cancel-workout" class="btn btn-ghost btn-sm" style="color: var(--color-danger); font-weight: 700; font-size: var(--text-sm); padding: 0 8px;">
            Cancel
          </button>

          <button id="btn-finish-workout" class="btn btn-primary btn-sm" style="font-weight: 800; padding: 6px 20px; border-radius: var(--radius-full);">
            Finish
          </button>
        </div>
      `;
    }

    // Update Exercises List Mount
    const exercisesMount = container.querySelector('#logger-exercises-mount');
    if (exercisesMount) {
      exercisesMount.innerHTML = workout.exercises.length === 0 ? `
        <div class="card" style="text-align: center; padding: 48px 24px; border-style: dashed; width: 100%; box-sizing: border-box;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background-color: var(--color-surface-elevated); color: var(--color-accent); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
            ${getIcon('plus', 'w-8 h-8')}
          </div>
          <h3 style="font-size: var(--text-lg); font-weight: 800; margin-bottom: 6px;">Add your first exercise</h3>
          <p style="font-size: var(--text-sm); color: var(--color-text-secondary); margin-bottom: 24px;">Choose from 870+ illustrated movements or create custom exercises.</p>
          <button id="btn-add-exercise-hero" class="btn btn-primary" style="margin: 0 auto;">
            ${getIcon('search', 'w-4 h-4')} Browse Exercise Library
          </button>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: var(--space-4); width: 100%; box-sizing: border-box;">
          ${workout.exercises.map((ex, exIdx) => renderExerciseCard(ex, exIdx, unitLabel)).join('')}
        </div>

        <button id="btn-add-exercise" class="btn btn-secondary" style="width: 100%; height: 50px; border-radius: var(--radius-lg); margin-top: var(--space-4); font-weight: 800; font-size: var(--text-base); display: flex; align-items: center; justify-content: center; gap: 8px;">
          ${getIcon('plus', 'w-5 h-5')} Add Exercise
        </button>
      `;
    }

    bindEvents();
    renderRestTimerBar();
  }

  function renderExerciseCard(ex, exIdx, currentUnit) {
    const exerciseDef = Exercises.getById(ex.exerciseId);
    const thumbUrl = exerciseDef?.thumbnail || 'assets/fallback-exercise.svg';
    const primaryMuscle = exerciseDef?.primaryMuscles?.[0] || 'abdominals';

    return `
      <div class="card exercise-logger-card" data-ex-idx="${exIdx}" style="padding: 16px; width: 100%; box-sizing: border-box; overflow: hidden; background-color: var(--color-surface-card); border: 1px solid var(--color-border); border-radius: var(--radius-xl);">

        <!-- Exercise Header -->
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-2); margin-bottom: 12px;">
          <div style="display: flex; align-items: flex-start; gap: var(--space-3); min-width: 0; flex: 1;">
            <img src="${thumbUrl}" alt="${escapeHtml(ex.exerciseName)}" style="width: 44px; height: 44px; border-radius: 10px; object-fit: cover; background-color: var(--color-surface-elevated); flex-shrink: 0;" onerror="this.src='assets/fallback-exercise.svg'" />
            <div style="min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-weight: 800; font-size: var(--text-base); color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${escapeHtml(ex.exerciseName)}
                </span>
                <button class="btn-info-ex" data-ex-id="${ex.exerciseId}" style="border: none; background: transparent; color: var(--color-text-secondary); cursor: pointer; padding: 0; display: flex; align-items: center;" title="Exercise Information">
                  ${getIcon('info', 'w-4 h-4')}
                </button>
              </div>
              <div style="margin-top: 4px;">
                <span class="badge badge-accent">${escapeHtml(primaryMuscle)}</span>
              </div>
            </div>
          </div>

          <!-- X Close Button to Remove Exercise -->
          <button class="btn btn-ghost btn-sm btn-icon btn-remove-exercise" data-ex-idx="${exIdx}" title="Remove Exercise" aria-label="Remove Exercise" style="color: var(--color-text-secondary); width: 36px; height: 36px; padding: 0;">
            ${getIcon('x', 'w-5 h-5')}
          </button>
        </div>

        <!-- Table Column Headers -->
        <div class="logger-set-grid logger-table-header">
          <span>SET</span>
          <span>WEIGHT (${currentUnit})</span>
          <span>REPS</span>
          <span>DONE</span>
        </div>

        <!-- Sets List -->
        <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; box-sizing: border-box;">
          ${ex.sets.map((set, setIdx) => renderSetRow(exIdx, set, setIdx)).join('')}
        </div>

        <!-- + Add Set Button inside Exercise Card -->
        <button class="btn btn-ghost btn-sm btn-add-set" data-ex-idx="${exIdx}" style="width: 100%; height: 42px; margin-top: 12px; border: 1px dashed var(--color-border); border-radius: 10px; font-weight: 700; color: var(--color-text); display: flex; align-items: center; justify-content: center; gap: 6px;">
          ${getIcon('plus', 'w-4 h-4')} Add Set
        </button>

      </div>
    `;
  }

  function renderSetRow(exIdx, set, setIdx) {
    const isCompleted = set.completed;
    const setType = set.type || 'N';

    return `
      <div class="set-row" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">

        <!-- Column 1: SET Badge -->
        <div style="display: flex; justify-content: center;">
          <button class="set-badge-box type-${setType} btn-toggle-set-type" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" title="Set Type: Normal (N), Warmup (W), Dropset (D), Failure (F)">
            ${setType}
          </button>
        </div>

        <!-- Column 2: WEIGHT (- Value +) Stepper Pill -->
        <div class="stepper-pill">
          <button class="stepper-pill-btn btn-stepper-sub-w" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" title="Decrease Weight">−</button>
          <input type="number" step="0.5" class="stepper-pill-input input-set-weight" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" value="${set.weight}" aria-label="Weight" />
          <button class="stepper-pill-btn btn-stepper-add-w" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" title="Increase Weight">+</button>
        </div>

        <!-- Column 3: REPS (- Value +) Stepper Pill -->
        <div class="stepper-pill">
          <button class="stepper-pill-btn btn-stepper-sub-r" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" title="Decrease Reps">−</button>
          <input type="number" step="1" class="stepper-pill-input input-set-reps" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" value="${set.reps}" aria-label="Reps" />
          <button class="stepper-pill-btn btn-stepper-add-r" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" title="Increase Reps">+</button>
        </div>

        <!-- Column 4: DONE Checkbox -->
        <div style="display: flex; justify-content: center;">
          <button class="set-checkbox-box ${isCompleted ? 'completed' : ''} btn-check-set" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" aria-label="Mark Set Complete">
            ${isCompleted ? getIcon('check', 'w-5 h-5') : ''}
          </button>
        </div>

      </div>
    `;
  }

  function renderRestTimerBar() {
    const mount = container.querySelector('#rest-timer-bar-mount');
    if (!mount) return;

    if (!Timer.isRunning) {
      mount.innerHTML = '';
      return;
    }

    const mins = Math.floor(Timer.remainingSeconds / 60);
    const secs = Timer.remainingSeconds % 60;
    const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    let bar = mount.querySelector('#floating-rest-bar');
    if (!bar) {
      mount.innerHTML = `
        <div class="floating-active-bar" id="floating-rest-bar">
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <div style="width: 38px; height: 38px; border-radius: 50%; background-color: var(--color-accent-subtle); color: var(--color-accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${getIcon('clock', 'w-5 h-5')}
            </div>
            <div>
              <div style="font-size: var(--text-xs); color: var(--color-text-secondary); font-weight: 600;">Rest Timer</div>
              <div id="rest-timer-digits" style="font-size: var(--text-md); font-weight: 800; font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--color-accent);">${timeFormatted}</div>
            </div>
          </div>

          <div style="display: flex; gap: 6px; align-items: center;">
            <button id="btn-timer-add-15" class="btn btn-secondary btn-sm" style="font-weight: 700; min-height: 36px;">+15s</button>
            <button id="btn-timer-skip" class="btn btn-ghost btn-sm" style="font-weight: 700; min-height: 36px; color: var(--color-text-secondary);">Skip</button>
          </div>
        </div>
      `;

      const btnAdd15 = mount.querySelector('#btn-timer-add-15');
      if (btnAdd15) {
        btnAdd15.onclick = (e) => {
          e.stopPropagation();
          Native.hapticLight();
          Timer.addTime(15);
        };
      }

      const btnSkip = mount.querySelector('#btn-timer-skip');
      if (btnSkip) {
        btnSkip.onclick = (e) => {
          e.stopPropagation();
          Native.hapticLight();
          Timer.stop();
        };
      }
    } else {
      const digitsEl = bar.querySelector('#rest-timer-digits');
      if (digitsEl) {
        digitsEl.textContent = timeFormatted;
      }
    }
  }

  function bindEvents() {
    // Title editing
    const titleInput = container.querySelector('#workout-title-input');
    if (titleInput) {
      titleInput.oninput = (e) => {
        if (Workout.activeWorkout) {
          Workout.activeWorkout.title = e.target.value;
          Workout._persist();
        }
      };
    }

    // Cancel / Discard Workout
    const btnCancel = container.querySelector('#btn-cancel-workout');
    if (btnCancel) {
      btnCancel.onclick = () => {
        showConfirmationModal({
          title: 'Discard Workout?',
          message: 'Are you sure you want to discard this active workout? All progress will be lost.',
          confirmText: 'Discard',
          confirmDanger: true,
          onConfirm: () => {
            Native.hapticLight();
            Workout.cancelWorkout();
            window.location.hash = '#dashboard';
          }
        });
      };
    }

    // Finish Workout
    const btnFinish = container.querySelector('#btn-finish-workout');
    if (btnFinish) {
      btnFinish.onclick = () => {
        Native.hapticSuccess();
        const finished = Workout.finishWorkout();
        if (finished) {
          showFinishCelebrationModal(finished);
        }
      };
    }

    // Add Exercise Buttons
    const btnAdd = container.querySelector('#btn-add-exercise') || container.querySelector('#btn-add-exercise-hero');
    if (btnAdd) {
      btnAdd.onclick = () => {
        Native.hapticLight();
        openExercisePickerModal();
      };
    }

    // Exercise Info (i) Icon
    container.querySelectorAll('.btn-info-ex').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const exId = btn.dataset.exId;
        openExerciseInfoModal(exId);
      };
    });

    // Remove Exercise (X Button)
    container.querySelectorAll('.btn-remove-exercise').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.exIdx, 10);
        const ex = workout.exercises[idx];
        showConfirmationModal({
          title: 'Remove Exercise?',
          message: `Are you sure you want to remove ${ex?.exerciseName || 'this exercise'}?`,
          confirmText: 'Remove',
          confirmDanger: true,
          onConfirm: () => {
            Native.hapticLight();
            Workout.removeExercise(idx);
            updateView();
          }
        });
      };
    });

    // Add Set Button
    container.querySelectorAll('.btn-add-set').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.exIdx, 10);
        Native.hapticLight();
        Workout.addSet(idx);
        updateView();
      };
    });

    // Toggle Set Type (N -> W -> D -> F -> N)
    container.querySelectorAll('.btn-toggle-set-type').forEach(tag => {
      tag.onclick = () => {
        const exIdx = parseInt(tag.dataset.exIdx, 10);
        const setIdx = parseInt(tag.dataset.setIdx, 10);
        const set = workout.exercises[exIdx].sets[setIdx];
        const types = ['N', 'W', 'D', 'F'];
        const next = types[(types.indexOf(set.type || 'N') + 1) % types.length];
        Workout.updateSet(exIdx, setIdx, { type: next });
        Native.hapticLight();
        updateView();
      };
    });

    // Stepper Weight -
    container.querySelectorAll('.btn-stepper-sub-w').forEach(btn => {
      btn.onclick = () => {
        const exIdx = parseInt(btn.dataset.exIdx, 10);
        const setIdx = parseInt(btn.dataset.setIdx, 10);
        const set = workout.exercises[exIdx].sets[setIdx];
        const newW = Math.max(0, Math.round(((parseFloat(set.weight) || 0) - stepIncrement) * 10) / 10);
        Workout.updateSet(exIdx, setIdx, { weight: newW });
        Native.hapticLight();
        updateView();
      };
    });

    // Stepper Weight +
    container.querySelectorAll('.btn-stepper-add-w').forEach(btn => {
      btn.onclick = () => {
        const exIdx = parseInt(btn.dataset.exIdx, 10);
        const setIdx = parseInt(btn.dataset.setIdx, 10);
        const set = workout.exercises[exIdx].sets[setIdx];
        const newW = Math.round(((parseFloat(set.weight) || 0) + stepIncrement) * 10) / 10;
        Workout.updateSet(exIdx, setIdx, { weight: newW });
        Native.hapticLight();
        updateView();
      };
    });

    // Stepper Reps -
    container.querySelectorAll('.btn-stepper-sub-r').forEach(btn => {
      btn.onclick = () => {
        const exIdx = parseInt(btn.dataset.exIdx, 10);
        const setIdx = parseInt(btn.dataset.setIdx, 10);
        const set = workout.exercises[exIdx].sets[setIdx];
        const newR = Math.max(1, (parseInt(set.reps, 10) || 0) - 1);
        Workout.updateSet(exIdx, setIdx, { reps: newR });
        Native.hapticLight();
        updateView();
      };
    });

    // Stepper Reps +
    container.querySelectorAll('.btn-stepper-add-r').forEach(btn => {
      btn.onclick = () => {
        const exIdx = parseInt(btn.dataset.exIdx, 10);
        const setIdx = parseInt(btn.dataset.setIdx, 10);
        const set = workout.exercises[exIdx].sets[setIdx];
        const newR = (parseInt(set.reps, 10) || 0) + 1;
        Workout.updateSet(exIdx, setIdx, { reps: newR });
        Native.hapticLight();
        updateView();
      };
    });

    // Direct Weight & Reps inputs
    container.querySelectorAll('.input-set-weight').forEach(input => {
      input.onchange = (e) => {
        const exIdx = parseInt(input.dataset.exIdx, 10);
        const setIdx = parseInt(input.dataset.setIdx, 10);
        Workout.updateSet(exIdx, setIdx, { weight: parseFloat(e.target.value) || 0 });
      };
    });

    container.querySelectorAll('.input-set-reps').forEach(input => {
      input.onchange = (e) => {
        const exIdx = parseInt(input.dataset.exIdx, 10);
        const setIdx = parseInt(input.dataset.setIdx, 10);
        Workout.updateSet(exIdx, setIdx, { reps: parseInt(e.target.value, 10) || 0 });
      };
    });

    // Toggle Set Completion
    container.querySelectorAll('.btn-check-set').forEach(btn => {
      btn.onclick = () => {
        const exIdx = parseInt(btn.dataset.exIdx, 10);
        const setIdx = parseInt(btn.dataset.setIdx, 10);
        Workout.toggleSetCompletion(exIdx, setIdx);
        updateView();
      };
    });
  }

  function openExerciseInfoModal(exerciseId) {
    const mount = container.querySelector('#exercise-info-mount');
    if (!mount) return;

    const ex = Exercises.getById(exerciseId);
    if (!ex) return;

    mount.innerHTML = `
      <div class="sheet-backdrop active" id="info-backdrop"></div>
      <div class="sheet-container active" style="padding: var(--space-6) var(--space-4);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
          <h3 style="font-size: var(--text-xl); font-weight: 800;">${escapeHtml(ex.name)}</h3>
          <button id="btn-close-info" class="btn btn-ghost btn-sm btn-icon">${getIcon('x')}</button>
        </div>

        <img src="${ex.thumbnail || 'assets/fallback-exercise.svg'}" alt="" style="width: 100%; height: 180px; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: var(--space-3); background: var(--color-surface-elevated);" onerror="this.src='assets/fallback-exercise.svg'" />

        <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-3);">
          <span class="badge badge-accent">${ex.primaryMuscles?.join(', ') || 'Strength'}</span>
          <span class="badge">${ex.equipment || 'Bodyweight'}</span>
        </div>

        <p style="font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.5; margin-bottom: var(--space-4);">
          ${escapeHtml(ex.instructions?.join(' ') || 'Follow proper form and control the movement throughout the full range of motion.')}
        </p>

        <button id="btn-done-info" class="btn btn-primary" style="width: 100%;">Close</button>
      </div>
    `;

    const closeInfo = () => { mount.innerHTML = ''; };
    mount.querySelector('#info-backdrop').onclick = closeInfo;
    mount.querySelector('#btn-close-info').onclick = closeInfo;
    mount.querySelector('#btn-done-info').onclick = closeInfo;
  }

  function openExercisePickerModal() {
    const mount = container.querySelector('#picker-modal-mount');
    if (!mount) return;

    let selectedMuscle = 'all';
    let searchQuery = '';

    function renderPicker() {
      const filtered = Exercises.filter({
        query: searchQuery,
        muscle: selectedMuscle
      }).slice(0, 50);

      mount.innerHTML = `
        <div class="sheet-backdrop active" id="picker-backdrop"></div>
        <div class="sheet-container active" style="height: 85vh; display: flex; flex-direction: column;">
          <div class="sheet-handle"></div>

          <div style="padding: 0 var(--space-4) var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); display: flex; flex-direction: column; gap: var(--space-2);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="font-size: var(--text-lg); font-weight: 800;">Select Exercise</h3>
              <button id="btn-close-picker" class="btn btn-ghost btn-sm btn-icon">${getIcon('x')}</button>
            </div>

            <input type="search" id="picker-search-input" placeholder="Search 870+ exercises..." value="${escapeHtml(searchQuery)}" style="width: 100%;" autofocus />

            <!-- Quick Muscle Filter Chips -->
            <div class="chips-scroll" style="padding-bottom: 4px;">
              ${['all', 'chest', 'back', 'shoulders', 'legs', 'arms', 'core'].map(m => `
                <div class="chip ${selectedMuscle === m ? 'active' : ''} picker-muscle-chip" data-muscle="${m}">
                  ${m.charAt(0).toUpperCase() + m.slice(1)}
                </div>
              `).join('')}
            </div>
          </div>

          <div class="sheet-content" style="flex: 1; padding: var(--space-2) var(--space-4);">
            <div style="display: flex; flex-direction: column; gap: var(--space-2);">
              ${filtered.map(item => `
                <div class="card card-clickable picker-item-row" data-id="${item.id}" style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3);">
                  <img src="${item.thumbnail || 'assets/fallback-exercise.svg'}" alt="" style="width: 44px; height: 44px; border-radius: 10px; object-fit: cover; background: var(--color-surface-elevated);" onerror="this.src='assets/fallback-exercise.svg'" />
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; font-size: var(--text-base);">${escapeHtml(item.name)}</div>
                    <div style="font-size: var(--text-xs); color: var(--color-text-secondary); margin-top: 2px;">
                      ${item.primaryMuscles?.join(', ') || ''} • ${item.equipment || ''}
                    </div>
                  </div>
                  <div style="color: var(--color-accent);">${getIcon('plus', 'w-5 h-5')}</div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      `;

      // Picker Bindings
      mount.querySelector('#btn-close-picker').onclick = closePicker;
      mount.querySelector('#picker-backdrop').onclick = closePicker;

      const sInput = mount.querySelector('#picker-search-input');
      sInput.oninput = (e) => {
        searchQuery = e.target.value;
        renderPickerListOnly();
      };

      mount.querySelectorAll('.picker-muscle-chip').forEach(chip => {
        chip.onclick = () => {
          selectedMuscle = chip.dataset.muscle;
          Native.hapticLight();
          renderPicker();
        };
      });

      mount.querySelectorAll('.picker-item-row').forEach(row => {
        row.onclick = () => {
          const id = row.dataset.id;
          Native.hapticLight();
          Workout.addExercise(id);
          closePicker();
          updateView();
        };
      });
    }

    function renderPickerListOnly() {
      const filtered = Exercises.filter({
        query: searchQuery,
        muscle: selectedMuscle
      }).slice(0, 50);

      const listMount = mount.querySelector('.sheet-content div');
      if (!listMount) return;

      listMount.innerHTML = filtered.map(item => `
        <div class="card card-clickable picker-item-row" data-id="${item.id}" style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3);">
          <img src="${item.thumbnail || 'assets/fallback-exercise.svg'}" alt="" style="width: 44px; height: 44px; border-radius: 10px; object-fit: cover; background: var(--color-surface-elevated);" onerror="this.src='assets/fallback-exercise.svg'" />
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: var(--text-base);">${escapeHtml(item.name)}</div>
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary); margin-top: 2px;">
              ${item.primaryMuscles?.join(', ') || ''} • ${item.equipment || ''}
            </div>
          </div>
          <div style="color: var(--color-accent);">${getIcon('plus', 'w-5 h-5')}</div>
        </div>
      `).join('');

      listMount.querySelectorAll('.picker-item-row').forEach(row => {
        row.onclick = () => {
          const id = row.dataset.id;
          Native.hapticLight();
          Workout.addExercise(id);
          closePicker();
          updateView();
        };
      });
    }

    function closePicker() {
      mount.innerHTML = '';
    }

    renderPicker();
  }

  function showConfirmationModal({ title, message, confirmText, cancelText = 'Cancel', confirmDanger, onConfirm }) {
    const mount = container.querySelector('#confirm-modal-mount');
    if (!mount) return;

    mount.innerHTML = `
      <div class="sheet-backdrop active" id="confirm-backdrop"></div>
      <div class="sheet-container active" style="text-align: center; padding: var(--space-6) var(--space-4);">
        <h3 style="font-size: var(--text-xl); font-weight: 800; margin-bottom: var(--space-2);">${escapeHtml(title)}</h3>
        <p style="color: var(--color-text-secondary); font-size: var(--text-base); margin-bottom: var(--space-6);">${escapeHtml(message)}</p>

        <div style="display: flex; gap: var(--space-3);">
          <button id="btn-confirm-cancel" class="btn btn-secondary" style="flex: 1;">${escapeHtml(cancelText)}</button>
          <button id="btn-confirm-ok" class="btn ${confirmDanger ? 'btn-danger' : 'btn-primary'}" style="flex: 1;">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    const closeConfirm = () => { mount.innerHTML = ''; };
    mount.querySelector('#confirm-backdrop').onclick = closeConfirm;
    mount.querySelector('#btn-confirm-cancel').onclick = closeConfirm;
    mount.querySelector('#btn-confirm-ok').onclick = () => {
      closeConfirm();
      if (onConfirm) onConfirm();
    };
  }

  function showFinishCelebrationModal(workoutData) {
    const totalVolume = (workoutData.exercises || []).reduce((acc, e) => {
      return acc + (e.sets || []).reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0);
    }, 0);

    const modal = document.createElement('div');
    modal.innerHTML = `
      <div class="sheet-backdrop active"></div>
      <div class="sheet-container active" style="text-align: center; padding: var(--space-6) var(--space-4);">
        <div style="font-size: 56px; margin-bottom: 12px; animation: checkBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);">🎉</div>
        <h2 style="font-size: var(--text-2xl); font-weight: 800; margin-bottom: 6px;">Workout Crushed!</h2>
        <p style="color: var(--color-text-secondary); font-size: var(--text-base); margin-bottom: 24px;">Great effort! Here is your summary:</p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); margin-bottom: 32px;">
          <div class="card" style="padding: var(--space-3);">
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Time</div>
            <div style="font-size: var(--text-md); font-weight: 800; margin-top: 4px;">${formatTime(workoutData.durationSeconds)}</div>
          </div>
          <div class="card" style="padding: var(--space-3);">
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Volume</div>
            <div style="font-size: var(--text-md); font-weight: 800; color: var(--color-accent); margin-top: 4px;">${totalVolume.toLocaleString()} ${unitLabel}</div>
          </div>
          <div class="card" style="padding: var(--space-3);">
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Sets</div>
            <div style="font-size: var(--text-md); font-weight: 800; margin-top: 4px;">${workoutData.exercises.reduce((a, e) => a + e.sets.length, 0)}</div>
          </div>
        </div>

        <button id="btn-done-modal" class="btn btn-primary" style="width: 100%;">
          View in History
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-done-modal').onclick = () => {
      modal.remove();
      window.location.hash = '#history';
    };
  }

  // Hook live updates from timer
  const unsubTimer = Timer.subscribe(() => {
    if (!document.body.contains(container)) {
      unsubTimer();
      return;
    }
    renderRestTimerBar();
  });

  const unsubWorkout = Workout.subscribe(() => {
    if (!document.body.contains(container)) {
      unsubWorkout();
      return;
    }
    // Update header timer digits smoothly
    const timerDisplay = container.querySelector('#logger-header-mount div');
    if (timerDisplay) {
      const elapsedFormatted = formatTime(Workout.elapsedSeconds);
      timerDisplay.textContent = `⏱️ ${elapsedFormatted}`;
    }
  });

  updateView();
}

function formatTime(totalSecs) {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
