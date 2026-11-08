/**
 * IronLog Settings Page
 * Preferences for Units, Weekly Goal, Themes, Accents, Haptics, Screen Awake, and Backup Export/Import.
 */

import { Storage } from '../storage.js';
import { Theme } from '../theme.js';
import { Native } from '../platform.js';
import { ACCENTS, THEMES } from '../config.js';
import { getIcon } from '../icons.js';

export function renderSettings(container) {
  function updateView() {
    const s = Storage.getSettings();

    container.innerHTML = `
      <div class="page-container" style="animation: fadeIn 0.25s ease;">

        <div>
          <h1 style="font-size: var(--text-2xl); font-weight: 800; letter-spacing: -0.025em; margin-bottom: 4px;">Settings</h1>
          <p style="font-size: var(--text-sm); color: var(--color-text-secondary);">Preferences, theming, notifications and backup management.</p>
        </div>

        <!-- 1. Training Preferences Card -->
        <div class="card">
          <h3 style="font-size: var(--text-md); font-weight: 800; margin-bottom: var(--space-4);">Training Preferences</h3>

          <!-- Units Choice -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--space-3); border-bottom: 1px solid var(--color-border-subtle);">
            <div>
              <div style="font-weight: 700; font-size: var(--text-base);">Weight Unit</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Choose your default measurement</div>
            </div>
            <div style="display: flex; background-color: var(--color-surface-elevated); padding: 3px; border-radius: var(--radius-lg); border: 1px solid var(--color-border);">
              <button class="btn btn-sm btn-unit-toggle ${s.unit === 'kg' ? 'btn-primary' : 'btn-ghost'}" data-unit="kg">kg</button>
              <button class="btn btn-sm btn-unit-toggle ${s.unit === 'lb' ? 'btn-primary' : 'btn-ghost'}" data-unit="lb">lbs</button>
            </div>
          </div>

          <!-- Weekly Goal -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-3);">
            <div>
              <div style="font-weight: 700; font-size: var(--text-base);">Weekly Target</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Target workouts per week</div>
            </div>
            <select id="setting-weekly-goal" style="font-weight: 700;">
              ${[1, 2, 3, 4, 5, 6, 7].map(num => `
                <option value="${num}" ${s.weeklyGoal === num ? 'selected' : ''}>${num} days / week</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- 2. Appearance & Theme Card -->
        <div class="card">
          <h3 style="font-size: var(--text-md); font-weight: 800; margin-bottom: var(--space-4);">Appearance</h3>

          <!-- Theme Mode -->
          <div style="margin-bottom: var(--space-4);">
            <div style="font-weight: 700; font-size: var(--text-base); margin-bottom: 8px;">Theme Mode</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2);">
              ${THEMES.map(t => `
                <button class="btn btn-sm ${s.theme === t.id ? 'btn-primary' : 'btn-secondary'} btn-theme-choice" data-theme="${t.id}" style="width: 100%;">
                  ${t.name}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Accent Color Palette -->
          <div>
            <div style="font-weight: 700; font-size: var(--text-base); margin-bottom: 8px;">Accent Color</div>
            <div style="display: flex; gap: var(--space-3); align-items: center;">
              ${ACCENTS.map(acc => `
                <div class="accent-color-circle" data-accent="${acc.id}" title="${acc.name}" style="width: 36px; height: 36px; border-radius: 50%; background-color: ${acc.hex}; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #ffffff; border: 3px solid ${s.accent === acc.id ? 'var(--color-text)' : 'transparent'}; transition: transform 0.15s ease;">
                  ${s.accent === acc.id ? getIcon('check', 'w-4 h-4') : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- 3. Hardware & Feedback Card -->
        <div class="card">
          <h3 style="font-size: var(--text-md); font-weight: 800; margin-bottom: var(--space-3);">Feedback & Hardware</h3>

          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--space-3); border-bottom: 1px solid var(--color-border-subtle);">
            <div>
              <div style="font-weight: 700; font-size: var(--text-base);">Haptic Vibration</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Tactile clicks on set completion and PRs</div>
            </div>
            <input type="checkbox" id="setting-haptics" ${s.hapticsEnabled !== false ? 'checked' : ''} style="width: 22px; height: 22px; accent-color: var(--color-accent);" />
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-3);">
            <div>
              <div style="font-weight: 700; font-size: var(--text-base);">Keep Screen Awake</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Prevent screen timeout during active workout</div>
            </div>
            <input type="checkbox" id="setting-keep-awake" ${s.keepAwake !== false ? 'checked' : ''} style="width: 22px; height: 22px; accent-color: var(--color-accent);" />
          </div>
        </div>

        <!-- 4. Data Backup & Restore Card -->
        <div class="card">
          <h3 style="font-size: var(--text-md); font-weight: 800; margin-bottom: var(--space-3);">Data Management</h3>
          <p style="font-size: var(--text-xs); color: var(--color-text-secondary); margin-bottom: var(--space-4);">
            Your data is stored locally and securely on your device. Export a backup JSON file anytime to transfer or archive your workout history.
          </p>

          <div style="display: flex; gap: var(--space-3);">
            <button id="btn-export-json" class="btn btn-secondary" style="flex: 1;">
              ${getIcon('download', 'w-4 h-4')} Export Backup
            </button>
            <button id="btn-import-json" class="btn btn-secondary" style="flex: 1;">
              ${getIcon('upload', 'w-4 h-4')} Import JSON
            </button>
            <input type="file" id="import-file-input" accept=".json,application/json" style="display: none;" />
          </div>
        </div>

        <!-- 5. About & Credits -->
        <div class="card" style="background-color: var(--color-surface);">
          <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2);">
            <div style="width: 32px; height: 32px; border-radius: 8px; background-color: var(--color-accent); color: #fff; display: flex; align-items: center; justify-content: center;">
              ${getIcon('dumbbell', 'w-4 h-4')}
            </div>
            <div>
              <div style="font-weight: 800; font-size: var(--text-base);">IronLog 2.0</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Clean, Offline Native Workout Tracker</div>
            </div>
          </div>
          <div style="font-size: var(--text-xs); color: var(--color-text-secondary); line-height: 1.6; margin-top: 8px;">
            <p><strong>Exercise Database:</strong> Built on the open-source dataset by <code>yuhonas/free-exercise-db</code> under the public domain Unlicense. Includes 870+ illustrated movements.</p>
            <p style="margin-top: 4px;"><strong>Iconography:</strong> Lucide Icons (ISC License).</p>
            <p style="margin-top: 4px;"><strong>Technology:</strong> Powered by Capacitor, HTML5, CSS Variables, and Vanilla JavaScript.</p>
          </div>
        </div>

      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // Unit toggle
    container.querySelectorAll('.btn-unit-toggle').forEach(btn => {
      btn.onclick = () => {
        const u = btn.dataset.unit;
        Storage.updateSettings({ unit: u });
        Native.hapticLight();
        updateView();
      };
    });

    // Weekly Goal
    const selectGoal = container.querySelector('#setting-weekly-goal');
    if (selectGoal) {
      selectGoal.onchange = (e) => {
        Storage.updateSettings({ weeklyGoal: parseInt(e.target.value, 10) });
        Native.hapticLight();
      };
    }

    // Theme Choice
    container.querySelectorAll('.btn-theme-choice').forEach(btn => {
      btn.onclick = () => {
        const t = btn.dataset.theme;
        Theme.setTheme(t);
        Native.hapticLight();
        updateView();
      };
    });

    // Accent Choice
    container.querySelectorAll('.accent-color-circle').forEach(circle => {
      circle.onclick = () => {
        const a = circle.dataset.accent;
        Theme.setAccent(a);
        Native.hapticLight();
        updateView();
      };
    });

    // Toggles
    const checkHaptics = container.querySelector('#setting-haptics');
    if (checkHaptics) {
      checkHaptics.onchange = (e) => {
        Storage.updateSettings({ hapticsEnabled: e.target.checked });
        Native.hapticLight();
      };
    }

    const checkKeepAwake = container.querySelector('#setting-keep-awake');
    if (checkKeepAwake) {
      checkKeepAwake.onchange = (e) => {
        Storage.updateSettings({ keepAwake: e.target.checked });
        Native.hapticLight();
      };
    }

    // Export Backup
    const btnExport = container.querySelector('#btn-export-json');
    if (btnExport) {
      btnExport.onclick = async () => {
        Native.hapticLight();
        const filename = `ironlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
        const data = Storage.state;
        await Native.exportJSON(filename, data);
      };
    }

    // Import Backup
    const btnImport = container.querySelector('#btn-import-json');
    const fileInput = container.querySelector('#import-file-input');
    if (btnImport && fileInput) {
      btnImport.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const parsed = JSON.parse(evt.target.result);
            if (confirm(`Import ${parsed.workouts?.length || 0} workouts from backup? This will merge with your existing data.`)) {
              Storage.importData(parsed);
              Native.hapticSuccess();
              alert('Backup imported successfully!');
              updateView();
            }
          } catch (err) {
            alert('Invalid backup JSON file.');
          }
        };
        reader.readAsText(file);
      };
    }
  }

  updateView();
}
