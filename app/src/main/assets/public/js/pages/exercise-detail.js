/**
 * IronLog Exercise Detail View
 * Swipeable image carousel, muscle highlight diagram, instructions, tips, and PR history chart.
 */

import { Exercises } from '../exercises.js';
import { Storage } from '../storage.js';
import { Charts } from '../charts.js';
import { Native } from '../platform.js';
import { getIcon } from '../icons.js';

export function renderExerciseDetail(container, exerciseId) {
  const exercise = Exercises.getById(exerciseId);
  if (!exercise) {
    container.innerHTML = `
      <div class="page-container" style="text-align: center; padding: 64px 16px;">
        <h2>Exercise Not Found</h2>
        <a href="#exercises" class="btn btn-primary" style="margin-top: 16px;">Back to Library</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="page-container" style="animation: fadeIn 0.25s ease;">
      <!-- Mobile Back Button -->
      <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2);">
        <button id="detail-btn-back" class="btn btn-ghost btn-sm" style="padding-left: 0;">
          ${getIcon('chevronLeft', 'w-5 h-5')} Back
        </button>
      </div>

      <div id="exercise-detail-mount">
        ${renderExerciseDetailView(exercise)}
      </div>
    </div>
  `;

  const btnBack = container.querySelector('#detail-btn-back');
  if (btnBack) {
    btnBack.onclick = () => {
      Native.hapticLight();
      window.history.back();
    };
  }

  bindCarouselEvents(container, exercise);
  bindChart(container, exercise);
}

export function renderExerciseDetailView(exercise) {
  const isFav = Storage.isFavorite(exercise.id);
  const pr = Storage.state.prs[exercise.id];
  const unit = Storage.getSettings().unit || 'kg';
  const images = (exercise.images && exercise.images.length > 0) ? exercise.images : ['assets/fallback-exercise.svg'];

  return `
    <div style="display: flex; flex-direction: column; gap: var(--space-4);">

      <!-- Top Title & Favorite -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="font-size: var(--text-2xl); font-weight: 800; letter-spacing: -0.025em; line-height: 1.2;">
            ${escapeHtml(exercise.name)}
          </h1>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
            <span class="badge badge-accent">${exercise.equipment || 'other'}</span>
            <span class="badge">${exercise.category || 'strength'}</span>
            <span class="badge">${exercise.difficulty || 'intermediate'}</span>
            ${exercise.mechanic ? `<span class="badge">${exercise.mechanic}</span>` : ''}
          </div>
        </div>

        <button class="btn btn-ghost btn-icon btn-detail-fav" data-id="${exercise.id}" style="color: ${isFav ? '#ef4444' : 'var(--color-text-muted)'}; flex-shrink: 0;" aria-label="Favorite">
          ${getIcon(isFav ? 'heartFilled' : 'heart', 'w-6 h-6')}
        </button>
      </div>

      <!-- Swipeable Image Carousel (0.webp & 1.webp) -->
      <div class="carousel-wrap" id="detail-carousel">
        <img id="carousel-active-img" class="carousel-img" src="${images[0]}" alt="${escapeHtml(exercise.name)}" onerror="this.src='assets/fallback-exercise.svg'" />

        ${images.length > 1 ? `
          <button class="carousel-nav-btn prev" id="carousel-btn-prev">${getIcon('chevronLeft', 'w-5 h-5')}</button>
          <button class="carousel-nav-btn next" id="carousel-btn-next">${getIcon('chevronRight', 'w-5 h-5')}</button>
          <div class="carousel-dots">
            ${images.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></span>`).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Muscles Highlight Section -->
      <div class="card" style="padding: var(--space-3) var(--space-4);">
        <div style="font-size: var(--text-xs); font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 8px;">Target Muscles</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${(exercise.primaryMuscles || []).map(m => `
            <span class="badge badge-accent" style="font-size: 13px; padding: 4px 10px;">Primary: ${m}</span>
          `).join('')}
          ${(exercise.secondaryMuscles || []).map(m => `
            <span class="badge" style="font-size: 13px; padding: 4px 10px;">Secondary: ${m}</span>
          `).join('')}
        </div>
      </div>

      <!-- Personal Record Banner -->
      ${pr ? `
        <div class="card" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), var(--color-surface-card)); border-color: rgba(245, 158, 11, 0.4); padding: var(--space-3) var(--space-4);">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: var(--space-3);">
              <div style="font-size: 28px;">🏆</div>
              <div>
                <div style="font-weight: 800; font-size: var(--text-base);">Personal Record</div>
                <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">Best set: ${pr.maxWeight} ${unit} (Est. 1RM: ${pr.max1RM} ${unit})</div>
              </div>
            </div>
            <span class="badge badge-pr">All Time</span>
          </div>
        </div>
      ` : ''}

      <!-- Technique Instructions -->
      <div class="card">
        <h3 style="font-size: var(--text-md); font-weight: 800; margin-bottom: var(--space-3);">Instructions</h3>
        <ol style="padding-left: 20px; display: flex; flex-direction: column; gap: var(--space-2); color: var(--color-text-secondary); font-size: var(--text-sm); line-height: 1.6;">
          ${(exercise.instructions || []).map(step => `
            <li class="selectable-text"><strong style="color: var(--color-text);">${escapeHtml(step)}</strong></li>
          `).join('')}
        </ol>
      </div>

      <!-- Execution Tips & Cues -->
      ${(exercise.tips && exercise.tips.length > 0) ? `
        <div class="card">
          <h3 style="font-size: var(--text-md); font-weight: 800; margin-bottom: var(--space-3);">Coaching Cues & Common Mistakes</h3>
          <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: var(--space-2); color: var(--color-text-secondary); font-size: var(--text-sm); line-height: 1.6;">
            ${exercise.tips.map(tip => `
              <li class="selectable-text">${escapeHtml(tip)}</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Exercise Progress Chart -->
      <div class="card">
        <h3 style="font-size: var(--text-md); font-weight: 800; margin-bottom: var(--space-2);">Strength Trend</h3>
        <div id="exercise-history-chart-mount"></div>
      </div>

    </div>
  `;
}

export function bindCarouselEvents(container, exercise) {
  const images = (exercise.images && exercise.images.length > 0) ? exercise.images : ['assets/fallback-exercise.svg'];
  if (images.length <= 1) return;

  let currentIdx = 0;
  const imgEl = container.querySelector('#carousel-active-img');
  const dots = container.querySelectorAll('.carousel-dot');

  function show(idx) {
    currentIdx = (idx + images.length) % images.length;
    if (imgEl) imgEl.src = images[currentIdx];
    dots.forEach((d, i) => d.classList.toggle('active', i === currentIdx));
    Native.hapticLight();
  }

  const btnPrev = container.querySelector('#carousel-btn-prev');
  if (btnPrev) btnPrev.onclick = () => show(currentIdx - 1);

  const btnNext = container.querySelector('#carousel-btn-next');
  if (btnNext) btnNext.onclick = () => show(currentIdx + 1);

  // Click image to toggle start / end position
  if (imgEl) {
    imgEl.style.cursor = 'pointer';
    imgEl.onclick = () => show(currentIdx + 1);
  }
}

export function bindChart(container, exercise) {
  const mount = container.querySelector('#exercise-history-chart-mount');
  if (!mount) return;

  const workouts = Storage.getWorkouts();
  const unit = Storage.getSettings().unit || 'kg';
  const points = [];

  const sorted = workouts.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  sorted.forEach(w => {
    (w.exercises || []).forEach(e => {
      if (e.exerciseId === exercise.id) {
        let best = 0;
        (e.sets || []).forEach(s => {
          if (!s.completed) return;
          const wt = parseFloat(s.weight) || 0;
          if (wt > best) best = wt;
        });
        if (best > 0) {
          const d = new Date(w.date);
          points.push({
            label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            value: best
          });
        }
      }
    });
  });

  Charts.renderLineChart(mount, points, {
    title: `${exercise.name} Max Weight`,
    unit,
    height: 180
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
