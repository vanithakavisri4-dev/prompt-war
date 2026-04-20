/**
 * ArenaFlow AI — Main Application Controller
 * Orchestrates all modules, handles UI events, and manages application state.
 *
 * Dependencies:
 * - ArenaUtils: DOM helpers, sanitization, storage
 * - CrowdEngine: Real-time crowd simulation
 * - FlowOptimizer: AI-powered activity scheduling
 * - GeminiService: Google Gemini AI conversational concierge
 * - MapsService: Canvas-based stadium map renderer
 * - FirebaseService: Real-time data sync and group management
 * - AccessibilityService: WCAG 2.1 AA compliance
 * - GoogleCloudService: Cloud Run integration, logging, monitoring
 *
 * @module App
 * @version 2.0.0
 * @author ArenaFlow AI Team
 */
// eslint-disable-next-line no-unused-vars
const App = (() => {
  "use strict";
  /* ── Constants ─────────────────────────────────────────────── */

  /** Loading screen display duration in milliseconds. */
  const LOADING_SCREEN_DURATION_MS = 1500;

  /** Fade-out transition duration for the loading screen. */
  const LOADING_FADE_MS = 500;

  /** Crowd engine tick interval in milliseconds. */
  const CROWD_TICK_INTERVAL_MS = 2000;

  /** Clock update interval in milliseconds. */
  const CLOCK_INTERVAL_MS = 1000;

  /** Delay for simulated chat injection. */
  const SIMULATED_CHAT_DELAY_MS = 300;

  /** Maximum wait time for food calculation (minutes). */
  const MAX_WAIT_MINUTES = 15;

  /** Heatmap canvas maximum width (px). */
  const HEATMAP_MAX_WIDTH = 700;

  /** Heatmap canvas height (px). */
  const HEATMAP_HEIGHT = 400;

  /** Minimum parent width before using fallback (px). */
  const HEATMAP_MIN_PARENT_WIDTH = 60;

  /** Fallback heatmap width when parent is too narrow (px). */
  const HEATMAP_FALLBACK_WIDTH = 650;

  /** Parent padding offset for heatmap sizing (px). */
  const HEATMAP_PARENT_PADDING = 48;

  /** Crowd density threshold for trend direction. */
  const CROWD_TREND_THRESHOLD = 60;

  /** Maximum group name length. */
  const MAX_GROUP_NAME_LENGTH = 50;

  /** Heatmap zone density threshold for "high" (red). */
  const DENSITY_THRESHOLD_HIGH = 0.8;

  /** Heatmap zone density threshold for "medium" (yellow). */
  const DENSITY_THRESHOLD_MEDIUM = 0.6;

  /** Base blob radius for heatmap density circles (px). */
  const BLOB_RADIUS_BASE = 15;

  /** Additional blob radius scale per density unit (px). */
  const BLOB_RADIUS_SCALE = 30;

  /** Multiplier to convert density to percentage (100). */
  const PERCENT_MULTIPLIER = 100;

  /** Base flow score value. */
  const FLOW_SCORE_BASE = 87;

  /** Flow score random variation range. */
  const FLOW_SCORE_VARIATION = 6;

  /** Random offset for centering noise (-0.5). */
  const RANDOM_CENTER_OFFSET = 0.5;

  /** Stadium outer ellipse radius X/Y ratio. */
  const HEATMAP_STADIUM_OUTER_RATIO = 0.44;

  /** Stadium inner ellipse radius X/Y ratio. */
  const HEATMAP_STADIUM_INNER_RATIO = 0.28;

  /** Stadium field ellipse radius X/Y ratio. */
  const HEATMAP_FIELD_RATIO = 0.18;

  /** Base opacity for heatmap blobs. */
  const HEATMAP_BLOB_BASE_OPACITY = 0.5;

  /** Opacity scale factor for heatmap blobs based on density. */
  const HEATMAP_BLOB_OPACITY_SCALE = 0.3;

  /** Animation delay step per flow item (seconds). */
  const FLOW_ITEM_ANIM_DELAY_SEC = 0.1;

  /** View name mapping for navigation titles. */
  const VIEW_TITLES = Object.freeze({
    dashboard: "Dashboard",
    flow: "My Flow",
    map: "Live Map",
    concierge: "AI Concierge",
    social: "Social Sync",
    alerts: "Alerts",
    settings: "Settings",
  });

  /** Venue display name mapping. */
  const VENUE_NAMES = Object.freeze({
    "stadium-alpha": "MetLife Stadium",
    "stadium-beta": "Wembley Stadium",
    "stadium-gamma": "MCG",
    "stadium-delta": "Narendra Modi Stadium",
  });

  /* ── State ─────────────────────────────────────────────────── */

  /**
   * Application state object.
   * @type {{user: string|null, venue: string|null, section: string|null,
   *         accessibility: string, lang: string, currentView: string,
   *         groupCode: string|null}}
   */
  let _state = {
    user: null,
    venue: null,
    section: null,
    accessibility: "none",
    lang: "en",
    currentView: "dashboard",
    groupCode: null,
  };

  const { $, $$, sanitize, showToast, validateForm, storage } = ArenaUtils;

  /**
   * Initialize the application: restore session or show onboarding.
   * Sets up event bindings, accessibility features, and loading screen.
   */
  function init() {
    try {
      // Delay the initial load to show the splash screen smoothly
      setTimeout(() => {
        const loader = $("#loading-screen");
        if (loader) {
          loader.style.opacity = "0";
          // Wait for CSS fade transition to finish before hiding completely
          setTimeout(() => (loader.style.display = "none"), LOADING_FADE_MS);
        }

        // Check if user session already exists in local storage
        const saved = storage.get("user");
        if (saved) {
          _state = { ..._state, ...saved };
          showApp(); // Bypass onboarding
        } else {
          $("#onboarding-modal").style.display = "flex"; // Show onboarding
        }
      }, LOADING_SCREEN_DURATION_MS);

      // Bind all UI event listeners immediately
      bindEvents();
      // Initialize WCAG 2.1 AA accessibility features
      AccessibilityService.init();
    } catch (error) {
      console.error("[App] Initialization failed:", error);
    }
  }

  /**
   * Bind all UI event listeners for navigation, forms, and interactive controls.
   * Delegates to named handler functions for testability and readability.
   */
  function bindEvents() {
    // Onboarding
    $("#onboarding-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      handleOnboarding();
    });
    // Navigation
    $$(".nav-btn[data-view]").forEach((btn) =>
      btn.addEventListener("click", () => switchView(btn.dataset.view)),
    );
    // Sidebar toggle
    $("#sidebar-toggle")?.addEventListener("click", () =>
      $("#sidebar")?.classList.toggle("open"),
    );
    // Emergency
    $("#btn-emergency")?.addEventListener("click", triggerEmergency);
    $("#btn-dismiss-emergency")?.addEventListener("click", () => {
      $("#emergency-overlay").style.display = "none";
    });
    // Chat
    $("#chat-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      handleChat();
    });
    // Quick actions
    $("#qa-food")?.addEventListener("click", () => {
      switchView("concierge");
      simulateChat("Where can I find food with the shortest wait?");
    });
    $("#qa-restroom")?.addEventListener("click", () => {
      switchView("concierge");
      simulateChat("Where is the nearest restroom?");
    });
    $("#qa-merch")?.addEventListener("click", () => {
      switchView("concierge");
      simulateChat("Where is the merchandise store?");
    });
    $("#qa-exit")?.addEventListener("click", () => {
      switchView("concierge");
      simulateChat("What is the fastest exit?");
    });
    $("#qa-medical")?.addEventListener("click", () => {
      switchView("concierge");
      simulateChat("I need medical help");
    });
    $("#qa-seat")?.addEventListener("click", () => {
      switchView("concierge");
      simulateChat("How do I get back to my seat?");
    });
    // Flow
    $("#btn-regenerate-flow")?.addEventListener("click", renderFlow);
    // Map layers
    $$(".map-ctrl-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        $$(".map-ctrl-btn").forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
        MapsService.setLayer(btn.id.replace("map-layer-", ""));
      }),
    );
    // Social
    $("#btn-create-group")?.addEventListener("click", handleCreateGroup);
    $("#btn-join-group")?.addEventListener("click", handleJoinGroup);
    $("#btn-find-meetup")?.addEventListener("click", handleFindMeetup);
    // Settings
    $("#setting-theme")?.addEventListener("change", (e) =>
      AccessibilityService.setTheme(e.target.value),
    );
    $("#setting-font-scale")?.addEventListener("input", (e) =>
      AccessibilityService.applyFontScale(e.target.value / 100),
    );
    $("#setting-reduce-motion")?.addEventListener("change", (e) => {
      e.target.setAttribute("aria-checked", e.target.checked ? "true" : "false");
      AccessibilityService.toggleReduceMotion(e.target.checked);
    });
    // Toggle aria-checked on switch-role checkboxes
    ["setting-notifications", "setting-haptics"].forEach((id) => {
      const el = $(`#${id}`);
      el?.addEventListener("change", () => {
        el.setAttribute("aria-checked", el.checked ? "true" : "false");
      });
    });
    $("#btn-high-contrast")?.addEventListener("click", () =>
      AccessibilityService.toggleHighContrast(),
    );
    $("#btn-font-size")?.addEventListener("click", () =>
      AccessibilityService.increaseFontSize(),
    );
    // Clock
    setInterval(() => {
      const el = $("#current-time");
      if (el) el.textContent = ArenaUtils.formatTime();
    }, CLOCK_INTERVAL_MS);
  }

  /**
   * Process onboarding form submission.
   * Validates input, persists user state, and transitions to the main app.
   */
  function handleOnboarding() {
    const form = $("#onboarding-form");
    if (!validateForm(form)) {
      showToast("Please fill all required fields", "warning");
      return;
    }

    // Capture and sanitize user inputs to prevent XSS
    _state.user = sanitize($("#user-name").value);
    _state.venue = $("#venue-select").value;
    _state.section = $("#seat-section").value;
    _state.accessibility = $("#accessibility-needs").value;
    _state.lang = $("#lang-select").value;

    // Persist session to local storage
    storage.set("user", _state);
    storage.set("section", _state.section);

    // Hide onboarding and display the main application
    $("#onboarding-modal").style.display = "none";
    showApp();
    showToast(`Welcome, ${_state.user}! 🎉`, "success");

    // Announce welcome to screen readers
    AccessibilityService.announce(`Welcome to ArenaFlow AI, ${_state.user}`);
    document.documentElement.lang = _state.lang;
  }

  /**
   * Show the main application shell and start all service engines.
   * Initializes Google Cloud services, crowd simulation, and Firebase.
   */
  function showApp() {
    $("#app-shell").style.display = "flex";
    $("#venue-name-display").textContent =
      VENUE_NAMES[_state.venue] || "Stadium";
    // Initialize Google Cloud integration (logging, monitoring, analytics)
    GoogleCloudService.init();
    GoogleCloudService.trackEvent("app_loaded", {
      venue: _state.venue,
      section: _state.section,
      accessibility: _state.accessibility,
    });

    // Start engines
    CrowdEngine.start(CROWD_TICK_INTERVAL_MS);
    CrowdEngine.onUpdate(onCrowdTick);
    FirebaseService.init(); // Will use local mode without config
    renderFlow();
    renderAlerts();
    // Init heatmap on dashboard (delay to let layout settle)
    requestAnimationFrame(() => {
      requestAnimationFrame(initHeatmapCanvas);
    });
  }

  /** @type {boolean} Whether the map canvas has been initialized. */
  let _mapInitialized = false;

  /**
   * Switch the active view and update navigation state.
   * Initializes the map canvas on first visit to the map view.
   * @param {string} view - View identifier (e.g. 'dashboard', 'map', 'concierge')
   */
  function switchView(view) {
    _state.currentView = view;

    // Hide all views, then show the target view
    $$(".view").forEach((v) => (v.style.display = "none"));
    const el = $(`#view-${view}`);
    if (el) el.style.display = "block";

    // Update navigation button active states and ARIA attributes
    $$(".nav-btn[data-view]").forEach((b) => {
      b.classList.remove("active");
      b.removeAttribute("aria-current");
    });
    const btn = $(`.nav-btn[data-view="${view}"]`);
    if (btn) {
      btn.classList.add("active");
      btn.setAttribute("aria-current", "page");
    }

    // Update title and announce to screen readers
    $("#view-title").textContent = VIEW_TITLES[view] || view;
    AccessibilityService.announce(`Navigated to ${VIEW_TITLES[view] || view}`);

    // Track view change event in Google Analytics
    GoogleCloudService.trackEvent("view_change", { view_name: view });

    // Initialize map canvas only when map view becomes visible for performance
    if (view === "map" && !_mapInitialized) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          MapsService.init("map-canvas");
          _mapInitialized = true;
        });
      });
    }

    // Re-initialize heatmap specifically when returning to the dashboard
    if (view === "dashboard") {
      requestAnimationFrame(initHeatmapCanvas);
    }
  }

  /**
   * Safely set text content of a DOM element by selector.
   * @param {string} id - CSS selector
   * @param {string|number} value - Text content to set
   */
  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  /**
   * Set a progress bar width and ARIA value.
   * @param {string} id - CSS selector for the bar fill element
   * @param {number} widthPercent - Bar fill width (0–100)
   */
  function setBar(id, widthPercent) {
    const element = $(id);
    if (element) {
      element.style.width = widthPercent + "%";
      element.setAttribute("aria-valuenow", Math.round(widthPercent));
    }
  }

  /**
   * Set a trend indicator's text and direction class.
   * @param {string} id - CSS selector for the trend element
   * @param {string} value - Display text
   * @param {boolean} isPositive - Whether the trend is favorable
   */
  function setTrend(id, value, isPositive) {
    const element = $(id);
    if (element) {
      element.textContent = value;
      element.className = `stat-trend ${isPositive ? "trend-up" : "trend-down"}`;
    }
  }

  /**
   * Handle each crowd simulation tick — update all dashboard widgets.
   * Submits snapshot data to Google Cloud Functions for BigQuery ingestion.
   * @param {object} snapshot - Current crowd engine snapshot
   */
  function onCrowdTick(snapshot) {
    const avgD = Math.round(snapshot.avgDensity * PERCENT_MULTIPLIER);
    setText("#stat-crowd", avgD + "%");
    setText("#stat-wait", CrowdEngine.getWaitTime("food") + " min");
    setText("#stat-flow", Math.round(FLOW_SCORE_BASE + (Math.random() - RANDOM_CENTER_OFFSET) * FLOW_SCORE_VARIATION) + "/100");
    setText("#stat-safety", CrowdEngine.getSafetyIndex() + "%");
    // Progress bars with ARIA updates
    setBar("#bar-crowd", avgD);
    setBar(
      "#bar-wait",
      (CrowdEngine.getWaitTime("food") / MAX_WAIT_MINUTES) * PERCENT_MULTIPLIER,
    );
    setBar("#bar-safety", CrowdEngine.getSafetyIndex());
    // Trend indicators
    setTrend(
      "#trend-crowd",
      avgD > CROWD_TREND_THRESHOLD
        ? "↑ " + (avgD - CROWD_TREND_THRESHOLD) + "%"
        : "↓ " + (CROWD_TREND_THRESHOLD - avgD) + "%",
      avgD <= CROWD_TREND_THRESHOLD,
    );
    renderPredictions();
    // Quick action wait times
    setText("#qa-food-wait", "~" + CrowdEngine.getWaitTime("food") + " min");
    setText(
      "#qa-restroom-wait",
      "~" + CrowdEngine.getWaitTime("restroom") + " min",
    );
    setText("#qa-merch-wait", "~" + CrowdEngine.getWaitTime("merch") + " min");
    const bestGate = CrowdEngine.findLeastCrowded("gate");
    setText(
      "#qa-exit-wait",
      bestGate
        ? bestGate.name.split("(")[1]?.replace(")", "") || "Gate B"
        : "Gate B",
    );
    drawHeatmapCanvas(snapshot);
    // Submit to Google Cloud Functions → BigQuery pipeline (rate-limited)
    GoogleCloudService.submitToCloudFunction(snapshot);
  }

  /** @type {HTMLCanvasElement|null} Dashboard heatmap canvas reference. */
  let _hmCanvas;

  /** @type {CanvasRenderingContext2D|null} Dashboard heatmap 2D context. */
  let _hmCtx;

  /**
   * Initialize the dashboard heatmap canvas dimensions and DPI scaling.
   * Called on app start and when returning to the dashboard view.
   */
  function initHeatmapCanvas() {
    _hmCanvas = $("#heatmap-canvas");
    if (!_hmCanvas) return;
    _hmCtx = _hmCanvas.getContext("2d");
    const parent = _hmCanvas.parentElement;
    const dpr = devicePixelRatio || 1;
    const parentWidth = parent.clientWidth > HEATMAP_MIN_PARENT_WIDTH
      ? parent.clientWidth - HEATMAP_PARENT_PADDING
      : HEATMAP_FALLBACK_WIDTH;
    const canvasWidth = Math.min(parentWidth, HEATMAP_MAX_WIDTH);
    _hmCanvas.width = canvasWidth * dpr;
    _hmCanvas.height = HEATMAP_HEIGHT * dpr;
    _hmCanvas.style.width = canvasWidth + "px";
    _hmCanvas.style.height = HEATMAP_HEIGHT + "px";
    _hmCtx.setTransform(1, 0, 0, 1, 0, 0);
    _hmCtx.scale(dpr, dpr);
    drawHeatmapCanvas(CrowdEngine.getSnapshot());
  }
  /**
   * Draw the crowd density heatmap onto the dashboard canvas.
   * Renders stadium outline, field, and zone density blobs.
   * @param {object} snap - Current crowd engine snapshot
   */
  function drawHeatmapCanvas(snap) {
    if (!_hmCtx) return;
    const w = _hmCanvas.clientWidth,
      h = _hmCanvas.clientHeight;
    _hmCtx.clearRect(0, 0, w, h);
    _hmCtx.fillStyle = "#0d1117";
    _hmCtx.fillRect(0, 0, w, h);
    // Stadium outline ellipse
    _hmCtx.beginPath();
    _hmCtx.ellipse(w / 2, h / 2, w * HEATMAP_STADIUM_OUTER_RATIO, h * HEATMAP_STADIUM_OUTER_RATIO, 0, 0, Math.PI * 2);
    _hmCtx.strokeStyle = "rgba(108,99,255,0.3)";
    _hmCtx.lineWidth = 2;
    _hmCtx.stroke();
    _hmCtx.beginPath();
    _hmCtx.ellipse(w / 2, h / 2, w * HEATMAP_STADIUM_INNER_RATIO, h * HEATMAP_STADIUM_INNER_RATIO, 0, 0, Math.PI * 2);
    _hmCtx.strokeStyle = "rgba(0,212,255,0.2)";
    _hmCtx.lineWidth = 1;
    _hmCtx.stroke();
    // Field
    _hmCtx.fillStyle = "rgba(16,185,129,0.08)";
    _hmCtx.beginPath();
    _hmCtx.ellipse(w / 2, h / 2, w * HEATMAP_FIELD_RATIO, h * HEATMAP_FIELD_RATIO, 0, 0, Math.PI * 2);
    _hmCtx.fill();
    if (!snap?.zones) return;
    snap.zones.forEach((z) => {
      const x = z.x * w,
        y = z.y * h,
        blobRadius = BLOB_RADIUS_BASE + z.density * BLOB_RADIUS_SCALE;
      const g = _hmCtx.createRadialGradient(x, y, 0, x, y, blobRadius);
      const color =
        z.density > DENSITY_THRESHOLD_HIGH
          ? "239,68,68"
          : z.density > DENSITY_THRESHOLD_MEDIUM
            ? "245,158,11"
            : "16,185,129";
      g.addColorStop(0, `rgba(${color},${(HEATMAP_BLOB_BASE_OPACITY + z.density * HEATMAP_BLOB_OPACITY_SCALE).toFixed(2)})`);
      g.addColorStop(1, `rgba(${color},0)`);
      _hmCtx.fillStyle = g;
      _hmCtx.beginPath();
      _hmCtx.arc(x, y, blobRadius, 0, Math.PI * 2);
      _hmCtx.fill();
    });
  }

  /**
   * Render AI crowd predictions into the prediction list.
   * Each prediction shows time, description, and confidence level.
   */
  function renderPredictions() {
    const list = $("#prediction-list");
    if (!list) return;
    const preds = CrowdEngine.generatePredictions();
    list.innerHTML = preds
      .map(
        (p) => `
      <li class="prediction-item ${sanitize(p.type)}" role="listitem">
        <span class="prediction-time">${sanitize(p.time)}</span>
        <span class="prediction-text">${sanitize(p.text)}</span>
        <span class="prediction-confidence">Confidence: ${sanitize(p.confidence)}</span>
      </li>`,
      )
      .join("");
  }

  /**
   * Generate and render the personalized activity flow timeline.
   * Queries FlowOptimizer with current user profile and crowd data.
   */
  function renderFlow() {
    const timeline = $("#flow-timeline");
    if (!timeline) return;
    const snapshot = CrowdEngine.getSnapshot();
    const profile = {
      section: _state.section,
      accessibility: _state.accessibility,
    };
    const flow = FlowOptimizer.generateFlow(profile, snapshot);
    timeline.innerHTML = flow.items
      .map(
        (item, i) => `
      <div class="flow-item ${sanitize(item.status)}" role="listitem" style="animation-delay:${i * FLOW_ITEM_ANIM_DELAY_SEC}s">
        <span class="flow-item-time">${sanitize(item.time)}</span>
        <h3 class="flow-item-title">${sanitize(item.icon)} ${sanitize(item.label)}</h3>
        <p class="flow-item-desc">📍 ${sanitize(item.zone)} · ${sanitize(item.duration)} · Density: ${sanitize(item.density)}%</p>
        ${item.savings ? `<p class="flow-item-savings">⚡ ${sanitize(item.savings)}</p>` : ""}
      </div>`,
      )
      .join("");
    const updateStat = (id, value) => {
      const element = $(id);
      if (element) element.textContent = value;
    };
    updateStat("#flow-time-saved", flow.totalTimeSaved + " min");
    updateStat("#flow-activities", flow.items.length);
    updateStat("#flow-score-val", flow.flowScore);
  }

  /** @type {number} Timestamp of last chat message for rate limiting. */
  let _lastChatTime = 0;

  /** Minimum interval between chat messages (ms) to prevent abuse. */
  const CHAT_RATE_LIMIT_MS = 1000;

  /** Maximum allowed chat message length. */
  const MAX_CHAT_LENGTH = 500;

  /**
   * Handle AI Concierge chat submission.
   * Rate-limited and input-length validated for security.
   * Tracks chat events via Google Analytics 4.
   */
  async function handleChat() {
    try {
      const input = $("#chat-input");
      const msg = input.value.trim().substring(0, MAX_CHAT_LENGTH);
      if (!msg) return;
      // Rate limiting
      const now = Date.now();
      if (now - _lastChatTime < CHAT_RATE_LIMIT_MS) {
        showToast("Please wait before sending another message", "warning");
        return;
      }
      _lastChatTime = now;
      input.value = "";
      appendChatMsg(msg, "user");
      const typing = appendChatMsg("Thinking...", "bot");
      GoogleCloudService.trackEvent("chat_message", {
        message_length: msg.length,
      });
      const context = {
        snapshot: CrowdEngine.getSnapshot(),
        userSection: _state.section,
        accessibility: _state.accessibility,
      };
      const response = await GeminiService.chat(msg, context);
      typing.querySelector(".chat-bubble").innerHTML = formatMarkdown(response);
      AccessibilityService.announce("AI response received");
    } catch (error) {
      GoogleCloudService.log(GoogleCloudService.Severity.ERROR, "Chat error", {
        error: error.message,
      });
      showToast("Unable to process your message. Please try again.", "danger");
    }
  }

  /**
   * Simulate a chat message from quick action buttons.
   * @param {string} msg - Pre-filled chat message
   */
  function simulateChat(msg) {
    setTimeout(() => {
      $("#chat-input").value = msg;
      handleChat();
    }, SIMULATED_CHAT_DELAY_MS);
  }

  /**
   * Append a chat message bubble to the concierge conversation.
   * @param {string} text - Message content
   * @param {'user'|'bot'} role - Message sender role
   * @returns {HTMLDivElement} The created message element
   */
  function appendChatMsg(text, role) {
    const container = $("#chat-messages");
    const div = document.createElement("div");
    div.className = `chat-msg ${role}`;
    div.innerHTML = `
      <div class="chat-avatar" aria-hidden="true">${role === "bot" ? "🤖" : "👤"}</div>
      <div class="chat-bubble">${role === "user" ? sanitize(text) : formatMarkdown(text)}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  /**
   * Convert limited markdown syntax to safe HTML for chat display.
   * Supports bold (**text**) and newlines.
   * @param {string} text - Raw text with markdown formatting
   * @returns {string} Sanitized HTML string
   */
  function formatMarkdown(text) {
    return sanitize(text)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  /**
   * Handle social group creation.
   * Validates name input, creates group via FirebaseService, and displays the share code.
   */
  function handleCreateGroup() {
    const name = $("#group-name")?.value?.trim().substring(0, MAX_GROUP_NAME_LENGTH);
    if (!name) {
      showToast("Enter a group name", "warning");
      return;
    }
    const code = FirebaseService.createGroup(name, {
      name: _state.user,
      section: _state.section,
    });
    _state.groupCode = code;
    $("#group-code").textContent = code;
    $("#group-code-display").style.display = "block";
    showGroupMembers(code);
    showToast("Group created! Share the code.", "success");
  }

  /**
   * Handle joining an existing social group.
   * Validates group code format before attempting to join via FirebaseService.
   */
  function handleJoinGroup() {
    const code = $("#join-code")?.value?.trim().toUpperCase();
    if (!code || !/^ARENA-[A-Z0-9]{4}$/.test(code)) {
      showToast("Enter a valid code (e.g. ARENA-X7K2)", "warning");
      return;
    }
    const group = FirebaseService.joinGroup(code, {
      name: _state.user,
      section: _state.section,
    });
    if (group) {
      _state.groupCode = code;
      showGroupMembers(code);
      showToast("Joined group!", "success");
    } else {
      showToast("Group not found", "danger");
    }
  }

  /**
   * Display the member list for a social sync group.
   * @param {string} code - Group code to display members for
   */
  function showGroupMembers(code) {
    const group = FirebaseService.getGroup(code);
    if (!group) return;
    $("#group-members-panel").style.display = "block";
    const list = $("#group-members-list");
    list.innerHTML = group.members
      .map(
        (m) => `
      <li class="member-item" role="listitem">
        <div class="member-avatar">${sanitize(m.name?.[0] || "?")}</div>
        <div class="member-info">
          <div class="member-name">${sanitize(m.name)}</div>
          <div class="member-section">Section: ${sanitize(m.section || "Unknown")}</div>
        </div>
      </li>`,
      )
      .join("");
  }

  /**
   * Find and display an AI-recommended meeting point for the current group.
   * Uses FlowOptimizer to calculate the optimal location based on member positions.
   */
  function handleFindMeetup() {
    const group = FirebaseService.getGroup(_state.groupCode);
    if (!group || !group.members.length) {
      showToast("No group members", "warning");
      return;
    }
    const sections = group.members.map((m) => m.section || "north-lower");
    const result = FlowOptimizer.findMeetingPoint(
      sections,
      CrowdEngine.getSnapshot(),
    );
    const el = $("#meetup-result");
    el.style.display = "block";
    el.innerHTML = `<strong>🤝 Recommended Meeting Point</strong><br>${sanitize(result.message)}`;
    showToast("Meeting point found!", "success");
  }

  /**
   * Render the static alerts list with sample notifications.
   * In production, these would come from a real-time alert service.
   */
  function renderAlerts() {
    const list = $("#alerts-list");
    if (!list) return;
    const alerts = [
      {
        icon: "📊",
        title: "Crowd density increasing",
        desc: "North concourse reaching 70% capacity. Consider alternate routes.",
        type: "warning",
        time: "2 min ago",
      },
      {
        icon: "🍔",
        title: "Food Court NE - Short lines!",
        desc: "Wait times under 3 minutes at the northeast food court.",
        type: "success",
        time: "5 min ago",
      },
      {
        icon: "🔀",
        title: "Your flow updated",
        desc: "AI has optimized your activity timeline based on latest crowd data.",
        type: "",
        time: "8 min ago",
      },
      {
        icon: "🏟️",
        title: "Event starting soon",
        desc: "Match kickoff in 15 minutes. Please head to your seats.",
        type: "",
        time: "12 min ago",
      },
      {
        icon: "⚠️",
        title: "Gate C congested",
        desc: "Heavy crowd at south gate. Use Gate B or D for faster entry.",
        type: "danger",
        time: "18 min ago",
      },
    ];
    list.innerHTML = alerts
      .map(
        (a) => `
      <div class="alert-item ${sanitize(a.type)}" role="listitem">
        <span class="alert-icon">${sanitize(a.icon)}</span>
        <div class="alert-content">
          <div class="alert-title">${sanitize(a.title)}</div>
          <div class="alert-desc">${sanitize(a.desc)}</div>
          <div class="alert-time">${sanitize(a.time)}</div>
        </div>
      </div>`,
      )
      .join("");
  }

  /**
   * Activate emergency evacuation mode.
   * Displays the emergency overlay with the nearest exit route.
   */
  function triggerEmergency() {
    const overlay = $("#emergency-overlay");
    overlay.style.display = "flex";
    const bestGate = CrowdEngine.findLeastCrowded("gate");
    const route = $("#emergency-route");
    route.innerHTML =
      `🚪 Nearest Exit: <strong>${sanitize(bestGate ? bestGate.name : "Gate B")}</strong><br>` +
      `📊 Current density: ${bestGate ? Math.round(bestGate.density * 100) : 25}%<br>` +
      `➡️ Follow illuminated emergency signs to the ${sanitize(bestGate ? bestGate.name.split("(")[1]?.replace(")", "") : "East")}`;
    AccessibilityService.announce(
      "Emergency evacuation mode activated. Follow the displayed exit route.",
    );
  }

  // Boot
  document.addEventListener("DOMContentLoaded", init);
  return { switchView };
})();
