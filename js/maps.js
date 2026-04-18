/**
 * ArenaFlow AI — Google Maps Integration
 * Canvas-based interactive stadium map with crowd density overlays,
 * point-of-interest layers, and animated user position marker.
 *
 * Supports four visualization layers:
 * - Crowd: Real-time density heatmap (radial gradients)
 * - Food: Food court locations with density indicators
 * - Facilities: Restrooms and amenity markers
 * - Exits: Gate locations with congestion status
 *
 * @module MapsService
 * @version 2.0.0
 * @author ArenaFlow AI Team
 */
'use strict';

const MapsService = (() => {
  /* ── Constants ─────────────────────────────────────────────── */

  /** Minimum canvas dimension (px) to avoid rendering on hidden views. */
  const MIN_CANVAS_SIZE = 10;

  /** Grid line spacing (px) for background pattern. */
  const GRID_SPACING = 30;

  /** Base radius (px) for crowd density blobs. */
  const DENSITY_BLOB_BASE_RADIUS = 20;

  /** Max additional radius (px) added by density value. */
  const DENSITY_BLOB_SCALE = 35;

  /** Radius (px) for POI marker circles. */
  const POI_MARKER_RADIUS = 18;

  /** User pulse animation speed factor. */
  const USER_PULSE_SPEED = 3;

  /** User pulse amplitude (px). */
  const USER_PULSE_AMPLITUDE = 3;

  /** User marker outer ring extra radius. */
  const USER_RING_OFFSET = 8;

  /** User marker inner dot radius. */
  const USER_DOT_RADIUS = 6;

  /** Minimum font size (px) for labels. */
  const MIN_LABEL_FONT_SIZE = 8;

  /** Label font scale relative to canvas width. */
  const LABEL_FONT_SCALE = 0.013;

  /** Field label font scale relative to canvas width. */
  const FIELD_FONT_SCALE = 0.018;

  /** Minimum field font size (px). */
  const MIN_FIELD_FONT_SIZE = 10;

  /** Stadium outer wall polygon vertices (normalized 0-1 coordinates). */
  const OUTER_WALL = Object.freeze([
    { x: 0.50, y: 0.02 }, { x: 0.78, y: 0.08 },
    { x: 0.95, y: 0.25 }, { x: 0.98, y: 0.50 },
    { x: 0.95, y: 0.75 }, { x: 0.78, y: 0.92 },
    { x: 0.50, y: 0.98 }, { x: 0.22, y: 0.92 },
    { x: 0.05, y: 0.75 }, { x: 0.02, y: 0.50 },
    { x: 0.05, y: 0.25 }, { x: 0.22, y: 0.08 },
  ]);

  /** Stadium inner wall polygon vertices (normalized 0-1 coordinates). */
  const INNER_WALL = Object.freeze([
    { x: 0.50, y: 0.25 }, { x: 0.70, y: 0.30 },
    { x: 0.78, y: 0.42 }, { x: 0.78, y: 0.58 },
    { x: 0.70, y: 0.70 }, { x: 0.50, y: 0.75 },
    { x: 0.30, y: 0.70 }, { x: 0.22, y: 0.58 },
    { x: 0.22, y: 0.42 }, { x: 0.30, y: 0.30 },
  ]);

  /** Density thresholds for color-coding. */
  const DENSITY_THRESHOLD_HIGH = 0.8;
  const DENSITY_THRESHOLD_MEDIUM = 0.6;
  const DENSITY_THRESHOLD_POI = 0.7;

  /** Color definitions for density levels. */
  const DENSITY_COLORS = Object.freeze({
    high: { r: 239, g: 68, b: 68 },
    medium: { r: 245, g: 158, b: 11 },
    low: { r: 16, g: 185, b: 129 },
  });

  /** Layer type mapping from button IDs to zone types. */
  const LAYER_TYPE_MAP = Object.freeze({
    crowd: null,
    food: 'food',
    facilities: 'restroom',
    exits: 'gate',
  });

  /** Emoji icons for POI layer markers. */
  const LAYER_EMOJI_MAP = Object.freeze({
    food: '🍔',
    facilities: '🚻',
    exits: '🚪',
  });

  /** Playing field position ratios. */
  const FIELD_X_RATIO = 0.35;
  const FIELD_Y_RATIO = 0.35;
  const FIELD_W_RATIO = 0.30;
  const FIELD_H_RATIO = 0.30;
  const FIELD_CENTER_CIRCLE_RATIO = 0.15;

  /** Canvas aspect ratio (height = width * this value). */
  const CANVAS_ASPECT_RATIO = 0.6;

  /** Minimum parent width (px) before using fallback. */
  const MIN_PARENT_WIDTH = 20;

  /** Fallback canvas width when parent is too small. */
  const FALLBACK_WIDTH = 600;

  /* ── State ─────────────────────────────────────────────────── */

  /** @type {HTMLCanvasElement|null} Canvas element reference. */
  let _canvas = null;

  /** @type {CanvasRenderingContext2D|null} 2D rendering context. */
  let _ctx = null;

  /** @type {string} Currently active visualization layer. */
  let _activeLayer = 'crowd';

  /** @type {number|null} Animation frame request ID. */
  let _animFrame = null;

  /* ── Initialization ───────────────────────────────────────── */

  /**
   * Initialize the map canvas and start the render loop.
   * @param {string} canvasId - DOM ID of the canvas element
   */
  function init(canvasId) {
    try {
      _canvas = document.getElementById(canvasId);
      if (!_canvas) {
        console.warn('[MapsService] Canvas element not found:', canvasId);
        return;
      }
      _ctx = _canvas.getContext('2d');
      if (!_ctx) {
        console.error('[MapsService] Failed to acquire 2D context');
        return;
      }
      resize();
      window.addEventListener('resize', ArenaUtils.debounce(resize, 200));
      startRenderLoop();
    } catch (error) {
      console.error('[MapsService] Initialization failed:', error);
    }
  }

  /* ── Canvas Sizing ────────────────────────────────────────── */

  /**
   * Resize the canvas to fit its parent container while maintaining
   * high-DPI rendering quality.
   */
  function resize() {
    if (!_canvas || !_ctx) return;

    const parent = _canvas.parentElement;
    const dpr = devicePixelRatio || 1;
    const parentWidth = parent.clientWidth > MIN_PARENT_WIDTH
      ? parent.clientWidth
      : FALLBACK_WIDTH;

    _canvas.width = parentWidth * dpr;
    _canvas.height = parentWidth * CANVAS_ASPECT_RATIO * dpr;
    _canvas.style.width = parentWidth + 'px';
    _canvas.style.height = parentWidth * CANVAS_ASPECT_RATIO + 'px';

    _ctx.setTransform(1, 0, 0, 1, 0, 0);
    _ctx.scale(dpr, dpr);
  }

  /* ── Layer Control ────────────────────────────────────────── */

  /**
   * Set the active visualization layer.
   * @param {string} layer - Layer identifier ('crowd', 'food', 'facilities', 'exits')
   */
  function setLayer(layer) {
    _activeLayer = layer;
  }

  /* ── Render Loop ──────────────────────────────────────────── */

  /**
   * Start the continuous render loop.
   */
  function startRenderLoop() {
    function loop() {
      draw();
      _animFrame = requestAnimationFrame(loop);
    }
    loop();
  }

  /**
   * Stop the render loop and release the animation frame.
   */
  function stop() {
    if (_animFrame !== null) {
      cancelAnimationFrame(_animFrame);
      _animFrame = null;
    }
  }

  /* ── Main Draw ────────────────────────────────────────────── */

  /**
   * Main draw function — renders the complete stadium map each frame.
   * Delegates to sub-renderers for each visual component.
   */
  function draw() {
    if (!_ctx) return;

    const w = _canvas.clientWidth;
    const h = _canvas.clientHeight;
    const snapshot = CrowdEngine.getSnapshot();

    // Skip rendering when canvas is too small (hidden view)
    if (w < MIN_CANVAS_SIZE || h < MIN_CANVAS_SIZE) return;

    // Clear and fill background
    _ctx.clearRect(0, 0, w, h);
    _ctx.fillStyle = '#0d1117';
    _ctx.fillRect(0, 0, w, h);

    drawGrid(w, h);
    drawStadiumStructure(w, h);
    drawPlayingField(w, h);

    if (snapshot?.zones) {
      drawLayers(w, h, snapshot);
      drawZoneLabels(w, h, snapshot);
    }

    drawUserMarker(w, h);
  }

  /* ── Sub-Renderers ────────────────────────────────────────── */

  /**
   * Draw the background grid pattern.
   * @param {number} w - Canvas width
   * @param {number} h - Canvas height
   */
  function drawGrid(w, h) {
    _ctx.strokeStyle = 'rgba(108,99,255,0.05)';
    _ctx.lineWidth = 0.5;

    for (let x = 0; x < w; x += GRID_SPACING) {
      _ctx.beginPath();
      _ctx.moveTo(x, 0);
      _ctx.lineTo(x, h);
      _ctx.stroke();
    }
    for (let y = 0; y < h; y += GRID_SPACING) {
      _ctx.beginPath();
      _ctx.moveTo(0, y);
      _ctx.lineTo(w, y);
      _ctx.stroke();
    }
  }

  /**
   * Draw the stadium outer and inner wall outlines.
   * @param {number} w - Canvas width
   * @param {number} h - Canvas height
   */
  function drawStadiumStructure(w, h) {
    // Outer wall
    _ctx.beginPath();
    OUTER_WALL.forEach((point, i) => {
      if (i === 0) {
        _ctx.moveTo(point.x * w, point.y * h);
      } else {
        _ctx.lineTo(point.x * w, point.y * h);
      }
    });
    _ctx.closePath();
    _ctx.strokeStyle = 'rgba(108,99,255,0.4)';
    _ctx.lineWidth = 2;
    _ctx.stroke();
    _ctx.fillStyle = 'rgba(108,99,255,0.03)';
    _ctx.fill();

    // Inner wall
    _ctx.beginPath();
    INNER_WALL.forEach((point, i) => {
      if (i === 0) {
        _ctx.moveTo(point.x * w, point.y * h);
      } else {
        _ctx.lineTo(point.x * w, point.y * h);
      }
    });
    _ctx.closePath();
    _ctx.strokeStyle = 'rgba(0,212,255,0.3)';
    _ctx.lineWidth = 1.5;
    _ctx.stroke();
  }

  /**
   * Draw the playing field rectangle with center line and circle.
   * @param {number} w - Canvas width
   * @param {number} h - Canvas height
   */
  function drawPlayingField(w, h) {
    const fx = FIELD_X_RATIO * w;
    const fy = FIELD_Y_RATIO * h;
    const fw = FIELD_W_RATIO * w;
    const fh = FIELD_H_RATIO * h;

    // Field area
    _ctx.fillStyle = 'rgba(16,185,129,0.12)';
    _ctx.fillRect(fx, fy, fw, fh);
    _ctx.strokeStyle = 'rgba(16,185,129,0.4)';
    _ctx.lineWidth = 1.5;
    _ctx.strokeRect(fx, fy, fw, fh);

    // Center line
    _ctx.beginPath();
    _ctx.moveTo(fx + fw / 2, fy);
    _ctx.lineTo(fx + fw / 2, fy + fh);
    _ctx.stroke();

    // Center circle
    _ctx.beginPath();
    _ctx.arc(fx + fw / 2, fy + fh / 2, Math.min(fw, fh) * FIELD_CENTER_CIRCLE_RATIO, 0, Math.PI * 2);
    _ctx.stroke();

    // Field label
    _ctx.fillStyle = 'rgba(16,185,129,0.5)';
    _ctx.font = `${Math.max(MIN_FIELD_FONT_SIZE, w * FIELD_FONT_SCALE)}px Inter, sans-serif`;
    _ctx.textAlign = 'center';
    _ctx.textBaseline = 'middle';
    _ctx.fillText('PLAYING FIELD', fx + fw / 2, fy + fh / 2);
  }

  /**
   * Draw the active visualization layer (crowd heatmap or POI markers).
   * @param {number} w - Canvas width
   * @param {number} h - Canvas height
   * @param {object} snapshot - Current crowd engine snapshot
   */
  function drawLayers(w, h, snapshot) {
    const layerType = LAYER_TYPE_MAP[_activeLayer];
    const emoji = LAYER_EMOJI_MAP[_activeLayer];
    const zones = layerType
      ? snapshot.zones.filter(z => z.type === layerType)
      : snapshot.zones;

    zones.forEach(zone => {
      const x = zone.x * w;
      const y = zone.y * h;

      if (_activeLayer === 'crowd') {
        drawCrowdBlob(x, y, zone.density);
      } else {
        drawPOIMarker(x, y, zone.density, emoji);
      }
    });
  }

  /**
   * Draw a crowd density blob at the specified position.
   * @param {number} x - X position (px)
   * @param {number} y - Y position (px)
   * @param {number} density - Zone density (0-1)
   */
  function drawCrowdBlob(x, y, density) {
    const radius = DENSITY_BLOB_BASE_RADIUS + density * DENSITY_BLOB_SCALE;
    const gradient = _ctx.createRadialGradient(x, y, 0, x, y, radius);

    let color;
    if (density > DENSITY_THRESHOLD_HIGH) {
      color = DENSITY_COLORS.high;
      gradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b},0.6)`);
      gradient.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
    } else if (density > DENSITY_THRESHOLD_MEDIUM) {
      color = DENSITY_COLORS.medium;
      gradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b},0.5)`);
      gradient.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
    } else {
      color = DENSITY_COLORS.low;
      gradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b},0.4)`);
      gradient.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
    }

    _ctx.fillStyle = gradient;
    _ctx.beginPath();
    _ctx.arc(x, y, radius, 0, Math.PI * 2);
    _ctx.fill();
  }

  /**
   * Draw a point-of-interest marker with emoji and density ring.
   * @param {number} x - X position (px)
   * @param {number} y - Y position (px)
   * @param {number} density - Zone density (0-1)
   * @param {string} emoji - Emoji character for the marker
   */
  function drawPOIMarker(x, y, density, emoji) {
    const isHighDensity = density > DENSITY_THRESHOLD_POI;

    // Background circle
    _ctx.beginPath();
    _ctx.arc(x, y, POI_MARKER_RADIUS, 0, Math.PI * 2);
    _ctx.fillStyle = isHighDensity ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)';
    _ctx.fill();
    _ctx.strokeStyle = isHighDensity ? '#ef4444' : '#10b981';
    _ctx.lineWidth = 1.5;
    _ctx.stroke();

    // Emoji label
    _ctx.font = '16px sans-serif';
    _ctx.textAlign = 'center';
    _ctx.textBaseline = 'middle';
    _ctx.fillText(emoji, x, y);
  }

  /**
   * Draw text labels for seating and concourse zones.
   * @param {number} w - Canvas width
   * @param {number} h - Canvas height
   * @param {object} snapshot - Current crowd engine snapshot
   */
  function drawZoneLabels(w, h, snapshot) {
    const fontSize = Math.max(MIN_LABEL_FONT_SIZE, w * LABEL_FONT_SCALE);
    _ctx.font = `${fontSize}px Inter, sans-serif`;
    _ctx.textBaseline = 'top';
    _ctx.textAlign = 'center';
    _ctx.fillStyle = 'rgba(241,245,249,0.5)';

    snapshot.zones
      .filter(z => ['seating', 'concourse'].includes(z.type))
      .forEach(zone => {
        const label = zone.name
          .replace(' Stand ', ' ')
          .replace('Concourse', 'Conc.');
        _ctx.fillText(label, zone.x * w, zone.y * h + 20);
      });
  }

  /**
   * Draw the animated user position marker with pulsing ring.
   * @param {number} w - Canvas width
   * @param {number} h - Canvas height
   */
  function drawUserMarker(w, h) {
    const section = ArenaUtils.storage.get('section', 'north-lower');
    const userZone = CrowdEngine.ZONES.find(z => z.id === section);
    if (!userZone) return;

    const ux = userZone.x * w;
    const uy = userZone.y * h;
    const pulseRadius = USER_DOT_RADIUS + USER_RING_OFFSET +
      Math.sin(Date.now() / 1000 * USER_PULSE_SPEED) * USER_PULSE_AMPLITUDE;

    // Pulsing outer ring
    _ctx.beginPath();
    _ctx.arc(ux, uy, pulseRadius, 0, Math.PI * 2);
    _ctx.strokeStyle = 'rgba(108,99,255,0.3)';
    _ctx.lineWidth = 2;
    _ctx.stroke();

    // Inner dot
    _ctx.beginPath();
    _ctx.arc(ux, uy, USER_DOT_RADIUS, 0, Math.PI * 2);
    _ctx.fillStyle = '#6c63ff';
    _ctx.fill();
    _ctx.strokeStyle = '#fff';
    _ctx.lineWidth = 2;
    _ctx.stroke();

    // "YOU" label
    const labelFontSize = Math.max(9, w * 0.014);
    _ctx.fillStyle = '#fff';
    _ctx.font = `bold ${labelFontSize}px Inter, sans-serif`;
    _ctx.textAlign = 'center';
    _ctx.textBaseline = 'bottom';
    _ctx.fillText('📍 YOU', ux, uy - USER_RING_OFFSET - USER_PULSE_AMPLITUDE);
  }

  /* ── Public API ────────────────────────────────────────────── */

  return { init, setLayer, stop };
})();
