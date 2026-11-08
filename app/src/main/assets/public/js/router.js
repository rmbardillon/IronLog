/**
 * IronLog Hash Router & Navigation Controller
 * Manages hash routing, active tab bar state, tablet sidebar, and Android back button.
 */

import { renderDashboard } from './pages/dashboard.js';
import { renderLogger } from './pages/logger.js';
import { renderHistory } from './pages/history.js';
import { renderProgress } from './pages/progress.js';
import { renderExerciseLibrary } from './pages/exercise-library.js';
import { renderExerciseDetail } from './pages/exercise-detail.js';
import { renderSettings } from './pages/settings.js';
import { Native } from './platform.js';

class Router {
  constructor() {
    this.container = null;
    this.currentHash = '';
    this.historyStack = [];
  }

  init(container) {
    this.container = container;
    window.addEventListener('hashchange', () => this.handleRoute());

    // Setup Android hardware back button
    Native.setupBackButton(() => this.handleHardwareBack());

    // Initial Route
    if (!window.location.hash || window.location.hash === '#') {
      window.location.hash = '#dashboard';
    } else {
      this.handleRoute();
    }
  }

  handleRoute() {
    const hash = window.location.hash || '#dashboard';
    this.currentHash = hash;

    if (this.historyStack[this.historyStack.length - 1] !== hash) {
      this.historyStack.push(hash);
      if (this.historyStack.length > 20) this.historyStack.shift();
    }

    this.syncNavChrome(hash);

    // Scroll main view to top on navigation
    if (this.container) {
      this.container.scrollTop = 0;
    }

    // Route matching
    if (hash === '#dashboard') {
      renderDashboard(this.container);
    } else if (hash === '#logger') {
      renderLogger(this.container);
    } else if (hash === '#history') {
      renderHistory(this.container);
    } else if (hash === '#progress') {
      renderProgress(this.container);
    } else if (hash === '#exercises') {
      renderExerciseLibrary(this.container);
    } else if (hash.startsWith('#exercise/')) {
      const exerciseId = hash.replace('#exercise/', '');
      renderExerciseDetail(this.container, exerciseId);
    } else if (hash === '#settings') {
      renderSettings(this.container);
    } else {
      renderDashboard(this.container);
    }
  }

  syncNavChrome(hash) {
    // Map exercise detail to exercises tab
    const activeRoute = hash.startsWith('#exercise/') ? '#exercises' : hash;

    // Mobile Bottom Tab Bar items
    document.querySelectorAll('.tab-item').forEach(tab => {
      const tabTarget = tab.getAttribute('href');
      tab.classList.toggle('active', tabTarget === activeRoute);
    });

    // Tablet Sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => {
      const linkTarget = link.getAttribute('href');
      link.classList.toggle('active', linkTarget === activeRoute);
    });
  }

  handleHardwareBack() {
    // 1. Close any open sheets or modals first
    const openSheet = document.querySelector('.sheet-container.active, .sheet-backdrop.active');
    if (openSheet) {
      document.querySelectorAll('.sheet-container, .sheet-backdrop').forEach(el => el.remove());
      return;
    }

    // 2. If on exercise detail, go back to exercises
    if (this.currentHash.startsWith('#exercise/')) {
      window.location.hash = '#exercises';
      return;
    }

    // 3. If on non-dashboard route, navigate back to dashboard
    if (this.currentHash !== '#dashboard') {
      window.location.hash = '#dashboard';
      return;
    }

    // 4. If on dashboard, exit app via Capacitor App plugin
    if (window.Capacitor?.Plugins?.App) {
      window.Capacitor.Plugins.App.exitApp();
    }
  }
}

export const AppRouter = new Router();
export default AppRouter;
