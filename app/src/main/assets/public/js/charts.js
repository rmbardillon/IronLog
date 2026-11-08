/**
 * IronLog Accessible SVG Charts
 * Responsive, animated, theme-aware charts with zero external libraries.
 */

export const Charts = {
  /**
   * Render a responsive, animated Line / Area Chart
   * @param {HTMLElement} container
   * @param {Array<{ label: string, value: number, date?: string }>} points
   * @param {Object} options
   */
  renderLineChart(container, points, options = {}) {
    if (!container) return;
    container.innerHTML = '';

    if (!points || points.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: var(--color-text-muted); font-size: 14px;">
          Not enough workout data yet to plot trend.
        </div>`;
      return;
    }

    const {
      title = 'Progress Over Time',
      unit = 'kg',
      height = 200,
      accentColor = 'var(--color-accent)'
    } = options;

    const width = 500;
    const padding = { top: 20, right: 24, bottom: 32, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const values = points.map(p => p.value);
    const minVal = Math.max(0, Math.floor(Math.min(...values) * 0.9));
    const maxVal = Math.ceil(Math.max(...values) * 1.1) || 100;
    const valRange = maxVal - minVal || 1;

    // Coordinate mapping
    const getX = (idx) => padding.left + (points.length === 1 ? chartW / 2 : (idx / (points.length - 1)) * chartW);
    const getY = (val) => padding.top + chartH - ((val - minVal) / valRange) * chartH;

    // Generate Path
    const coords = points.map((p, i) => ({ x: getX(i), y: getY(p.value), ...p }));
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      // Smooth curve
      const prev = coords[i - 1];
      const curr = coords[i];
      const cpX = (prev.x + curr.x) / 2;
      pathD += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${padding.top + chartH} L ${coords[0].x} ${padding.top + chartH} Z`;

    // Horizontal grid lines (3 steps)
    const steps = 3;
    let gridLinesSvg = '';
    for (let s = 0; s <= steps; s++) {
      const v = Math.round(minVal + (s / steps) * valRange);
      const y = getY(v);
      gridLinesSvg += `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--chart-grid)" stroke-dasharray="4,4" />
        <text x="${padding.left - 8}" y="${y + 4}" fill="var(--chart-text)" font-size="11" text-anchor="end">${v}</text>
      `;
    }

    // Circles for points
    const pointsSvg = coords.map((c, i) => `
      <g class="chart-point" tabindex="0" aria-label="${c.label}: ${c.value} ${unit}">
        <circle cx="${c.x}" cy="${c.y}" r="5" fill="var(--color-surface)" stroke="${accentColor}" stroke-width="3">
          <title>${c.label}: ${c.value} ${unit}</title>
        </circle>
      </g>
    `).join('');

    const startVal = points[0].value;
    const endVal = points[points.length - 1].value;
    const diff = endVal - startVal;
    const diffFormatted = diff >= 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
    const accessibleSummary = `${title}: Started at ${startVal} ${unit}, currently at ${endVal} ${unit} (${diffFormatted} ${unit}).`;

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="${accessibleSummary}" style="overflow: visible;">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${accentColor}" stop-opacity="0.0" />
          </linearGradient>
          <style>
            .animated-line {
              stroke-dasharray: 1000;
              stroke-dashoffset: 1000;
              animation: drawLine 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            @keyframes drawLine {
              to { stroke-dashoffset: 0; }
            }
          </style>
        </defs>

        <!-- Grid Lines -->
        ${gridLinesSvg}

        <!-- Gradient Area Under Curve -->
        <path d="${areaD}" fill="url(#areaGradient)" />

        <!-- Line Curve -->
        <path d="${pathD}" fill="none" stroke="${accentColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="animated-line" />

        <!-- Points -->
        ${pointsSvg}

        <!-- X Axis labels -->
        <text x="${padding.left}" y="${height - 8}" fill="var(--chart-text)" font-size="11" text-anchor="start">${points[0].label}</text>
        <text x="${width - padding.right}" y="${height - 8}" fill="var(--chart-text)" font-size="11" text-anchor="end">${points[points.length - 1].label}</text>
      </svg>
    `;

    container.innerHTML = svg;
  },

  /**
   * Render a Weekly Workout Bar Chart
   * @param {HTMLElement} container
   * @param {Array<{ label: string, count: number, isCurrentWeek?: boolean }>} weeks
   */
  renderBarChart(container, weeks) {
    if (!container) return;
    container.innerHTML = '';

    if (!weeks || weeks.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--color-text-muted);">No activity data</div>`;
      return;
    }

    const maxCount = Math.max(5, ...weeks.map(w => w.count));
    const width = 450;
    const height = 140;
    const padding = { top: 16, bottom: 28, left: 24, right: 16 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const barW = Math.max(16, (chartW / weeks.length) - 10);

    const barsSvg = weeks.map((w, idx) => {
      const barH = (w.count / maxCount) * chartH;
      const x = padding.left + idx * (chartW / weeks.length) + (chartW / weeks.length - barW) / 2;
      const y = padding.top + chartH - barH;
      const color = w.isCurrentWeek ? 'var(--color-accent)' : 'var(--color-surface-hover)';

      return `
        <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="${color}">
          <title>${w.label}: ${w.count} workouts</title>
        </rect>
        <text x="${x + barW / 2}" y="${y - 4}" fill="var(--color-text-secondary)" font-size="10" font-weight="700" text-anchor="middle">${w.count > 0 ? w.count : ''}</text>
        <text x="${x + barW / 2}" y="${height - 10}" fill="var(--chart-text)" font-size="10" text-anchor="middle">${w.label}</text>
      `;
    }).join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="Weekly Workout Consistency Chart">
        ${barsSvg}
      </svg>
    `;
  },

  /**
   * Render Muscle Volume Breakdown Bars
   */
  renderMuscleBreakdown(container, muscleVolumeMap, totalVolume, unit = 'kg') {
    if (!container) return;
    container.innerHTML = '';

    const entries = Object.entries(muscleVolumeMap)
      .filter(([_, vol]) => vol > 0)
      .sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); padding: 16px;">No sets logged this period.</div>`;
      return;
    }

    const html = entries.map(([muscle, vol]) => {
      const pct = totalVolume > 0 ? Math.round((vol / totalVolume) * 100) : 0;
      const name = muscle.charAt(0).toUpperCase() + muscle.slice(1);
      return `
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
            <span>${name}</span>
            <span style="color: var(--color-text-secondary);">${vol.toLocaleString()} ${unit} (${pct}%)</span>
          </div>
          <div style="height: 8px; border-radius: var(--radius-full); background-color: var(--color-surface-elevated); overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background-color: var(--color-accent); border-radius: var(--radius-full); transition: width 0.5s ease-out;"></div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }
};

export default Charts;
