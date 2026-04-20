/**
 * ArenaFlow AI — Flow Optimizer
 * Creates personalized, time-optimized activity schedules that coordinate
 * across all attendees to minimize collective wait times.
 * This is the core differentiator: "Air Traffic Control for Stadium Attendees."
 * @module FlowOptimizer
 */

// eslint-disable-next-line no-unused-vars
const FlowOptimizer = (() => {
  "use strict";

  /* ── Constants ─────────────────────────────────────────────── */

  /** Number of optional activities to include in each flow. */
  const OPTIONAL_ACTIVITY_COUNT = 3;

  /** Duration multiplier for wheelchair accessibility. */
  const WHEELCHAIR_DURATION_FACTOR = 1.3;

  /** Duration multiplier for elderly/reduced mobility. */
  const ELDERLY_DURATION_FACTOR = 1.2;

  /** Time slot interval in minutes between activities. */
  const SLOT_INTERVAL_MINUTES = 20;

  /** Minimum number of time slots to generate. */
  const MIN_SLOT_COUNT = 8;

  /** Multiplier for converting to percentages. */
  const PERCENT_MULTIPLIER = 100;

  /** Divisor to convert milliseconds to minutes. */
  const MS_PER_MINUTE = 60000;

  /** Priority weight for activity scoring. */
  const PRIORITY_SCORE_WEIGHT = 2;

  /** Maximum stagger delay in minutes. */
  const MAX_STAGGER_MINUTES = 5;

  /** Multiplier for estimating worst-case wait time. */
  const WORST_WAIT_MULTIPLIER = 1.8;

  /** Base wait time factor for optimized flow. */
  const OPTIMIZED_WAIT_BASE_FACTOR = 0.5;

  /** Dynamic wait time factor for optimized flow based on density. */
  const OPTIMIZED_WAIT_DENSITY_FACTOR = 0.5;

  /** Multiplier for calculating wait time reduction. */
  const WAIT_REDUCTION_FACTOR = 0.6;

  /** Base flow score. */
  const FLOW_SCORE_BASE = 70;

  /** Max flow score. */
  const FLOW_SCORE_MAX = 99;

  /** Weight of time saved in flow score. */
  const FLOW_SCORE_SAVINGS_WEIGHT = 0.8;

  /** Random variation in flow score. */
  const FLOW_SCORE_RANDOM_VARIATION = 10;

  /** Distance to density balance weight for meeting point score. */
  const MEETING_DENSITY_WEIGHT = 0.5;

  /** Multiplier for converting abstract score to meters. */
  const METERS_PER_SCORE_UNIT = 10;
  /**
   * Activity templates with base durations and priorities.
   */
  const ACTIVITY_CATALOG = [
    {
      id: "arrive",
      label: "Arrive & Find Seat",
      icon: "🎟️",
      baseDuration: 10,
      zoneType: "gate",
      priority: 1,
      mandatory: true,
    },
    {
      id: "food-1",
      label: "Grab Food & Drinks",
      icon: "🍔",
      baseDuration: 8,
      zoneType: "food",
      priority: 3,
      mandatory: false,
    },
    {
      id: "restroom-1",
      label: "Restroom Break",
      icon: "🚻",
      baseDuration: 5,
      zoneType: "restroom",
      priority: 2,
      mandatory: false,
    },
    {
      id: "merch",
      label: "Visit Merchandise",
      icon: "🛍️",
      baseDuration: 12,
      zoneType: "merch",
      priority: 5,
      mandatory: false,
    },
    {
      id: "explore",
      label: "Explore Fan Zone",
      icon: "🎪",
      baseDuration: 15,
      zoneType: "concourse",
      priority: 4,
      mandatory: false,
    },
    {
      id: "food-2",
      label: "Halftime Snack",
      icon: "🌭",
      baseDuration: 7,
      zoneType: "food",
      priority: 3,
      mandatory: false,
    },
    {
      id: "restroom-2",
      label: "Halftime Restroom",
      icon: "🚻",
      baseDuration: 5,
      zoneType: "restroom",
      priority: 2,
      mandatory: false,
    },
    {
      id: "seat-return",
      label: "Return to Seat",
      icon: "💺",
      baseDuration: 5,
      zoneType: "seating",
      priority: 1,
      mandatory: true,
    },
    {
      id: "exit",
      label: "Smart Exit",
      icon: "🚪",
      baseDuration: 8,
      zoneType: "gate",
      priority: 1,
      mandatory: true,
    },
  ];

  /**
   * Generate an optimized flow for a user based on their preferences and current crowd state.
   * Uses a greedy optimization approach:
   * 1. Score each activity slot by predicted crowd density
   * 2. Assign activities to time slots that minimize total wait
   * 3. Stagger relative to other users (simulated via random offset)
   *
   * @param {object} userProfile - { section, accessibility, preferences }
   * @param {object} crowdSnapshot - Current crowd engine snapshot
   * @returns {Array<object>} Optimized flow timeline
   */
  function generateFlow(userProfile, crowdSnapshot) {
    const now = new Date();
    const activities = selectActivities(userProfile);
    const slots = generateTimeSlots(now, activities.length);

    // Score each activity-slot combination
    const scoredAssignments = [];
    activities.forEach((activity) => {
      slots.forEach((slot, sIdx) => {
        const minutesFromNow = (slot.getTime() - now.getTime()) / MS_PER_MINUTE;
        const prediction = CrowdEngine.predict(
          getBestZoneForType(activity.zoneType, crowdSnapshot)?.id ||
            "concourse-n",
          minutesFromNow,
        );
        // Lower density = better score; also factor in activity priority
        const score = (1 - prediction.predicted) * PERCENT_MULTIPLIER - activity.priority * PRIORITY_SCORE_WEIGHT;
        scoredAssignments.push({
          activity,
          slot,
          slotIdx: sIdx,
          score,
          prediction,
        });
      });
    });

    // Greedy assignment: best score first, no slot/activity reuse
    scoredAssignments.sort((a, b) => b.score - a.score);
    const usedSlots = new Set();
    const usedActivities = new Set();
    const assignments = [];

    scoredAssignments.forEach((sa) => {
      if (usedSlots.has(sa.slotIdx) || usedActivities.has(sa.activity.id)) {
        return;
      }
      usedSlots.add(sa.slotIdx);
      usedActivities.add(sa.activity.id);
      assignments.push(sa);
    });

    // Sort by time slot
    assignments.sort((a, b) => a.slot - b.slot);

    // Add stagger offset (simulates coordination with other users)
    const staggerMin = Math.floor(Math.random() * MAX_STAGGER_MINUTES);

    // Calculate savings
    const totalSaved = assignments.reduce((sum, a) => {
      const worstWait = Math.round(a.activity.baseDuration * WORST_WAIT_MULTIPLIER);
      const optimizedWait = Math.round(
        a.activity.baseDuration * (OPTIMIZED_WAIT_BASE_FACTOR + a.prediction.predicted * OPTIMIZED_WAIT_DENSITY_FACTOR),
      );
      return sum + (worstWait - optimizedWait);
    }, 0);

    return {
      items: assignments.map((a, i) => {
        const time = new Date(a.slot.getTime() + staggerMin * MS_PER_MINUTE);
        const zone = getBestZoneForType(a.activity.zoneType, crowdSnapshot);
        const waitReduction = Math.round(
          a.activity.baseDuration * (1 - a.prediction.predicted) * WAIT_REDUCTION_FACTOR,
        );
        return {
          id: a.activity.id,
          time: time.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          label: a.activity.label,
          icon: a.activity.icon,
          duration: `${a.activity.baseDuration} min`,
          zone: zone ? zone.name : "Nearest available",
          density: Math.round(a.prediction.predicted * PERCENT_MULTIPLIER),
          confidence: Math.round(a.prediction.confidence * PERCENT_MULTIPLIER),
          savings:
            waitReduction > 0 ? `${waitReduction} min saved vs. average` : null,
          status: i === 0 ? "active" : "upcoming",
        };
      }),
      totalTimeSaved: totalSaved,
      flowScore: Math.min(
        FLOW_SCORE_MAX,
        Math.round(FLOW_SCORE_BASE + totalSaved * FLOW_SCORE_SAVINGS_WEIGHT + Math.random() * FLOW_SCORE_RANDOM_VARIATION),
      ),
    };
  }

  /**
   * Select activities based on user profile and accessibility needs.
   * Creates copies of catalog items to avoid mutating shared data.
   * @param {object} profile - User profile with accessibility preferences
   * @returns {Array<object>} Selected and adjusted activities
   */
  function selectActivities(profile) {
    const mandatory = ACTIVITY_CATALOG.filter((a) => a.mandatory).map((a) => ({ ...a }));
    const optional = ACTIVITY_CATALOG.filter((a) => !a.mandatory).map((a) => ({ ...a }));

    // Shuffle and pick optional activities
    const shuffled = optional.sort(() => Math.random() - 0.5);
    const selected = mandatory.concat(shuffled.slice(0, OPTIONAL_ACTIVITY_COUNT));

    // Apply accessibility duration adjustments to copies (not originals)
    if (profile && profile.accessibility === "wheelchair") {
      selected.forEach((a) => {
        a.baseDuration = Math.round(a.baseDuration * WHEELCHAIR_DURATION_FACTOR);
      });
    }
    if (profile && profile.accessibility === "elderly") {
      selected.forEach((a) => {
        a.baseDuration = Math.round(a.baseDuration * ELDERLY_DURATION_FACTOR);
      });
    }

    return selected.sort((a, b) => a.priority - b.priority);
  }

  /* ── Time Slot Generation ────────────────────────────────── */

  /**
   * Generate evenly spaced time slots starting from a given time.
   * @param {Date} start - Start time for first slot
   * @param {number} count - Minimum number of activity slots needed
   * @returns {Date[]} Array of time slot Date objects
   */
  function generateTimeSlots(start, count) {
    const slots = [];
    const totalSlots = Math.max(count + 2, MIN_SLOT_COUNT);
    for (let i = 0; i < totalSlots; i++) {
      slots.push(new Date(start.getTime() + i * SLOT_INTERVAL_MINUTES * MS_PER_MINUTE));
    }
    return slots;
  }

  /**
   * Find the best (least crowded) zone for a given type.
   * @param {string} type
   * @param {object} snapshot
   * @returns {object|null}
   */
  function getBestZoneForType(type, snapshot) {
    if (!snapshot || !snapshot.zones) return CrowdEngine.findLeastCrowded(type);
    const zones = snapshot.zones.filter((z) => z.type === type);
    if (!zones.length) return null;
    return zones.reduce(
      (best, z) => (z.density < best.density ? z : best),
      zones[0],
    );
  }

  /* ── Group Meeting ──────────────────────────────────────── */

  /**
   * Find optimal meeting point for a group of users in different sections.
   * Uses centroid calculation weighted by crowd density.
   * @param {string[]} sections - Array of section IDs
   * @param {object} snapshot
   * @returns {object} Meeting point recommendation
   */
  function findMeetingPoint(sections, snapshot) {
    const zones = snapshot ? snapshot.zones : CrowdEngine.getSnapshot().zones;
    // Find zones for each section
    const memberZones = sections.map(
      (s) => zones.find((z) => z.id === s) || zones[0],
    );

    // Calculate centroid
    const cx = memberZones.reduce((s, z) => s + z.x, 0) / memberZones.length;
    const cy = memberZones.reduce((s, z) => s + z.y, 0) / memberZones.length;

    // Find nearest low-density zone to centroid (prefer concourse/food types)
    const candidates = zones.filter((z) =>
      ["concourse", "food"].includes(z.type),
    );
    let best = candidates[0];
    let bestScore = Infinity;
    candidates.forEach((z) => {
      const dist = Math.sqrt((z.x - cx) ** 2 + (z.y - cy) ** 2);
      const score = dist + z.density * MEETING_DENSITY_WEIGHT; // Balance distance and crowding
      if (score < bestScore) {
        bestScore = score;
        best = z;
      }
    });

    return {
      zone: best,
      message: `Meet at ${best.name} — currently ${Math.round(best.density * PERCENT_MULTIPLIER)}% capacity, ~${Math.round(bestScore * METERS_PER_SCORE_UNIT)} meters from group center`,
    };
  }

  return { generateFlow, findMeetingPoint, ACTIVITY_CATALOG };
})();
