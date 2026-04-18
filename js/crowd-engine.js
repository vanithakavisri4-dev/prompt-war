/**
 * ArenaFlow AI — Crowd Simulation & Prediction Engine
 * Simulates real-time crowd density, predicts congestion, and generates zone data.
 * @module CrowdEngine
 */

// eslint-disable-next-line no-unused-vars
const CrowdEngine = (() => {
  "use strict";
  // Stadium zones with initial config
  const ZONES = [
    {
      id: "north-lower",
      name: "North Stand Lower",
      x: 0.5,
      y: 0.08,
      capacity: 8000,
      density: 0.55,
      type: "seating",
    },
    {
      id: "north-upper",
      name: "North Stand Upper",
      x: 0.5,
      y: 0.02,
      capacity: 6000,
      density: 0.4,
      type: "seating",
    },
    {
      id: "south-lower",
      name: "South Stand Lower",
      x: 0.5,
      y: 0.92,
      capacity: 8000,
      density: 0.6,
      type: "seating",
    },
    {
      id: "south-upper",
      name: "South Stand Upper",
      x: 0.5,
      y: 0.98,
      capacity: 6000,
      density: 0.45,
      type: "seating",
    },
    {
      id: "east-lower",
      name: "East Stand Lower",
      x: 0.92,
      y: 0.5,
      capacity: 7000,
      density: 0.5,
      type: "seating",
    },
    {
      id: "east-upper",
      name: "East Stand Upper",
      x: 0.98,
      y: 0.5,
      capacity: 5000,
      density: 0.35,
      type: "seating",
    },
    {
      id: "west-lower",
      name: "West Stand Lower",
      x: 0.08,
      y: 0.5,
      capacity: 7000,
      density: 0.52,
      type: "seating",
    },
    {
      id: "west-upper",
      name: "West Stand Upper",
      x: 0.02,
      y: 0.5,
      capacity: 5000,
      density: 0.38,
      type: "seating",
    },
    {
      id: "concourse-n",
      name: "North Concourse",
      x: 0.5,
      y: 0.2,
      capacity: 3000,
      density: 0.65,
      type: "concourse",
    },
    {
      id: "concourse-s",
      name: "South Concourse",
      x: 0.5,
      y: 0.8,
      capacity: 3000,
      density: 0.7,
      type: "concourse",
    },
    {
      id: "concourse-e",
      name: "East Concourse",
      x: 0.8,
      y: 0.5,
      capacity: 2500,
      density: 0.58,
      type: "concourse",
    },
    {
      id: "concourse-w",
      name: "West Concourse",
      x: 0.2,
      y: 0.5,
      capacity: 2500,
      density: 0.62,
      type: "concourse",
    },
    {
      id: "food-nw",
      name: "Food Court NW",
      x: 0.2,
      y: 0.2,
      capacity: 800,
      density: 0.75,
      type: "food",
    },
    {
      id: "food-ne",
      name: "Food Court NE",
      x: 0.8,
      y: 0.2,
      capacity: 800,
      density: 0.8,
      type: "food",
    },
    {
      id: "food-sw",
      name: "Food Court SW",
      x: 0.2,
      y: 0.8,
      capacity: 800,
      density: 0.72,
      type: "food",
    },
    {
      id: "food-se",
      name: "Food Court SE",
      x: 0.8,
      y: 0.8,
      capacity: 800,
      density: 0.68,
      type: "food",
    },
    {
      id: "gate-a",
      name: "Gate A (North)",
      x: 0.5,
      y: 0.0,
      capacity: 2000,
      density: 0.3,
      type: "gate",
    },
    {
      id: "gate-b",
      name: "Gate B (East)",
      x: 1.0,
      y: 0.5,
      capacity: 2000,
      density: 0.25,
      type: "gate",
    },
    {
      id: "gate-c",
      name: "Gate C (South)",
      x: 0.5,
      y: 1.0,
      capacity: 2000,
      density: 0.35,
      type: "gate",
    },
    {
      id: "gate-d",
      name: "Gate D (West)",
      x: 0.0,
      y: 0.5,
      capacity: 2000,
      density: 0.28,
      type: "gate",
    },
    {
      id: "restroom-n",
      name: "Restrooms North",
      x: 0.35,
      y: 0.15,
      capacity: 400,
      density: 0.55,
      type: "restroom",
    },
    {
      id: "restroom-s",
      name: "Restrooms South",
      x: 0.65,
      y: 0.85,
      capacity: 400,
      density: 0.6,
      type: "restroom",
    },
    {
      id: "restroom-e",
      name: "Restrooms East",
      x: 0.85,
      y: 0.35,
      capacity: 400,
      density: 0.5,
      type: "restroom",
    },
    {
      id: "restroom-w",
      name: "Restrooms West",
      x: 0.15,
      y: 0.65,
      capacity: 400,
      density: 0.45,
      type: "restroom",
    },
    {
      id: "merch-main",
      name: "Merchandise Store",
      x: 0.35,
      y: 0.85,
      capacity: 600,
      density: 0.7,
      type: "merch",
    },
    {
      id: "medical-east",
      name: "Medical Station",
      x: 0.9,
      y: 0.3,
      capacity: 200,
      density: 0.15,
      type: "medical",
    },
    {
      id: "vip-west",
      name: "VIP Lounge",
      x: 0.1,
      y: 0.4,
      capacity: 500,
      density: 0.3,
      type: "vip",
    },
  ];

  let _tickInterval = null;
  const _listeners = [];
  let _eventPhase = "pre-game"; // pre-game | first-half | halftime | second-half | post-game
  let _tickCount = 0;

  /**
   * Phase-based density modifiers simulate realistic crowd behavior.
   */
const PHASE_MODIFIERS = Object.freeze({
  "pre-game": Object.freeze({ seating:0.3, concourse:0.8, food:0.9, gate:0.9, restroom:0.4, merch:0.85, medical:0.1, vip:0.5 }),
  "first-half": Object.freeze({ seating:0.9, concourse:0.3, food:0.2, gate:0.1, restroom:0.3, merch:0.1, medical:0.15, vip:0.8 }),
  halftime: Object.freeze({ seating:0.4, concourse:0.9, food:0.95, gate:0.15, restroom:0.9, merch:0.8, medical:0.2, vip:0.6 }),
  "second-half": Object.freeze({ seating:0.85, concourse:0.35, food:0.25, gate:0.1, restroom:0.35, merch:0.15, medical:0.15, vip:0.75 }),
  "post-game": Object.freeze({ seating:0.2, concourse:0.85, food:0.3, gate:0.95, restroom:0.5, merch:0.4, medical:0.1, vip:0.2 }),
});

  /**
   * Simulate one tick of crowd movement.
   * Uses phase modifiers + random noise for realistic density changes.
   */
  function tick() {
    _tickCount++;
    // Auto-advance phase every ~60 ticks (2 min at 2s interval)
    if (_tickCount % 60 === 0) advancePhase();

    const mods = PHASE_MODIFIERS[_eventPhase];
    ZONES.forEach((zone) => {
      const target = mods[zone.type] || 0.5;
      const noise = (Math.random() - 0.5) * 0.08;
      // Smooth interpolation toward target with noise
      zone.density = ArenaUtils.clamp(
        ArenaUtils.lerp(zone.density, target, 0.04) + noise,
        0.02,
        0.98,
      );
    });
    _listeners.forEach((fn) => fn(getSnapshot()));
  }

  /** Advance to the next event phase. */
  function advancePhase() {
    const order = [
      "pre-game",
      "first-half",
      "halftime",
      "second-half",
      "post-game",
    ];
    const idx = order.indexOf(_eventPhase);
    if (idx < order.length - 1) {
      _eventPhase = order[idx + 1];
      ArenaUtils.showToast(
        `Event phase: ${_eventPhase.replace("-", " ").toUpperCase()}`,
        "info",
      );
    }
  }

  /** Set phase manually. */
  function setPhase(phase) {
    if (PHASE_MODIFIERS[phase]) _eventPhase = phase;
  }

  /** Get current snapshot of all zone data. */
  function getSnapshot() {
    return {
      timestamp: Date.now(),
      phase: _eventPhase,
      zones: ZONES.map((z) => ({ ...z })),
      avgDensity: ZONES.reduce((s, z) => s + z.density, 0) / ZONES.length,
      totalAttendees: Math.round(
        ZONES.reduce((s, z) => s + z.density * z.capacity, 0),
      ),
    };
  }

  /**
   * Predict crowd density for a zone N minutes into the future.
   * Uses linear extrapolation from current trend + phase modifier.
   * @param {string} zoneId
   * @param {number} minutesAhead
   * @returns {{ predicted: number, confidence: number }}
   */
  function predict(zoneId, minutesAhead) {
    const zone = ZONES.find((z) => z.id === zoneId);
    if (!zone) return { predicted: 0.5, confidence: 0 };
    const futureMods = PHASE_MODIFIERS[_eventPhase];
    const target = futureMods[zone.type] || 0.5;
    const predicted = ArenaUtils.clamp(
      ArenaUtils.lerp(zone.density, target, minutesAhead * 0.02),
      0,
      1,
    );
    const confidence = Math.max(0.5, 1 - minutesAhead * 0.03);
    return {
      predicted: Math.round(predicted * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Get wait time estimate for a zone type in minutes.
   * @param {string} type
   * @returns {number}
   */
  function getWaitTime(type) {
    const zones = ZONES.filter((z) => z.type === type);
    if (!zones.length) return 0;
    const avgDensity = zones.reduce((s, z) => s + z.density, 0) / zones.length;
    return Math.round(avgDensity * 15); // Max 15 min wait at 100% density
  }

  /**
   * Find the zone of a given type with the lowest density.
   * @param {string} type
   * @returns {object|null}
   */
  function findLeastCrowded(type) {
    const zones = ZONES.filter((z) => z.type === type);
    if (!zones.length) return null;
    return zones.reduce(
      (best, z) => (z.density < best.density ? z : best),
      zones[0],
    );
  }

  /**
   * Generate AI predictions for the next 30 minutes.
   * @returns {Array<{time: string, text: string, confidence: string, type: string}>}
   */
  function generatePredictions() {
    const preds = [];
    const intervals = [5, 10, 15, 20, 30];
    const now = new Date();
    intervals.forEach((min) => {
      const futureTime = new Date(now.getTime() + min * 60000);
      const timeStr = futureTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      // Pick the zone with highest predicted density
      let maxPred = { predicted: 0 };
      let maxZone = ZONES[0];
      ZONES.forEach((z) => {
        const p = predict(z.id, min);
        if (p.predicted > maxPred.predicted) {
          maxPred = p;
          maxZone = z;
        }
      });
      let type = "info";
      let text = "";
      if (maxPred.predicted > 0.85) {
        type = "danger";
        text = `${maxZone.name} expected to reach critical density (${Math.round(maxPred.predicted * 100)}%)`;
      } else if (maxPred.predicted > 0.7) {
        type = "warning";
        text = `${maxZone.name} likely to be crowded (${Math.round(maxPred.predicted * 100)}%)`;
      } else {
        type = "success";
        text = `${maxZone.name} predicted comfortable (${Math.round(maxPred.predicted * 100)}%)`;
      }
      preds.push({
        time: timeStr,
        text,
        confidence: `${Math.round(maxPred.confidence * 100)}%`,
        type,
      });
    });
    return preds;
  }

  /** Register a listener for tick updates. */
  function onUpdate(fn) {
    _listeners.push(fn);
  }

  /** Start the simulation. */
  function start(intervalMs = 2000) {
    if (_tickInterval) return;
    _tickInterval = setInterval(tick, intervalMs);
    tick(); // Immediate first tick
  }

  /** Stop the simulation. */
  function stop() {
    clearInterval(_tickInterval);
    _tickInterval = null;
  }

  /** Get safety index (0-100). */
  function getSafetyIndex() {
    const avgDensity = ZONES.reduce((s, z) => s + z.density, 0) / ZONES.length;
    const maxDensity = Math.max(...ZONES.map((z) => z.density));
    return Math.round((1 - maxDensity * 0.5 - avgDensity * 0.3) * 100);
  }

  return {
    start,
    stop,
    onUpdate,
    getSnapshot,
    predict,
    getWaitTime,
    findLeastCrowded,
    generatePredictions,
    setPhase,
    advancePhase,
    getSafetyIndex,
    ZONES,
  };
})();
