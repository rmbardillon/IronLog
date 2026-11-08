/**
 * IronLog Main Application Bootstrap
 * High-performance, dependency-free architecture for native Android, iOS and Web.
 */

import { Storage } from './storage.js';
import { Theme } from './theme.js';
import { Exercises } from './exercises.js';
import { Workout } from './workout-engine.js';
import { AppRouter } from './router.js';
import { Native } from './platform.js';
import { getIcon } from './icons.js';
import { renderOnboarding } from './onboarding.js';

async function bootstrap() {
  console.log('⚡ Initializing IronLog...');

  // 1. Initialize persistent storage
  await Storage.init();

  // 2. Initialize theme & accent
  Theme.init();

  // 3. Initialize exercise database
  await Exercises.init();

  // 4. Initialize active workout session
  Workout.init();

  // 5. Check first-launch onboarding
  const settings = Storage.getSettings();
  const root = document.getElementById('app-root');

  if (!settings.onboardingCompleted) {
    renderOnboarding(root, () => {
      startMainApp(root);
    });
  } else {
    startMainApp(root);
  }

  // 6. Hide splash screen smoothly
  setTimeout(() => {
    Native.hideSplash();
  }, 300);
}

function startMainApp(root) {
  root.innerHTML = `
    <div class="app-container">

      <!-- Tablet & Desktop Sidebar -->
      <aside class="app-sidebar" aria-label="Main Navigation">
        <div class="sidebar-brand">
          <div class="brand-logo-icon">
            ${getIcon('dumbbell', 'w-5 h-5')}
          </div>
          <div>
            <div class="brand-title">IronLog</div>
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary); font-weight: 600;">Workout Tracker</div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a href="#dashboard" class="sidebar-link active">
            ${getIcon('calendar')}
            <span>Dashboard</span>
          </a>
          <a href="#logger" class="sidebar-link">
            ${getIcon('play')}
            <span>Workout</span>
          </a>
          <a href="#history" class="sidebar-link">
            ${getIcon('clock')}
            <span>History</span>
          </a>
          <a href="#progress" class="sidebar-link">
            ${getIcon('trendingUp')}
            <span>Progress</span>
          </a>
          <a href="#exercises" class="sidebar-link">
            ${getIcon('bookOpen')}
            <span>Exercises</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <a href="#settings" class="sidebar-link">
            ${getIcon('settings')}
            <span>Settings</span>
          </a>
        </div>
      </aside>

      <!-- Main Scrollable Content Area -->
      <main class="main-content" id="main-content-scroll" role="main"></main>

      <!-- Mobile Bottom Tab Bar -->
      <nav class="tab-bar" aria-label="Bottom Navigation">
        <a href="#dashboard" class="tab-item active" aria-label="Dashboard">
          ${getIcon('calendar')}
          <span>Dashboard</span>
        </a>
        <a href="#history" class="tab-item" aria-label="History">
          ${getIcon('clock')}
          <span>History</span>
        </a>

        <!-- Prominent Center Start Workout Action -->
        <a href="#logger" class="tab-item center-action" aria-label="Active Workout">
          <div class="tab-center-btn" title="Start Workout">
            ${getIcon('play')}
          </div>
          <span style="margin-top: -4px;">Workout</span>
        </a>

        <a href="#exercises" class="tab-item" aria-label="Exercises">
          ${getIcon('bookOpen')}
          <span>Exercises</span>
        </a>
        <a href="#settings" class="tab-item" aria-label="Settings">
          ${getIcon('settings')}
          <span>Settings</span>
        </a>
      </nav>

    </div>
  `;

  const mainContainer = document.getElementById('main-content-scroll');
  AppRouter.init(mainContainer);
}

// Kick off when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
