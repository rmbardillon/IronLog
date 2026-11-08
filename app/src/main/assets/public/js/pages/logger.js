/**
 * IronLog Workout Logger Page
 * Features:
 * - Session Date Picker (Backdated logging to May, Oct 6, etc.)
 * - Session Lock (READ-ONLY after Time Out)
 * - Time In / Time Out Controls
 * - High-Contrast Responsive Stepper Pills (- and +)
 * - Fast Backdated Entry ("Add Another Session")
 */

import { Workout } from '../workout-engine.js';
import { Exercises } from '../exercises.js';
import { Storage } from '../storage.js';
import { Native } from '../platform.js';
import { getIcon } from '../icons.js';

export function renderLogger(container) {
  let workout = Workout.activeWorkout;
  const settings = Storage.getSettings();
  const unitLabel = (settings.unit || 'kg').toUpperCase();
  const stepIncrement = unitLabel === 'KG' ? 2.5 : 5;

  if (!workout) {
    workout = Workout.startWorkout();
  }

  // Build static container shell ONCE
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; min-height: 100%; padding-bottom: calc(90px + var(--sab)); overflow-x: hidden; width: 100%; box-sizing: border-box;">

      <!-- Header & Time In/Out Bar Mount -->
      <div id="logger-header-mount" style="position: sticky; top: 0; z-index: 40; width: 100%; box-sizing: border-box; background-color: var(--color-surface); border-bottom: 1px solid var(--color-border); padding: var(--space-3) var(--space-4);"></div>

      <!-- Exercise List Mount -->
      <div class="page-container" id="logger-exercises-mount" style="flex: 1; width: 100%; max-width: 900px; margin: 0 auto; padding: var(--space-4); box-sizing: border-box;"></div>

    </div>

    <!-- Modals Mount -->
    <div id="picker-modal-mount"></div>
    <div id="time-edit-modal-mount"></div>
    <div id="exercise-info-mount"></div>
    <div id="confirm-modal-mount"></div>
  `;

  function updateView() {
    workout = Workout.activeWorkout;
    if (!workout) {
      window.location.hash = '#dashboard';
      return;
    }

    renderHeader();
    renderExercisesList();
    bindEvents();
  }

  function renderHeader() {
    const mount = container.querySelector('#logger-header-mount');
    if (!mount) return;

    const isLocked = Boolean(workout.isLocked);
    const dateFormatted = toHtmlLocalDateString(workout.date || workout.timeIn);
    const timeInStr = workout.timeIn ? formatTimeDisplay(workout.timeIn) : null;
    const timeOutStr = workout.timeOut ? formatTimeDisplay(workout.timeOut) : null;
    const durationFormatted = workout.durationSeconds > 0 ? formatDuration(workout.durationSeconds) : null;

    mount.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-2); width: 100%;">

        ${isLocked ? `
          <!-- Session Lock Banner -->
          <div style="display: flex; align-items: center; justify-content: space-between; background-color: rgba(16, 185, 129, 0.15); border: 1px solid var(--color-success); color: var(--color-success); padding: 6px 12px; border-radius: var(--radius-md); font-size: var(--text-xs); font-weight: 800;">
            <span>🔒 Completed Session (Read-Only)</span>
            <button id="btn-new-session-from-locked" class="btn btn-primary btn-sm" style="font-size: 11px; padding: 2px 10px; min-height: 26px;">+ Add Another Session</button>
          </div>
        ` : ''}

        <!-- Title & Action Buttons Row -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;">
          <input type="text" id="workout-title-input" value="${escapeHtml(workout.title)}" style="font-size: var(--text-base); font-weight: 800; background: transparent; border: none; color: var(--color-text); flex: 1; min-width: 0; outline: none; text-overflow: ellipsis; white-space: nowrap;" placeholder="Workout Name" ${isLocked ? 'disabled readonly' : ''} />

          ${!isLocked ? `
            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
              <button id="btn-cancel-workout" class="btn btn-ghost btn-sm" style="color: var(--color-danger); font-weight: 700; padding: 4px 8px; min-height: 32px; font-size: 12px;">Discard</button>
              <button id="btn-finish-workout" class="btn btn-primary btn-sm" style="font-weight: 800; padding: 4px 14px; min-height: 32px; font-size: 12px; border-radius: var(--radius-full);">Finish Workout</button>
            </div>
          ` : ''}
        </div>

        <!-- Date & Time Bar Row -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; background-color: var(--color-surface-elevated); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 6px 10px; font-size: 12px; box-sizing: border-box; width: 100%;">
          <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
            <span style="font-size: 12px;">📅</span>
            <input type="date" id="session-date-picker" value="${dateFormatted}" style="background: transparent; border: none; color: var(--color-text); font-size: 11px; font-weight: 700; outline: none;" ${isLocked ? 'disabled readonly' : ''} />
          </div>

          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; min-width: 0; justify-content: flex-end;">
            ${timeInStr ? `
              <span id="btn-edit-times" style="${isLocked ? '' : 'cursor: pointer; color: var(--color-accent);'} overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px;" title="${isLocked ? 'Completed' : 'Click to edit session times'}">
                In: ${timeInStr} ${timeOutStr ? `• Out: ${timeOutStr}` : ''}
              </span>
            ` : `
              <span style="color: var(--color-text-secondary); font-size: 11px;">Not timed in</span>
            `}

            ${durationFormatted ? `
              <span class="badge badge-accent" style="font-size: 10px; padding: 2px 6px;">Total: ${durationFormatted}</span>
            ` : ''}

            ${!isLocked ? `
              ${!workout.timeIn ? `
                <button id="btn-time-in" class="btn btn-primary btn-sm" style="font-size: 11px; padding: 2px 8px; min-height: 26px;">Time In</button>
              ` : !workout.timeOut ? `
                <button id="btn-time-out" class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 2px 8px; min-height: 26px; border-color: var(--color-accent); color: var(--color-accent);">Time Out</button>
              ` : `
                <button id="btn-resume-session" class="btn btn-ghost btn-sm" style="font-size: 11px; padding: 2px 8px; min-height: 26px; color: var(--color-accent); font-weight: 700;" title="Resume session timing">Resume</button>
                <button id="btn-edit-times-action" class="btn btn-ghost btn-sm" style="font-size: 11px; padding: 2px 6px; min-height: 26px;">Edit</button>
              `}
            ` : ''}
          </div>
        </div>

      </div>
    `;
  }

  function renderExercisesList() {
    const mount = container.querySelector('#logger-exercises-mount');
    if (!mount) return;

    const isLocked = Boolean(workout.isLocked);

    if (!workout.exercises || workout.exercises.length === 0) {
      mount.innerHTML = `
        <div class="card" style="text-align: center; padding: 48px 24px; border-style: dashed; width: 100%; box-sizing: border-box;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background-color: var(--color-surface-elevated); color: var(--color-accent); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
            ${getIcon('plus', 'w-7 h-7')}
          </div>
          <h3 style="font-size: var(--text-lg); font-weight: 800; margin-bottom: 6px;">No exercises yet</h3>
          <p style="font-size: var(--text-sm); color: var(--color-text-secondary); margin-bottom: 24px;">Tap below to add exercises to your session.</p>
          ${!isLocked ? `
            <button id="btn-add-exercise-hero" class="btn btn-primary" style="margin: 0 auto;">
              ${getIcon('plus', 'w-4 h-4')} Add Exercise
            </button>
          ` : ''}
        </div>
      `;
      return;
    }

    mount.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-4); width: 100%;">
        ${workout.exercises.map((ex, exIdx) => renderExerciseCard(ex, exIdx, isLocked)).join('')}
      </div>

      ${!isLocked ? `
        <button id="btn-add-exercise" class="btn btn-secondary" style="width: 100%; height: 48px; border-radius: var(--radius-lg); margin-top: var(--space-4); font-weight: 800; font-size: var(--text-base); display: flex; align-items: center; justify-content: center; gap: 8px;">
          ${getIcon('plus', 'w-5 h-5')} Add Exercise
        </button>
      ` : ''}
    `;
  }

  function renderExerciseCard(ex, exIdx, isLocked) {
    const exerciseDef = Exercises.getById(ex.exerciseId);
    const thumbUrl = exerciseDef?.thumbnail || 'assets/fallback-exercise.svg';
    const primaryMuscle = exerciseDef?.primaryMuscles?.[0] || 'Strength';

    return `
      <div class="card exercise-logger-card" data-ex-idx="${exIdx}" style="padding: 14px; width: 100%; box-sizing: border-box; background-color: var(--color-surface-card); border: 1px solid var(--color-border); border-radius: var(--radius-xl);">

        <!-- Exercise Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: var(--space-3); min-width: 0; flex: 1;">
            <img src="${thumbUrl}" alt="" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover; background-color: var(--color-surface-elevated); flex-shrink: 0;" onerror="this.src='assets/fallback-exercise.svg'" />
            <div style="min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-weight: 800; font-size: var(--text-base); color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${escapeHtml(ex.exerciseName)}
                </span>
                <button class="btn-info-ex" data-ex-id="${ex.exerciseId}" style="border: none; background: transparent; color: var(--color-text-secondary); cursor: pointer; padding: 0;" title="Exercise Info">
                  ${getIcon('info', 'w-4 h-4')}
                </button>
              </div>
              <span class="badge badge-accent" style="margin-top: 2px;">${escapeHtml(primaryMuscle)}</span>
            </div>
          </div>

          ${!isLocked ? `
            <button class="btn btn-ghost btn-sm btn-icon btn-remove-exercise" data-ex-idx="${exIdx}" title="Remove Exercise" style="color: var(--color-text-secondary); width: 32px; height: 32px; padding: 0;">
              ${getIcon('x', 'w-5 h-5')}
            </button>
          ` : ''}
        </div>

        <!-- Table Column Headers -->
        <div style="display: grid; grid-template-columns: 24px 50px 1fr 1fr 34px ${isLocked ? '0px' : '24px'}; gap: 4px; align-items: center; font-size: 10px; font-weight: 800; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 8px; text-align: center;">
          <span>#</span>
          <span>TYPE</span>
          <span>WT (${unitLabel})</span>
          <span>REPS</span>
          <span>DONE</span>
          <span></span>
        </div>

        <!-- Set Rows -->
        <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
          ${ex.sets.map((set, setIdx) => renderSetRow(exIdx, set, setIdx, isLocked)).join('')}
        </div>

        ${!isLocked ? `
          <button class="btn btn-ghost btn-sm btn-add-set" data-ex-idx="${exIdx}" style="width: 100%; height: 38px; margin-top: 10px; border: 1px dashed var(--color-border); border-radius: 8px; font-weight: 700; color: var(--color-text); display: flex; align-items: center; justify-content: center; gap: 6px;">
            ${getIcon('plus', 'w-4 h-4')} Add Set
          </button>
        ` : ''}

      </div>
    `;
  }

  function renderSetRow(exIdx, set, setIdx, isLocked) {
    const isCompleted = set.completed;
    const setType = set.type || 'Working';

    return `
      <div class="set-row" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" style="display: grid; grid-template-columns: 24px 50px 1fr 1fr 34px ${isLocked ? '0px' : '24px'}; gap: 4px; align-items: center; background-color: ${isCompleted ? 'var(--color-surface-hover)' : 'var(--color-surface)'}; border-radius: 8px; padding: 4px 2px; border: 1px solid ${isCompleted ? 'transparent' : 'var(--color-border-subtle)'}; box-sizing: border-box; width: 100%;">

        <!-- Column 1: SET # -->
        <div style="font-weight: 800; font-size: 11px; color: var(--color-text-secondary); text-align: center;">
          ${setIdx + 1}
        </div>

        <!-- Column 2: TYPE Badge -->
        <div style="display: flex; justify-content: center;">
          <button class="set-badge-box type-${setType} ${isLocked ? '' : 'btn-toggle-set-type'}" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" ${isLocked ? 'disabled' : ''}>
            ${setType === 'Warmup' ? 'WARM' : setType === 'Failure' ? 'FAIL' : 'WORK'}
          </button>
        </div>

        <!-- Column 3: WEIGHT (- Value +) Stepper Pill -->
        <div class="stepper-pill">
          ${!isLocked ? `<button class="stepper-pill-btn btn-stepper-sub-w" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">−</button>` : ''}
          <input type="number" inputmode="decimal" step="0.5" pattern="[0-9]*" class="stepper-pill-input input-set-weight" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" value="${set.weight}" ${isLocked ? 'disabled readonly' : ''} />
          ${!isLocked ? `<button class="stepper-pill-btn btn-stepper-add-w" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">+</button>` : ''}
        </div>

        <!-- Column 4: REPS (- Value +) Stepper Pill -->
        <div class="stepper-pill">
          ${!isLocked ? `<button class="stepper-pill-btn btn-stepper-sub-r" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">−</button>` : ''}
          <input type="number" inputmode="numeric" step="1" pattern="[0-9]*" class="stepper-pill-input input-set-reps" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" value="${set.reps}" ${isLocked ? 'disabled readonly' : ''} />
          ${!isLocked ? `<button class="stepper-pill-btn btn-stepper-add-r" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">+</button>` : ''}
        </div>

        <!-- Column 5: DONE Checkbox -->
        <div style="display: flex; justify-content: center;">
          <button class="set-checkbox-box ${isCompleted ? 'completed' : ''} ${isLocked ? '' : 'btn-check-set'}" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" ${isLocked ? 'disabled' : ''}>
            ${isCompleted ? getIcon('check', 'w-4 h-4') : ''}
          </button>
        </div>

        <!-- Column 6: Delete Set Button -->
        ${!isLocked ? `
          <div style="display: flex; justify-content: center;">
            <button class="btn btn-ghost btn-delete-set" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" title="Delete Set" style="padding: 0; color: var(--color-text-muted); width: 22px; height: 22px; border: none; background: transparent;">
              ${getIcon('trash2', 'w-3.5 h-3.5')}
            </button>
          </div>
        ` : '<div></div>'}

      </div>
    `;
  }

  function bindEvents() {
    if (workout.isLocked) {
      const btnNewSession = container.querySelector('#btn-new-session-from-locked');
      if (btnNewSession) {
        btnNewSession.onclick = () => {
          Native.hapticLight();
          Workout.startWorkout();
          updateView();
        };
      }
      return; // READ-ONLY ENFORCED
    }

    // Title Input
    const titleInput = container.querySelector('#workout-title-input');
    if (titleInput) {
      titleInput.oninput = (e) => {
        Workout.activeWorkout.title = e.target.value;
        Workout._persist();
      };
    }

    // Session Date Picker
    const datePicker = container.querySelector('#session-date-picker');
    if (datePicker) {
      datePicker.onchange = (e) => {
        if (!e.target.value) return;
        const [y, m, d] = e.target.value.split('-');
        const customD = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0, 0);
        Workout.setSessionDate(customD.toISOString());
      };
    }

    // Time In Button
    const btnTimeIn = container.querySelector('#btn-time-in');
    if (btnTimeIn) {
      btnTimeIn.onclick = () => {
        Native.hapticLight();
        Workout.setTimeIn();
        updateView();
      };
    }

    // Time Out Button (Records end timestamp and displays duration)
    const btnTimeOut = container.querySelector('#btn-time-out');
    if (btnTimeOut) {
      btnTimeOut.onclick = () => {
        Native.hapticLight();
        Workout.setTimeOut();
        updateView();
      };
    }

    // Resume Session Button (Clears timeOut so user can continue logging)
    const btnResumeSession = container.querySelector('#btn-resume-session');
    if (btnResumeSession) {
      btnResumeSession.onclick = () => {
        Native.hapticLight();
        Workout.resumeSession();
        updateView();
      };
    }

    // Edit Times Action
    const btnEditTimes = container.querySelector('#btn-edit-times') || container.querySelector('#btn-edit-times-action');
    if (btnEditTimes) {
      btnEditTimes.onclick = () => {
        Native.hapticLight();
        openTimeEditorModal();
      };
    }

    // Discard Workout Session
    const btnCancel = container.querySelector('#btn-cancel-workout');
    if (btnCancel) {
      btnCancel.onclick = () => {
        showConfirmationModal({
          title: 'Discard Session?',
          message: 'Are you sure you want to discard this active workout? All logging for this session will be removed.',
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

    // Finish Workout Button
    const btnFinish = container.querySelector('#btn-finish-workout');
    if (btnFinish) {
      btnFinish.onclick = () => {
        showConfirmationModal({
          title: 'Finish & Lock Workout?',
          message: 'Finish this workout? You will not be able to edit it after.',
          confirmText: 'Finish Workout',
          confirmDanger: false,
          onConfirm: () => {
            Native.hapticSuccess();
            const finished = Workout.finishWorkout();
            if (finished) {
              showCompletionModal(finished);
            }
          }
        });
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

    // Info Icon
    container.querySelectorAll('.btn-info-ex').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openExerciseInfoModal(btn.dataset.exId);
      };
    });

    // Remove Exercise (Confirms before deleting)
    container.querySelectorAll('.btn-remove-exercise').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.exIdx, 10);
        const exName = workout.exercises[idx]?.exerciseName || 'this exercise';
        showConfirmationModal({
          title: 'Remove Exercise?',
          message: `Are you sure you want to remove ${exName}?`,
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

    // Add Set
    container.querySelectorAll('.btn-add-set').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.exIdx, 10);
        Native.hapticLight();
        Workout.addSet(idx);
        updateView();
      };
    });

    // Toggle Set Type (Warmup -> Working -> Failure)
    container.querySelectorAll('.btn-toggle-set-type').forEach(tag => {
      tag.onclick = () => {
        const exIdx = parseInt(tag.dataset.exIdx, 10);
        const setIdx = parseInt(tag.dataset.setIdx, 10);
        Workout.toggleSetType(exIdx, setIdx);
        Native.hapticLight();
        updateView();
      };
    });

    // Delete Single Set (No Confirmation Needed)
    container.querySelectorAll('.btn-delete-set').forEach(btn => {
      btn.onclick = () => {
        const exIdx = parseInt(btn.dataset.exIdx, 10);
        const setIdx = parseInt(btn.dataset.setIdx, 10);
        Workout.removeSet(exIdx, setIdx);
        Native.hapticLight();
        updateView();
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
        const newR = Math.max(0, (parseInt(set.reps, 10) || 0) - 1);
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
        const val = Math.max(0, parseFloat(e.target.value) || 0);
        Workout.updateSet(exIdx, setIdx, { weight: val });
      };
    });

    container.querySelectorAll('.input-set-reps').forEach(input => {
      input.onchange = (e) => {
        const exIdx = parseInt(input.dataset.exIdx, 10);
        const setIdx = parseInt(input.dataset.setIdx, 10);
        const val = Math.max(0, parseInt(e.target.value, 10) || 0);
        Workout.updateSet(exIdx, setIdx, { reps: val });
      };
    });
  }

  function openTimeEditorModal() {
    const mount = container.querySelector('#time-edit-modal-mount');
    if (!mount) return;

    const currentIn = workout.timeIn ? toHtmlLocalTimeString(workout.timeIn) : '';
    const currentOut = workout.timeOut ? toHtmlLocalTimeString(workout.timeOut) : '';

    mount.innerHTML = `
      <div class="sheet-backdrop active" id="time-edit-backdrop"></div>
      <div class="sheet-container active" style="padding: var(--space-6) var(--space-4);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
          <h3 style="font-size: var(--text-lg); font-weight: 800;">Edit Session Timestamps</h3>
          <button id="btn-close-time-edit" class="btn btn-ghost btn-sm btn-icon">${getIcon('x')}</button>
        </div>

        <form id="time-edit-form" style="display: flex; flex-direction: column; gap: var(--space-4);">
          <div>
            <label style="font-size: var(--text-xs); font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase;">Time In</label>
            <input type="time" id="input-time-in" value="${currentIn}" style="width: 100%; margin-top: 4px;" required />
          </div>

          <div>
            <label style="font-size: var(--text-xs); font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase;">Time Out</label>
            <input type="time" id="input-time-out" value="${currentOut}" style="width: 100%; margin-top: 4px;" />
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top: var(--space-2);">
            Save Timestamps
          </button>
        </form>
      </div>
    `;

    const closeTimeModal = () => { mount.innerHTML = ''; };
    mount.querySelector('#time-edit-backdrop').onclick = closeTimeModal;
    mount.querySelector('#btn-close-time-edit').onclick = closeTimeModal;

    const form = mount.querySelector('#time-edit-form');
    form.onsubmit = (e) => {
      e.preventDefault();
      const inVal = mount.querySelector('#input-time-in').value;
      const outVal = mount.querySelector('#input-time-out').value;

      const baseDate = workout.date ? new Date(workout.date) : new Date();

      if (inVal) {
        const [h, m] = inVal.split(':');
        const inDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), parseInt(h, 10), parseInt(m, 10));
        Workout.setTimeIn(inDate.toISOString());
      }

      if (outVal) {
        const [h, m] = outVal.split(':');
        const outDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), parseInt(h, 10), parseInt(m, 10));
        Workout.setTimeOut(outDate.toISOString());
      }

      closeTimeModal();
      updateView();
    };
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

    function closePicker() { mount.innerHTML = ''; }
    renderPicker();
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
          ${escapeHtml(ex.instructions?.join(' ') || 'Follow proper form and control movement execution.')}
        </p>

        <button id="btn-done-info" class="btn btn-primary" style="width: 100%;">Close</button>
      </div>
    `;

    const closeInfo = () => { mount.innerHTML = ''; };
    mount.querySelector('#info-backdrop').onclick = closeInfo;
    mount.querySelector('#btn-close-info').onclick = closeInfo;
    mount.querySelector('#btn-done-info').onclick = closeInfo;
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

  function showCompletionModal(workoutData) {
    const totalVolume = (workoutData.exercises || []).reduce((acc, e) => {
      return acc + (e.sets || []).reduce((sAcc, s) => {
        if (!s.completed || s.type === 'Warmup') return sAcc;
        return sAcc + (s.weight * s.reps);
      }, 0);
    }, 0);

    const modal = document.createElement('div');
    modal.innerHTML = `
      <div class="sheet-backdrop active"></div>
      <div class="sheet-container active" style="text-align: center; padding: var(--space-6) var(--space-4);">
        <div style="font-size: 56px; margin-bottom: 12px; animation: checkBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);">🔒</div>
        <h2 style="font-size: var(--text-2xl); font-weight: 800; margin-bottom: 6px;">Workout Session Locked</h2>
        <p style="color: var(--color-text-secondary); font-size: var(--text-sm); margin-bottom: 24px;">Session is completed and locked as read-only.</p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); margin-bottom: 28px;">
          <div class="card" style="padding: var(--space-3);">
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Duration</div>
            <div style="font-size: var(--text-md); font-weight: 800; margin-top: 4px;">${formatDuration(workoutData.durationSeconds)}</div>
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

        <div style="display: flex; gap: var(--space-2);">
          <button id="modal-btn-add-another" class="btn btn-secondary" style="flex: 1; font-size: 13px;">
            ➕ Add Another Session
          </button>
          <button id="modal-btn-view-history" class="btn btn-primary" style="flex: 1; font-size: 13px;">
            View in History
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#modal-btn-add-another').onclick = () => {
      modal.remove();
      Workout.startWorkout();
      updateView();
    };

    modal.querySelector('#modal-btn-view-history').onclick = () => {
      modal.remove();
      window.location.hash = '#history';
    };
  }

  updateView();
}

function formatTimeDisplay(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

function toHtmlLocalDateString(isoStr) {
  if (!isoStr) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toHtmlLocalTimeString(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
