/**
 * IronLog Onboarding Flow (3 Steps)
 * First-launch experience: Units, Weekly Goal, and Theme.
 */

import { Storage } from './storage.js';
import { Theme } from './theme.js';
import { getIcon } from './icons.js';
import { Native } from './platform.js';

export function renderOnboarding(container, onComplete) {
  let currentStep = 1;
  let selectedUnit = Storage.getSettings().unit || 'kg';
  let selectedGoal = Storage.getSettings().weeklyGoal || 4;
  let selectedTheme = Storage.getSettings().theme || 'system';

  function updateView() {
    container.innerHTML = `
      <div style="position: fixed; inset: 0; z-index: 100; background-color: var(--color-bg); display: flex; flex-direction: column; padding: calc(var(--sat) + 24px) 24px calc(var(--sab) + 24px) 24px; max-width: 500px; margin: 0 auto; justify-content: space-between;">

        <!-- Top Indicator -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div style="display: flex; gap: 8px;">
              <div style="width: 32px; height: 4px; border-radius: 2px; background-color: ${currentStep >= 1 ? 'var(--color-accent)' : 'var(--color-border)'};"></div>
              <div style="width: 32px; height: 4px; border-radius: 2px; background-color: ${currentStep >= 2 ? 'var(--color-accent)' : 'var(--color-border)'};"></div>
              <div style="width: 32px; height: 4px; border-radius: 2px; background-color: ${currentStep >= 3 ? 'var(--color-accent)' : 'var(--color-border)'};"></div>
            </div>
            <span style="font-size: 13px; font-weight: 700; color: var(--color-text-secondary);">Step ${currentStep} of 3</span>
          </div>

          ${renderStepContent()}
        </div>

        <!-- Bottom Navigation -->
        <div style="display: flex; gap: 12px; margin-top: 24px;">
          ${currentStep > 1 ? `
            <button id="ob-btn-back" class="btn btn-secondary" style="flex: 1;">
              Back
            </button>
          ` : ''}
          <button id="ob-btn-next" class="btn btn-primary" style="flex: 2;">
            ${currentStep === 3 ? 'Get Started' : 'Continue'}
          </button>
        </div>

      </div>
    `;

    bindEvents();
  }

  function renderStepContent() {
    if (currentStep === 1) {
      return `
        <div style="animation: fadeIn 0.3s ease;">
          <div style="width: 64px; height: 64px; border-radius: 20px; background-color: var(--color-accent-subtle); color: var(--color-accent); display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            ${getIcon('dumbbell', 'w-8 h-8')}
          </div>
          <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 8px;">Welcome to IronLog</h1>
          <p style="color: var(--color-text-secondary); font-size: 16px; margin-bottom: 32px;">Your distraction-free companion for serious strength tracking. Which units do you lift with?</p>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div class="card card-clickable ob-unit-choice ${selectedUnit === 'kg' ? 'active-choice' : ''}" data-val="kg" style="display: flex; align-items: center; justify-content: space-between; padding: 20px; border-color: ${selectedUnit === 'kg' ? 'var(--color-accent)' : 'var(--color-border)'}; background-color: ${selectedUnit === 'kg' ? 'var(--color-accent-subtle)' : 'var(--color-surface)'};">
              <div>
                <div style="font-size: 18px; font-weight: 700;">Kilograms (kg)</div>
                <div style="font-size: 13px; color: var(--color-text-secondary); margin-top: 2px;">Standard metric plates (20kg bar, 2.5kg increments)</div>
              </div>
              <div style="color: var(--color-accent);">${selectedUnit === 'kg' ? getIcon('check') : ''}</div>
            </div>

            <div class="card card-clickable ob-unit-choice ${selectedUnit === 'lb' ? 'active-choice' : ''}" data-val="lb" style="display: flex; align-items: center; justify-content: space-between; padding: 20px; border-color: ${selectedUnit === 'lb' ? 'var(--color-accent)' : 'var(--color-border)'}; background-color: ${selectedUnit === 'lb' ? 'var(--color-accent-subtle)' : 'var(--color-surface)'};">
              <div>
                <div style="font-size: 18px; font-weight: 700;">Pounds (lbs)</div>
                <div style="font-size: 13px; color: var(--color-text-secondary); margin-top: 2px;">Imperial plates (45lb bar, 5lb increments)</div>
              </div>
              <div style="color: var(--color-accent);">${selectedUnit === 'lb' ? getIcon('check') : ''}</div>
            </div>
          </div>
        </div>
      `;
    }

    if (currentStep === 2) {
      return `
        <div style="animation: fadeIn 0.3s ease;">
          <div style="width: 64px; height: 64px; border-radius: 20px; background-color: var(--color-accent-subtle); color: var(--color-accent); display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            ${getIcon('calendar', 'w-8 h-8')}
          </div>
          <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 8px;">Weekly Commitment</h1>
          <p style="color: var(--color-text-secondary); font-size: 16px; margin-bottom: 32px;">How many workouts do you aim to complete each week?</p>

          <div style="text-align: center; margin-bottom: 24px;">
            <div id="ob-goal-display" style="font-size: 56px; font-weight: 900; color: var(--color-accent); line-height: 1;">${selectedGoal}</div>
            <div style="font-size: 16px; font-weight: 600; color: var(--color-text-secondary); margin-top: 8px;">workouts per week</div>
          </div>

          <div style="display: flex; justify-content: space-between; gap: 8px;">
            ${[2, 3, 4, 5, 6].map(days => `
              <button class="btn ${selectedGoal === days ? 'btn-primary' : 'btn-secondary'} ob-goal-btn" data-days="${days}" style="flex: 1; padding: 0;">
                ${days}d
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (currentStep === 3) {
      return `
        <div style="animation: fadeIn 0.3s ease;">
          <div style="width: 64px; height: 64px; border-radius: 20px; background-color: var(--color-accent-subtle); color: var(--color-accent); display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            ${getIcon('moon', 'w-8 h-8')}
          </div>
          <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 8px;">Visual Styling</h1>
          <p style="color: var(--color-text-secondary); font-size: 16px; margin-bottom: 28px;">Choose your default theme. IronLog automatically adapts to system changes in real time.</p>

          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
            ${[
              { id: 'system', name: 'System Auto', desc: 'Syncs live with OS dark/light mode' },
              { id: 'dark', name: 'Dark Theme', desc: 'OLED friendly, high contrast, sleek' },
              { id: 'light', name: 'Light Theme', desc: 'Clean, crisp daytime legibility' }
            ].map(t => `
              <div class="card card-clickable ob-theme-choice" data-theme="${t.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border-color: ${selectedTheme === t.id ? 'var(--color-accent)' : 'var(--color-border)'}; background-color: ${selectedTheme === t.id ? 'var(--color-accent-subtle)' : 'var(--color-surface)'};">
                <div>
                  <div style="font-weight: 700; font-size: 16px;">${t.name}</div>
                  <div style="font-size: 12px; color: var(--color-text-secondary);">${t.desc}</div>
                </div>
                <div style="color: var(--color-accent);">${selectedTheme === t.id ? getIcon('check') : ''}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  function bindEvents() {
    // Unit choices
    container.querySelectorAll('.ob-unit-choice').forEach(el => {
      el.onclick = () => {
        selectedUnit = el.dataset.val;
        Native.hapticLight();
        updateView();
      };
    });

    // Goal buttons
    container.querySelectorAll('.ob-goal-btn').forEach(el => {
      el.onclick = () => {
        selectedGoal = parseInt(el.dataset.days, 10);
        Native.hapticLight();
        updateView();
      };
    });

    // Theme choices
    container.querySelectorAll('.ob-theme-choice').forEach(el => {
      el.onclick = () => {
        selectedTheme = el.dataset.theme;
        Theme.applyTheme(selectedTheme);
        Native.hapticLight();
        updateView();
      };
    });

    const btnNext = container.querySelector('#ob-btn-next');
    if (btnNext) {
      btnNext.onclick = () => {
        Native.hapticLight();
        if (currentStep < 3) {
          currentStep++;
          updateView();
        } else {
          // Finish onboarding
          Storage.updateSettings({
            unit: selectedUnit,
            weeklyGoal: selectedGoal,
            theme: selectedTheme,
            onboardingCompleted: true
          });
          if (onComplete) onComplete();
        }
      };
    }

    const btnBack = container.querySelector('#ob-btn-back');
    if (btnBack) {
      btnBack.onclick = () => {
        Native.hapticLight();
        if (currentStep > 1) {
          currentStep--;
          updateView();
        }
      };
    }
  }

  updateView();
}

export default renderOnboarding;
