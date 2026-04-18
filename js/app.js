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

  /** Maximum wait time for food calculation. */
  const MAX_WAIT_MINUTES = 15;

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
      setTimeout(() => {
        const loader = $("#loading-screen");
        if (loader) {
          loader.style.opacity = "0";
          setTimeout(() => (loader.style.display = "none"), LOADING_FADE_MS);
        }
        const saved = storage.get("user");
        if (saved) {
          _state = { ..._state, ...saved };
          showApp();
        } else {
          $("#onboarding-modal").style.display = "flex";
        }
      }, LOADING_SCREEN_DURATION_MS);
      bindEvents();
      AccessibilityService.init();
    } catch (error) {
      console.error("[App] Initialization failed:", error);
    }
  }

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
    $("#setting-reduce-motion")?.addEventListener("change", (e) =>
      AccessibilityService.toggleReduceMotion(e.target.checked),
    );
    // Accessibility buttons
        // After the existing setting-reduce-motion listener, add:
    ["setting-notifications", "setting-haptics"].forEach((id) => {
      const el = $(`#${id}`);
      el?.addEventListener("change", () => {
        el.setAttribute("aria-checked", el.checked ? "true" : "false");
      });
    });
    $("#setting-reduce-motion")?.addEventListener("change", (e) => {
      e.target.setAttribute("aria-checked", e.target.checked ? "true" : "false");
      AccessibilityService.toggleReduceMotion(e.target.checked);
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

  function handleOnboarding() {
    const form = $("#onboarding-form");
    if (!validateForm(form)) {
      showToast("Please fill all required fields", "warning");
      return;
    }
    _state.user = sanitize($("#user-name").value);
    _state.venue = $("#venue-select").value;
    _state.section = $("#seat-section").value;
    _state.accessibility = $("#accessibility-needs").value;
    _state.lang = $("#lang-select").value;
    storage.set("user", _state);
    storage.set("section", _state.section);
    $("#onboarding-modal").style.display = "none";
    showApp();
    showToast(`Welcome, ${_state.user}! 🎉`, "success");
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

  let _mapInitialized = false;
  function switchView(view) {
    _state.currentView = view;
    $$(".view").forEach((v) => (v.style.display = "none"));
    const el = $(`#view-${view}`);
    if (el) el.style.display = "block";
    $$(".nav-btn[data-view]").forEach((b) => {
      b.classList.remove("active");
      b.removeAttribute("aria-current");
    });
    const btn = $(`.nav-btn[data-view="${view}"]`);
    if (btn) {
      btn.classList.add("active");
      btn.setAttribute("aria-current", "page");
    }
    $("#view-title").textContent = VIEW_TITLES[view] || view;
    AccessibilityService.announce(`Navigated to ${VIEW_TITLES[view] || view}`);
    GoogleCloudService.trackEvent("view_change", { view_name: view });
    // Initialize map canvas only when map view becomes visible
    if (view === "map" && !_mapInitialized) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          MapsService.init("map-canvas");
          _mapInitialized = true;
        });
      });
    }
    // Re-init heatmap when returning to dashboard
    if (view === "dashboard") {
      requestAnimationFrame(initHeatmapCanvas);
    }
  }

  /**
   * Handle each crowd simulation tick — update all dashboard widgets.
   * Submits snapshot data to Google Cloud Functions for BigQuery ingestion.
   * @param {object} snapshot - Current crowd engine snapshot
   */
  function onCrowdTick(snapshot) {
    const avgD = Math.round(snapshot.avgDensity * 100);
    const setText = (id, v) => {
      const e = $(id);
      if (e) e.textContent = v;
    };
    setText("#stat-crowd", avgD + "%");
    setText("#stat-wait", CrowdEngine.getWaitTime("food") + " min");
    setText("#stat-flow", Math.round(87 + (Math.random() - 0.5) * 6) + "/100");
    setText("#stat-safety", CrowdEngine.getSafetyIndex() + "%");
    // Progress bars with ARIA updates
    const setBar = (id, w) => {
      const e = $(id);
      if (e) {
        e.style.width = w + "%";
        e.setAttribute("aria-valuenow", Math.round(w));
      }
    };
    setBar("#bar-crowd", avgD);
    setBar(
      "#bar-wait",
      (CrowdEngine.getWaitTime("food") / MAX_WAIT_MINUTES) * 100,
    );
    setBar("#bar-safety", CrowdEngine.getSafetyIndex());
    // Trend indicators
    const setTrend = (id, v, up) => {
      const e = $(id);
      if (e) {
        e.textContent = v;
        e.className = `stat-trend ${up ? "trend-up" : "trend-down"}`;
      }
    };
    setTrend(
      "#trend-crowd",
      avgD > 60 ? "↑ " + (avgD - 60) + "%" : "↓ " + (60 - avgD) + "%",
      avgD <= 60,
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

  let _hmCanvas, _hmCtx;
  function initHeatmapCanvas() {
    _hmCanvas = $("#heatmap-canvas");
    if (!_hmCanvas) return;
    _hmCtx = _hmCanvas.getContext("2d");
    const p = _hmCanvas.parentElement;
    const dpr = devicePixelRatio || 1;
    const pw = p.clientWidth > 60 ? p.clientWidth - 48 : 650;
    const cw = Math.min(pw, 700);
    _hmCanvas.width = cw * dpr;
    _hmCanvas.height = 400 * dpr;
    _hmCanvas.style.width = cw + "px";
    _hmCanvas.style.height = "400px";
    _hmCtx.setTransform(1, 0, 0, 1, 0, 0); // reset transform before scaling
    _hmCtx.scale(dpr, dpr);
    // Draw immediately with current data
    drawHeatmapCanvas(CrowdEngine.getSnapshot());
  }
  function drawHeatmapCanvas(snap) {
    if (!_hmCtx) return;
    const w = _hmCanvas.clientWidth,
      h = _hmCanvas.clientHeight;
    _hmCtx.clearRect(0, 0, w, h);
    _hmCtx.fillStyle = "#0d1117";
    _hmCtx.fillRect(0, 0, w, h);
    // Stadium outline ellipse
    _hmCtx.beginPath();
    _hmCtx.ellipse(w / 2, h / 2, w * 0.44, h * 0.44, 0, 0, Math.PI * 2);
    _hmCtx.strokeStyle = "rgba(108,99,255,0.3)";
    _hmCtx.lineWidth = 2;
    _hmCtx.stroke();
    _hmCtx.beginPath();
    _hmCtx.ellipse(w / 2, h / 2, w * 0.28, h * 0.28, 0, 0, Math.PI * 2);
    _hmCtx.strokeStyle = "rgba(0,212,255,0.2)";
    _hmCtx.lineWidth = 1;
    _hmCtx.stroke();
    // Field
    _hmCtx.fillStyle = "rgba(16,185,129,0.08)";
    _hmCtx.beginPath();
    _hmCtx.ellipse(w / 2, h / 2, w * 0.18, h * 0.18, 0, 0, Math.PI * 2);
    _hmCtx.fill();
    if (!snap?.zones) return;
    snap.zones.forEach((z) => {
      const x = z.x * w,
        y = z.y * h,
        r = 15 + z.density * 30;
      const g = _hmCtx.createRadialGradient(x, y, 0, x, y, r);
      const color =
        z.density > 0.8
          ? "239,68,68"
          : z.density > 0.6
            ? "245,158,11"
            : "16,185,129";
      g.addColorStop(0, `rgba(${color},${(0.5 + z.density * 0.3).toFixed(2)})`);
      g.addColorStop(1, `rgba(${color},0)`);
      _hmCtx.fillStyle = g;
      _hmCtx.beginPath();
      _hmCtx.arc(x, y, r, 0, Math.PI * 2);
      _hmCtx.fill();
    });
  }

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
      <div class="flow-item ${sanitize(item.status)}" role="listitem" style="animation-delay:${i * 0.1}s">
        <span class="flow-item-time">${sanitize(item.time)}</span>
        <h3 class="flow-item-title">${sanitize(item.icon)} ${sanitize(item.label)}</h3>
        <p class="flow-item-desc">📍 ${sanitize(item.zone)} · ${sanitize(item.duration)} · Density: ${sanitize(item.density)}%</p>
        ${item.savings ? `<p class="flow-item-savings">⚡ ${sanitize(item.savings)}</p>` : ""}
      </div>`,
      )
      .join("");
    const el = (id, v) => {
      const e = $(id);
      if (e) e.textContent = v;
    };
    el("#flow-time-saved", flow.totalTimeSaved + " min");
    el("#flow-activities", flow.items.length);
    el("#flow-score-val", flow.flowScore);
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

  function formatMarkdown(text) {
    return sanitize(text)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  function handleCreateGroup() {
  const name = $("#group-name")?.value?.trim().substring(0, 50); // max 50 chars
  if (!name) {
    showToast("Enter a group name", "warning");
    return;
  }
    // ... rest unchanged
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

  function handleJoinGroup() {
  const code = $("#join-code")?.value?.trim().toUpperCase();
  if (!code || !/^ARENA-[A-Z0-9]{4}$/.test(code)) {
    showToast("Enter a valid code (e.g. ARENA-X7K2)", "warning");
    return;
  }
    // ... rest unchanged
    const group = FirebaseService.joinGroup(code, {
      name: _state.user,
      section: _state.section,
    });
    if (group) {
      _state.groupCode = code;
      showGroupMembers(code);
      showToast("Joined group!", "success");
    } else showToast("Group not found", "danger");
  }

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
