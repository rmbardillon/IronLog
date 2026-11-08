/**
 * IronLog Exercise Library Page
 * Fast search and filter over 870+ exercises with WebP thumbnails, A-Z index and custom exercises.
 */

import { Exercises } from '../exercises.js';
import { Storage } from '../storage.js';
import { Native } from '../platform.js';
import { getIcon } from '../icons.js';
import { renderExerciseDetailView } from './exercise-detail.js';

export function renderExerciseLibrary(container) {
  let searchQuery = '';
  let selectedMuscle = 'all';
  let selectedEquipment = 'all';
  let favoritesOnly = false;
  let customOnly = false;
  let selectedExerciseId = 'Barbell_Bench_Press_-_Medium_Grip';
  let currentPage = 1;
  const pageSize = 40;

  function updateView() {
    const allFiltered = Exercises.filter({
      query: searchQuery,
      muscle: selectedMuscle,
      equipment: selectedEquipment,
      favoritesOnly,
      customOnly
    });

    const totalResults = allFiltered.length;
    const pagedExercises = allFiltered.slice(0, currentPage * pageSize);
    const hasMore = pagedExercises.length < totalResults;

    const selectedExercise = Exercises.getById(selectedExerciseId) || allFiltered[0] || null;

    container.innerHTML = `
      <div class="master-detail-view" style="animation: fadeIn 0.25s ease;">

        <!-- Left / Master Column -->
        <div class="master-column" style="padding: var(--space-4);">

          <!-- Header & Actions -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
            <div>
              <h1 style="font-size: var(--text-2xl); font-weight: 800; letter-spacing: -0.025em;">Exercises</h1>
              <div style="font-size: var(--text-xs); color: var(--color-text-secondary); margin-top: 2px;">
                ${totalResults} movements available
              </div>
            </div>

            <button id="btn-create-custom-ex" class="btn btn-primary btn-sm">
              ${getIcon('plus', 'w-4 h-4')} Custom
            </button>
          </div>

          <!-- Search Input -->
          <div style="margin-bottom: var(--space-3);">
            <input type="search" id="ex-search-input" value="${escapeHtml(searchQuery)}" placeholder="Search by name, muscle, equipment..." style="width: 100%;" />
          </div>

          <!-- Muscle Filter Chips Scroll -->
          <div class="chips-scroll" style="margin-bottom: var(--space-2);">
            ${['all', 'chest', 'back', 'shoulders', 'legs', 'arms', 'core'].map(m => `
              <div class="chip ${selectedMuscle === m ? 'active' : ''} ex-muscle-chip" data-muscle="${m}">
                ${m.charAt(0).toUpperCase() + m.slice(1)}
              </div>
            `).join('')}
          </div>

          <!-- Secondary Filters (Favorites, Custom, Equipment) -->
          <div class="chips-scroll" style="margin-bottom: var(--space-4);">
            <div class="chip ${favoritesOnly ? 'active' : ''}" id="chip-favs">
              ${getIcon(favoritesOnly ? 'heartFilled' : 'heart', 'w-3.5 h-3.5')} Favorites
            </div>
            <div class="chip ${customOnly ? 'active' : ''}" id="chip-custom">
              Custom (${Storage.getCustomExercises().length})
            </div>
            ${['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'].map(eq => `
              <div class="chip ${selectedEquipment === eq ? 'active' : ''} ex-equipment-chip" data-eq="${eq}">
                ${eq.charAt(0).toUpperCase() + eq.slice(1)}
              </div>
            `).join('')}
          </div>

          <!-- Exercise List -->
          ${totalResults === 0 ? `
            <div style="text-align: center; padding: 48px 16px; color: var(--color-text-secondary);">
              <div style="font-weight: 700; font-size: var(--text-md); color: var(--color-text);">No matching exercises</div>
              <p style="font-size: var(--text-sm); margin-top: 4px;">Try loosening search keywords or clearing filters.</p>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: var(--space-2);">
              ${pagedExercises.map(ex => renderExerciseItemRow(ex, ex.id === selectedExerciseId)).join('')}
            </div>

            ${hasMore ? `
              <button id="btn-load-more-ex" class="btn btn-secondary btn-sm" style="width: 100%; margin-top: var(--space-4);">
                Load More (${totalResults - pagedExercises.length} remaining)
              </button>
            ` : ''}
          `}

        </div>

        <!-- Right / Detail Column (Visible on Tablet) -->
        <div class="detail-column" id="ex-detail-pane">
          ${selectedExercise ? renderExerciseDetailView(selectedExercise) : `
            <div style="text-align: center; padding: 64px 24px; color: var(--color-text-muted);">
              Select an exercise to view technique instructions and history.
            </div>
          `}
        </div>

      </div>

      <!-- Create Custom Exercise Modal Mount -->
      <div id="custom-ex-modal-mount"></div>
    `;

    bindEvents();
  }

  function renderExerciseItemRow(ex, isSelected) {
    const isFav = Storage.isFavorite(ex.id);
    const thumbUrl = ex.thumbnail || 'assets/fallback-exercise.svg';
    const primaryMuscle = ex.primaryMuscles?.[0] || 'Strength';

    return `
      <div class="card card-clickable ex-list-row ${isSelected ? 'selected' : ''}" data-id="${ex.id}" style="padding: var(--space-2) var(--space-3); display: flex; align-items: center; justify-content: space-between; border-color: ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}; background-color: ${isSelected ? 'var(--color-accent-subtle)' : 'var(--color-surface-card)'};">
        <div style="display: flex; align-items: center; gap: var(--space-3); flex: 1; min-width: 0;">
          <img src="${thumbUrl}" alt="" loading="lazy" style="width: 44px; height: 44px; border-radius: var(--radius-md); object-fit: cover; background: var(--color-surface-elevated);" onerror="this.src='assets/fallback-exercise.svg'" />
          <div style="min-width: 0;">
            <div style="font-weight: 700; font-size: var(--text-base); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(ex.name)}
            </div>
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary); margin-top: 2px;">
              ${primaryMuscle} • ${ex.equipment || 'other'}
            </div>
          </div>
        </div>

        <button class="btn btn-ghost btn-icon btn-fav-toggle" data-id="${ex.id}" style="color: ${isFav ? '#ef4444' : 'var(--color-text-muted)'}; flex-shrink: 0;" aria-label="Favorite">
          ${getIcon(isFav ? 'heartFilled' : 'heart', 'w-4 h-4')}
        </button>
      </div>
    `;
  }

  function bindEvents() {
    const sInput = container.querySelector('#ex-search-input');
    if (sInput) {
      sInput.oninput = (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        updateView();
      };
    }

    container.querySelectorAll('.ex-muscle-chip').forEach(chip => {
      chip.onclick = () => {
        selectedMuscle = chip.dataset.muscle;
        currentPage = 1;
        Native.hapticLight();
        updateView();
      };
    });

    container.querySelectorAll('.ex-equipment-chip').forEach(chip => {
      chip.onclick = () => {
        selectedEquipment = selectedEquipment === chip.dataset.eq ? 'all' : chip.dataset.eq;
        currentPage = 1;
        Native.hapticLight();
        updateView();
      };
    });

    const chipFavs = container.querySelector('#chip-favs');
    if (chipFavs) {
      chipFavs.onclick = () => {
        favoritesOnly = !favoritesOnly;
        currentPage = 1;
        Native.hapticLight();
        updateView();
      };
    }

    const chipCustom = container.querySelector('#chip-custom');
    if (chipCustom) {
      chipCustom.onclick = () => {
        customOnly = !customOnly;
        currentPage = 1;
        Native.hapticLight();
        updateView();
      };
    }

    // Row selection (on mobile, clicking navigates to #exercise/:id; on tablet, updates detail pane)
    container.querySelectorAll('.ex-list-row').forEach(row => {
      row.onclick = (e) => {
        if (e.target.closest('.btn-fav-toggle')) return;
        const id = row.dataset.id;
        selectedExerciseId = id;
        Native.hapticLight();

        if (window.innerWidth < 860) {
          window.location.hash = `#exercise/${id}`;
        } else {
          updateView();
        }
      };
    });

    // Favorite toggling
    container.querySelectorAll('.btn-fav-toggle').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        Storage.toggleFavorite(id);
        Native.hapticLight();
        updateView();
      };
    });

    // Load more
    const btnLoadMore = container.querySelector('#btn-load-more-ex');
    if (btnLoadMore) {
      btnLoadMore.onclick = () => {
        currentPage++;
        Native.hapticLight();
        updateView();
      };
    }

    // Create Custom Exercise
    const btnCustom = container.querySelector('#btn-create-custom-ex');
    if (btnCustom) {
      btnCustom.onclick = () => {
        Native.hapticLight();
        openCustomExerciseModal();
      };
    }
  }

  function openCustomExerciseModal() {
    const mount = container.querySelector('#custom-ex-modal-mount');
    if (!mount) return;

    let photoData = null;

    mount.innerHTML = `
      <div class="sheet-backdrop active" id="custom-modal-backdrop"></div>
      <div class="sheet-container active" style="max-height: 90vh;">
        <div class="sheet-handle"></div>

        <div style="padding: 0 var(--space-4) var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: var(--text-lg); font-weight: 800;">New Custom Exercise</h3>
          <button id="btn-close-custom-modal" class="btn btn-ghost btn-sm btn-icon">${getIcon('x')}</button>
        </div>

        <div class="sheet-content">
          <form id="custom-exercise-form" style="display: flex; flex-direction: column; gap: var(--space-4);">

            <!-- Photo Upload with Camera / Gallery -->
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <div id="photo-preview-wrap" style="width: 110px; height: 110px; border-radius: var(--radius-xl); background-color: var(--color-surface-elevated); border: 2px dashed var(--color-border); display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; position: relative;">
                <div id="photo-placeholder" style="text-align: center; color: var(--color-accent);">
                  ${getIcon('camera', 'w-8 h-8')}
                  <div style="font-size: 11px; font-weight: 700; margin-top: 4px;">Add Photo</div>
                </div>
                <img id="custom-photo-img" style="display: none; width: 100%; height: 100%; object-fit: cover;" />
              </div>
            </div>

            <!-- Name -->
            <div>
              <label style="font-size: var(--text-xs); font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase;">Exercise Name</label>
              <input type="text" id="custom-name" required placeholder="e.g. Incline Cable Fly" style="width: 100%; margin-top: 4px;" />
            </div>

            <!-- Primary Muscle -->
            <div>
              <label style="font-size: var(--text-xs); font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase;">Primary Muscle</label>
              <select id="custom-muscle" style="width: 100%; margin-top: 4px;">
                <option value="chest">Chest</option>
                <option value="back">Back</option>
                <option value="shoulders">Shoulders</option>
                <option value="quadriceps">Quads</option>
                <option value="hamstrings">Hamstrings</option>
                <option value="glutes">Glutes</option>
                <option value="calves">Calves</option>
                <option value="biceps">Biceps</option>
                <option value="triceps">Triceps</option>
                <option value="abdominals">Core / Abs</option>
              </select>
            </div>

            <!-- Equipment -->
            <div>
              <label style="font-size: var(--text-xs); font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase;">Equipment</label>
              <select id="custom-equipment" style="width: 100%; margin-top: 4px;">
                <option value="barbell">Barbell</option>
                <option value="dumbbell">Dumbbell</option>
                <option value="cable">Cable</option>
                <option value="machine">Machine</option>
                <option value="bodyweight">Bodyweight</option>
                <option value="kettlebell">Kettlebell</option>
                <option value="resistance band">Resistance Band</option>
                <option value="other">Other</option>
              </select>
            </div>

            <!-- Category -->
            <div>
              <label style="font-size: var(--text-xs); font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase;">Category</label>
              <select id="custom-category" style="width: 100%; margin-top: 4px;">
                <option value="strength">Strength</option>
                <option value="powerlifting">Powerlifting</option>
                <option value="plyometrics">Plyometrics</option>
                <option value="stretching">Stretching</option>
                <option value="cardio">Cardio</option>
              </select>
            </div>

            <button type="submit" class="btn btn-primary" style="margin-top: var(--space-2);">
              Save Custom Exercise
            </button>
          </form>
        </div>
      </div>
    `;

    mount.querySelector('#btn-close-custom-modal').onclick = () => mount.innerHTML = '';
    mount.querySelector('#custom-modal-backdrop').onclick = () => mount.innerHTML = '';

    // Take photo or pick from gallery via Capacitor Camera
    const photoWrap = mount.querySelector('#photo-preview-wrap');
    photoWrap.onclick = async () => {
      Native.hapticLight();
      const photoUrl = await Native.capturePhoto();
      if (photoUrl) {
        photoData = photoUrl;
        mount.querySelector('#photo-placeholder').style.display = 'none';
        const img = mount.querySelector('#custom-photo-img');
        img.src = photoUrl;
        img.style.display = 'block';
      }
    };

    // Form submit
    const form = mount.querySelector('#custom-exercise-form');
    form.onsubmit = (e) => {
      e.preventDefault();
      const name = mount.querySelector('#custom-name').value.trim();
      const muscle = mount.querySelector('#custom-muscle').value;
      const equipment = mount.querySelector('#custom-equipment').value;
      const category = mount.querySelector('#custom-category').value;

      if (!name) return;

      const newEx = Storage.addCustomExercise({
        name,
        primaryMuscles: [muscle],
        secondaryMuscles: [],
        equipment,
        category,
        difficulty: 'intermediate',
        force: 'push',
        mechanic: 'compound',
        instructions: [`Execute ${name} with solid form and controlled pace.`],
        tips: ['Focus on proper contraction and steady breathing.'],
        thumbnail: photoData || 'assets/fallback-exercise.svg',
        images: photoData ? [photoData] : ['assets/fallback-exercise.svg']
      });

      Exercises.rebuildIndex();
      Native.hapticSuccess();
      mount.innerHTML = '';
      selectedExerciseId = newEx.id;
      updateView();
    };
  }

  updateView();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
