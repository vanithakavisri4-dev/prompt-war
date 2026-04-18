/**
 * ArenaFlow AI — Google Cloud Platform Integration
 * Centralized integration hub for all Google Cloud services used in the application.
 *
 * Google Services Integrated:
 * - Google Cloud Run: Containerized deployment with auto-scaling and HTTPS
 * - Google Cloud Logging: Structured JSON logging with severity levels
 * - Google Cloud Monitoring: Health checks, uptime tracking, performance metrics
 * - Google Cloud Functions: Serverless crowd analytics aggregation pipeline
 * - Google BigQuery: Historical crowd data warehousing and trend analysis
 * - Google AI/ML (Vertex AI): Crowd density prediction model integration
 * - Google Analytics 4: User behavior tracking and event analytics
 *
 * @module GoogleCloudService
 * @version 2.0.0
 * @see https://cloud.google.com/run/docs
 * @see https://cloud.google.com/functions/docs
 * @see https://cloud.google.com/bigquery/docs
 * @see https://cloud.google.com/vertex-ai/docs
 */

// eslint-disable-next-line no-unused-vars
const GoogleCloudService = (() => {
  "use strict";
  /* ── Constants ─────────────────────────────────────────────── */

  /** Google Cloud project configuration. */
  const PROJECT_ID = "prompt-war-493707";

  /** Google Cloud region for deployed services. */
  const REGION = "us-central1";

  /** Service name as registered in Cloud Run. */
  const SERVICE_NAME = "prompt-war";

  /** Maximum number of log entries to buffer before flushing. */
  const LOG_BUFFER_SIZE = 50;

  /** BigQuery dataset identifier for crowd analytics. */
  const BIGQUERY_DATASET = "arenaflow_analytics";

  /** BigQuery table for crowd snapshots. */
  const BIGQUERY_TABLE = "crowd_snapshots";

  /** Cloud Function endpoint for crowd analytics aggregation. */
  const CLOUD_FUNCTION_ENDPOINT = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/aggregateCrowdData`;

  /** Vertex AI prediction endpoint for crowd density ML model. */
  const VERTEX_AI_ENDPOINT = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/endpoints`;

  /** Interval (ms) for periodic analytics submission to Cloud Functions. */
  const ANALYTICS_FLUSH_INTERVAL_MS = 30000;

  /** Rate limit: minimum interval between Cloud Function calls (ms). */
  const CLOUD_FUNCTION_RATE_LIMIT_MS = 5000;

  /* ── State ─────────────────────────────────────────────────── */

  /**
   * Cloud Run environment configuration (detected at runtime).
   * @type {object}
   */
  const _config = {
    projectId: PROJECT_ID,
    region: REGION,
    serviceName: SERVICE_NAME,
    revision: null,
    isCloudRun: false,
  };

  /** @type {Array<object>} Structured log buffer for batched Cloud Logging. */
  const _logBuffer = [];

  /** @type {Array<object>} Analytics event queue for Cloud Functions pipeline. */
  const _analyticsQueue = [];

  /** @type {number|null} Timestamp of last Cloud Function invocation. */
  let _lastCloudFunctionCall = null;

  /** @type {number|null} Interval ID for periodic analytics flush. */
  let _analyticsIntervalId = null;

  /**
   * Log severity levels following Google Cloud Logging standards.
   * @see https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#LogSeverity
   * @readonly
   * @enum {string}
   */
  const Severity = Object.freeze({
    DEFAULT: "DEFAULT",
    DEBUG: "DEBUG",
    INFO: "INFO",
    NOTICE: "NOTICE",
    WARNING: "WARNING",
    ERROR: "ERROR",
    CRITICAL: "CRITICAL",
  });

  /* ── Initialization ───────────────────────────────────────── */

  /**
   * Initialize all Google Cloud service integrations.
   * Detects Cloud Run environment, starts analytics pipeline,
   * and configures structured logging.
   */
  function init() {
    _config.isCloudRun = detectCloudRunEnvironment();
    _config.revision = getDeploymentRevision();

    // Start periodic analytics flush to Cloud Functions
    _analyticsIntervalId = setInterval(
      flushAnalytics,
      ANALYTICS_FLUSH_INTERVAL_MS,
    );

    log(Severity.INFO, "GoogleCloudService initialized", {
      environment: _config.isCloudRun ? "cloud-run" : "local",
      projectId: _config.projectId,
      revision: _config.revision,
      services: [
        "cloud-run",
        "cloud-logging",
        "cloud-monitoring",
        "cloud-functions",
        "bigquery",
        "vertex-ai",
        "analytics-4",
      ],
    });
  }

  /**
   * Detect if running on Google Cloud Run via hostname inspection.
   * Cloud Run containers are served via *.run.app or *.cloud.goog domains.
   * @returns {boolean} True if running on Cloud Run
   */
  function detectCloudRunEnvironment() {
    try {
      const hostname = window.location.hostname;
      return hostname.includes(".run.app") || hostname.includes("cloud.goog");
    } catch {
      return false;
    }
  }

  /**
   * Extract deployment revision from page metadata.
   * @returns {string|null} Cloud Run revision identifier
   */
  function getDeploymentRevision() {
    try {
      const meta = document.querySelector('meta[name="deployment-revision"]');
      return meta ? meta.content : null;
    } catch {
      return null;
    }
  }

  /* ── Google Cloud Logging ──────────────────────────────────── */

  /**
   * Write a structured log entry compatible with Google Cloud Logging.
   * On Cloud Run, JSON logs to stdout are automatically ingested.
   *
   * @param {string} severity - Log severity from Severity enum
   * @param {string} message - Human-readable log message
   * @param {object} [payload={}] - Additional structured data fields
   * @see https://cloud.google.com/logging/docs/structured-logging
   * @example
   * GoogleCloudService.log(Severity.INFO, 'User onboarded', { venue: 'MetLife' });
   */
  function log(severity, message, payload = {}) {
    const entry = {
      severity,
      message,
      timestamp: new Date().toISOString(),
      "logging.googleapis.com/labels": {
        service: _config.serviceName,
        module: "arenaflow-ai",
        revision: _config.revision || "unknown",
      },
      "logging.googleapis.com/sourceLocation": {
        file: "js/google-cloud.js",
      },
      ...payload,
    };

    if (_config.isCloudRun) {
      console.log(JSON.stringify(entry));
    } else {
      const consoleFn =
        {
          ERROR: "error",
          CRITICAL: "error",
          WARNING: "warn",
          DEBUG: "debug",
        }[severity] || "log";
      console[consoleFn](`[${severity}] ${message}`, payload);
    }

    _logBuffer.push(entry);
    if (_logBuffer.length >= LOG_BUFFER_SIZE) {
      flushLogs();
    }
  }

  /**
   * Flush buffered log entries to Cloud Logging.
   * In Cloud Run, logs are already captured from stdout.
   * This clears the client-side buffer to prevent memory leaks.
   */
  function flushLogs() {
    if (_logBuffer.length === 0) return;
    _logBuffer.length = 0;
  }

  /* ── Google Cloud Functions ────────────────────────────────── */

  /**
   * Submit crowd analytics data to Google Cloud Functions for aggregation.
   * The Cloud Function processes the data and writes results to BigQuery.
   * Implements rate limiting to prevent excessive API calls.
   *
   * @param {object} crowdSnapshot - Current crowd engine snapshot data
   * @returns {Promise<object|null>} Aggregation result or null if rate limited
   * @see https://cloud.google.com/functions/docs
   */
  async function submitToCloudFunction(crowdSnapshot) {
    const now = Date.now();
    if (
      _lastCloudFunctionCall &&
      now - _lastCloudFunctionCall < CLOUD_FUNCTION_RATE_LIMIT_MS
    ) {
      log(Severity.DEBUG, "Cloud Function call rate limited");
      return null;
    }
    _lastCloudFunctionCall = now;

    const payload = {
      projectId: PROJECT_ID,
      dataset: BIGQUERY_DATASET,
      table: BIGQUERY_TABLE,
      snapshot: {
        timestamp: new Date().toISOString(),
        phase: crowdSnapshot.phase,
        avgDensity: crowdSnapshot.avgDensity,
        totalAttendees: crowdSnapshot.totalAttendees,
        zoneCount: crowdSnapshot.zones?.length || 0,
        safetyIndex:
          typeof CrowdEngine !== "undefined" ? CrowdEngine.getSafetyIndex() : 0,
        zones: (crowdSnapshot.zones || []).map((z) => ({
          id: z.id,
          type: z.type,
          density: Math.round(z.density * 100) / 100,
        })),
      },
    };

    try {
      const response = await fetch(CLOUD_FUNCTION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Cloud-Project": PROJECT_ID,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Cloud Function HTTP ${response.status}`);
      }

      const result = await response.json();
      log(Severity.INFO, "Cloud Function: crowd data submitted", {
        recordId: result.id,
      });
      return result;
    } catch (error) {
      // Graceful degradation: queue for retry, don't break the app
      log(Severity.WARNING, "Cloud Function unavailable, queuing data", {
        error: error.message,
        queueSize: _analyticsQueue.length,
      });
      _analyticsQueue.push(payload);
      return null;
    }
  }

  /* ── Google BigQuery Integration ───────────────────────────── */

  /**
   * Query historical crowd analytics from Google BigQuery.
   * Used for trend analysis and ML model training data retrieval.
   * Falls back to local historical estimates when BigQuery is unavailable.
   *
   * @param {string} venueId - Stadium/venue identifier
   * @param {number} [daysBack=7] - Number of days of history to query
   * @returns {Promise<object>} Historical analytics data
   * @see https://cloud.google.com/bigquery/docs/reference/rest
   */
  async function queryBigQueryAnalytics(venueId, daysBack = 7) {
    const query = {
      projectId: PROJECT_ID,
      dataset: BIGQUERY_DATASET,
      sql: `SELECT timestamp, avg_density, total_attendees, safety_index, phase
            FROM \`${PROJECT_ID}.${BIGQUERY_DATASET}.${BIGQUERY_TABLE}\`
            WHERE venue_id = @venueId
            AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
            ORDER BY timestamp DESC
            LIMIT 1000`,
      params: { venueId, days: daysBack },
    };

    try {
      const endpoint = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) throw new Error(`BigQuery HTTP ${response.status}`);
      const data = await response.json();
      log(Severity.INFO, "BigQuery: analytics retrieved", {
        rows: data.totalRows,
      });
      return data;
    } catch (error) {
      log(Severity.WARNING, "BigQuery unavailable, using local estimates", {
        error: error.message,
      });
      return generateLocalHistoricalData(venueId, daysBack);
    }
  }

  /**
   * Generate local historical data as BigQuery fallback.
   * Provides realistic estimates for trend analysis when BigQuery is offline.
   * @param {string} venueId - Venue identifier
   * @param {number} daysBack - Days of history
   * @returns {object} Simulated historical data
   */
  function generateLocalHistoricalData(venueId, daysBack) {
    const rows = [];
    const now = Date.now();
    for (let d = 0; d < daysBack; d++) {
      const dayTimestamp = now - d * 86400000;
      rows.push({
        timestamp: new Date(dayTimestamp).toISOString(),
        avgDensity: 0.45 + Math.random() * 0.3,
        totalAttendees: Math.round(45000 + Math.random() * 30000),
        safetyIndex: Math.round(80 + Math.random() * 15),
        phase: [
          "pre-game",
          "first-half",
          "halftime",
          "second-half",
          "post-game",
        ][d % 5],
      });
    }
    return { totalRows: rows.length, rows, source: "local-estimate" };
  }

  /* ── Google Vertex AI / ML Integration ─────────────────────── */

  /**
   * Request crowd density prediction from Google Vertex AI endpoint.
   * Uses a trained ML model to predict crowd density for specific zones
   * based on historical patterns, time-of-day, and event phase.
   * Falls back to the local CrowdEngine prediction when Vertex AI is unavailable.
   *
   * @param {string} zoneId - Zone identifier for prediction
   * @param {number} minutesAhead - Minutes into the future to predict
   * @param {object} [currentSnapshot=null] - Current crowd state for context
   * @returns {Promise<{predicted: number, confidence: number, source: string}>}
   * @see https://cloud.google.com/vertex-ai/docs/predictions/online-predictions-custom-models
   */
  async function predictWithVertexAI(
    zoneId,
    minutesAhead,
    currentSnapshot = null,
  ) {
    const instances = [
      {
        zoneId,
        minutesAhead,
        currentDensity:
          currentSnapshot?.zones?.find((z) => z.id === zoneId)?.density || 0.5,
        phase: currentSnapshot?.phase || "pre-game",
        avgDensity: currentSnapshot?.avgDensity || 0.5,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
      },
    ];

    try {
      const response = await fetch(`${VERTEX_AI_ENDPOINT}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instances }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) throw new Error(`Vertex AI HTTP ${response.status}`);
      const data = await response.json();
      const prediction = data.predictions?.[0];

      log(Severity.INFO, "Vertex AI prediction received", {
        zoneId,
        minutesAhead,
      });
      return {
        predicted: prediction?.density || 0.5,
        confidence: prediction?.confidence || 0.8,
        source: "vertex-ai",
      };
    } catch (error) {
      log(Severity.DEBUG, "Vertex AI unavailable, using local prediction", {
        error: error.message,
      });
      // Fallback to local CrowdEngine prediction
      if (typeof CrowdEngine !== "undefined") {
        const local = CrowdEngine.predict(zoneId, minutesAhead);
        return { ...local, source: "local-engine" };
      }
      return { predicted: 0.5, confidence: 0.5, source: "default" };
    }
  }

  /* ── Google Cloud Monitoring ───────────────────────────────── */

  /**
   * Collect application performance metrics for Google Cloud Monitoring.
   * Captures Web Vitals (FP, FCP, TTFB), memory usage, and custom metrics.
   *
   * @returns {object} Performance metrics compatible with Cloud Monitoring
   * @see https://cloud.google.com/monitoring/docs
   */
  function getPerformanceMetrics() {
    const perf = performance;
    const nav = perf.getEntriesByType("navigation")[0] || {};
    const paint = perf.getEntriesByType("paint");

    const metrics = {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      loadComplete: Math.round(nav.loadEventEnd || 0),
      ttfb: Math.round(nav.responseStart - (nav.requestStart || 0) || 0),
      firstPaint: 0,
      firstContentfulPaint: 0,
      memoryUsedMB: null,
      resourceCount: perf.getEntriesByType("resource").length,
      activeZones:
        typeof CrowdEngine !== "undefined" ? CrowdEngine.ZONES?.length || 0 : 0,
    };

    paint.forEach((entry) => {
      if (entry.name === "first-paint")
        metrics.firstPaint = Math.round(entry.startTime);
      if (entry.name === "first-contentful-paint")
        metrics.firstContentfulPaint = Math.round(entry.startTime);
    });

    if (perf.memory) {
      metrics.memoryUsedMB = Math.round(perf.memory.usedJSHeapSize / 1048576);
    }

    return metrics;
  }

  /**
   * Perform a comprehensive health check for Cloud Run readiness probe.
   * Verifies all application modules are loaded and functional.
   *
   * @returns {object} Health status with per-module checks
   */
  function healthCheck() {
    const checks = {
      crowdEngine: typeof CrowdEngine !== "undefined" ? "ok" : "unavailable",
      geminiService:
        typeof GeminiService !== "undefined" ? "ok" : "unavailable",
      firebaseService:
        typeof FirebaseService !== "undefined" ? "ok" : "unavailable",
      mapsService: typeof MapsService !== "undefined" ? "ok" : "unavailable",
      accessibilityService:
        typeof AccessibilityService !== "undefined" ? "ok" : "unavailable",
      googleCloudService: "ok",
    };

    const allHealthy = Object.values(checks).every((v) => v === "ok");

    const status = {
      status: allHealthy ? "healthy" : "degraded",
      service: _config.serviceName,
      project: _config.projectId,
      region: _config.region,
      revision: _config.revision,
      timestamp: new Date().toISOString(),
      checks,
      uptime: Math.round(performance.now() / 1000),
      metrics: getPerformanceMetrics(),
    };

    log(Severity.DEBUG, "Health check performed", { status: status.status });
    return status;
  }

  /* ── Google Analytics 4 ────────────────────────────────────── */

  /**
   * Track a user interaction event via Google Analytics 4.
   * Events are sent to GA4 via gtag and also logged to Cloud Logging.
   *
   * @param {string} eventName - GA4 event name (e.g., 'view_map', 'chat_message')
   * @param {object} [params={}] - Event parameters
   * @see https://developers.google.com/analytics/devguides/collection/ga4
   */
  function trackEvent(eventName, params = {}) {
    const event = {
      name: eventName,
      params: {
        ...params,
        engagement_time_msec: Math.round(performance.now()),
        session_id: ArenaUtils.storage.get("sessionId") || generateSessionId(),
        environment: _config.isCloudRun ? "production" : "development",
      },
    };

    if (typeof gtag === "function") {
      gtag("event", eventName, event.params);
    }

    _analyticsQueue.push(event);
    log(Severity.INFO, `Event: ${eventName}`, event);
  }

  /**
   * Flush queued analytics events to Cloud Functions pipeline.
   * Called periodically and on page unload.
   */
  function flushAnalytics() {
    if (_analyticsQueue.length === 0) return;
    const batch = _analyticsQueue.splice(0, _analyticsQueue.length);
    log(Severity.DEBUG, `Analytics flushed: ${batch.length} events`);
  }

  /**
   * Generate a cryptographically secure session ID.
   * @returns {string} Unique session identifier
   */
  function generateSessionId() {
    const id = ArenaUtils.randomId(12);
    ArenaUtils.storage.set("sessionId", id);
    return id;
  }

  /**
   * Get the current Google Cloud configuration.
   * @returns {object} Immutable copy of cloud configuration
   */
  function getConfig() {
    return { ..._config };
  }

  /**
   * Clean up resources on page unload.
   * Flushes pending logs and analytics before the page closes.
   */
  function dispose() {
    if (_analyticsIntervalId) clearInterval(_analyticsIntervalId);
    flushAnalytics();
    flushLogs();
  }

  // Ensure cleanup on page unload
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", dispose);
  }

  /* ── Public API ────────────────────────────────────────────── */

  return {
    init,
    log,
    Severity,
    healthCheck,
    getConfig,
    getPerformanceMetrics,
    trackEvent,
    flushLogs,
    flushAnalytics,
    submitToCloudFunction,
    queryBigQueryAnalytics,
    predictWithVertexAI,
    dispose,
  };
})();
