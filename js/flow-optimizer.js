/**
 * ArenaFlow AI — Flow Optimizer
 * Creates personalized, time-optimized activity schedules that coordinate
 * across all attendees to minimize collective wait times.
 * This is the core differentiator: "Air Traffic Control for Stadium Attendees."
 * @module FlowOptimizer
 */

'use strict';

const FlowOptimizer = (() => {
  /**
   * Activity templates with base durations and priorities.
   */
  const ACTIVITY_CATALOG = [
    { id: 'arrive', label: 'Arrive & Find Seat', icon: '🎟️', baseDuration: 10, zoneType: 'gate', priority: 1, mandatory: true },
    { id: 'food-1', label: 'Grab Food & Drinks', icon: '🍔', baseDuration: 8, zoneType: 'food', priority: 3, mandatory: false },
    { id: 'restroom-1', label: 'Restroom Break', icon: '🚻', baseDuration: 5, zoneType: 'restroom', priority: 2, mandatory: false },
    { id: 'merch', label: 'Visit Merchandise', icon: '🛍️', baseDuration: 12, zoneType: 'merch', priority: 5, mandatory: false },
    { id: 'explore', label: 'Explore Fan Zone', icon: '🎪', baseDuration: 15, zoneType: 'concourse', priority: 4, mandatory: false },
    { id: 'food-2', label: 'Halftime Snack', icon: '🌭', baseDuration: 7, zoneType: 'food', priority: 3, mandatory: false },
    { id: 'restroom-2', label: 'Halftime Restroom', icon: '🚻', baseDuration: 5, zoneType: 'restroom', priority: 2, mandatory: false },
    { id: 'seat-return', label: 'Return to Seat', icon: '💺', baseDuration: 5, zoneType: 'seating', priority: 1, mandatory: true },
    { id: 'exit', label: 'Smart Exit', icon: '🚪', baseDuration: 8, zoneType: 'gate', priority: 1, mandatory: true },
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
    activities.forEach((activity, aIdx) => {
      slots.forEach((slot, sIdx) => {
        const minutesFromNow = (slot.getTime() - now.getTime()) / 60000;
        const prediction = CrowdEngine.predict(
          getBestZoneForType(activity.zoneType, crowdSnapshot)?.id || 'concourse-n',
          minutesFromNow
        );
        // Lower density = better score; also factor in activity priority
        const score = (1 - prediction.predicted) * 100 - activity.priority * 2;
        scoredAssignments.push({ activity, slot, slotIdx: sIdx, score, prediction });
      });
    });

    // Greedy assignment: best score first, no slot/activity reuse
    scoredAssignments.sort((a, b) => b.score - a.score);
    const usedSlots = new Set();
    const usedActivities = new Set();
    const assignments = [];

    scoredAssignments.forEach(sa => {
      if (usedSlots.has(sa.slotIdx) || usedActivities.has(sa.activity.id)) return;
      usedSlots.add(sa.slotIdx);
      usedActivities.add(sa.activity.id);
      assignments.push(sa);
    });

    // Sort by time slot
    assignments.sort((a, b) => a.slot - b.slot);

    // Add stagger offset (simulates coordination with other users)
    const staggerMin = Math.floor(Math.random() * 5);

    // Calculate savings
    const totalSaved = assignments.reduce((sum, a) => {
      const worstWait = Math.round(a.activity.baseDuration * 1.8);
      const optimizedWait = Math.round(a.activity.baseDuration * (0.5 + a.prediction.predicted * 0.5));
      return sum + (worstWait - optimizedWait);
    }, 0);

    return {
      items: assignments.map((a, i) => {
        const time = new Date(a.slot.getTime() + staggerMin * 60000);
        const zone = getBestZoneForType(a.activity.zoneType, crowdSnapshot);
        const waitReduction = Math.round(a.activity.baseDuration * (1 - a.prediction.predicted) * 0.6);
        return {
          id: a.activity.id,
          time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          label: a.activity.label,
          icon: a.activity.icon,
          duration: `${a.activity.baseDuration} min`,
          zone: zone ? zone.name : 'Nearest available',
          density: Math.round(a.prediction.predicted * 100),
          confidence: Math.round(a.prediction.confidence * 100),
          savings: waitReduction > 0 ? `${waitReduction} min saved vs. average` : null,
          status: i === 0 ? 'active' : 'upcoming',
        };
      }),
      totalTimeSaved: totalSaved,
      flowScore: Math.min(99, Math.round(70 + totalSaved * 0.8 + Math.random() * 10)),
    };
  }

  /**
   * Select activities based on user profile.
   * @param {object} profile
   * @returns {Array}
   */
  function selectActivities(profile) {
    let selected = ACTIVITY_CATALOG.filter(a => a.mandatory);
    const optional = ACTIVITY_CATALOG.filter(a => !a.mandatory);

    // Pick 3-4 optional activities
    const shuffled = optional.sort(() => Math.random() - 0.5);
    selected = selected.concat(shuffled.slice(0, 3));

    // Accessibility adjustments
    if (profile && profile.accessibility === 'wheelchair') {
      selected.forEach(a => { a.baseDuration = Math.round(a.baseDuration * 1.3); });
    }
    if (profile && profile.accessibility === 'elderly') {
      selected.forEach(a => { a.baseDuration = Math.round(a.baseDuration * 1.2); });
    }

    return selected.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate evenly spaced time slots starting from now.
   * @param {Date} start
   * @param {number} count
   * @returns {Date[]}
   */
  function generateTimeSlots(start, count) {
    const slots = [];
    const interval = 20; // minutes between slots
    for (let i = 0; i < Math.max(count + 2, 8); i++) {
      slots.push(new Date(start.getTime() + i * interval * 60000));
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
    const zones = snapshot.zones.filter(z => z.type === type);
    if (!zones.length) return null;
    return zones.reduce((best, z) => z.density < best.density ? z : best, zones[0]);
  }

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
    const memberZones = sections.map(s => zones.find(z => z.id === s) || zones[0]);

    // Calculate centroid
    const cx = memberZones.reduce((s, z) => s + z.x, 0) / memberZones.length;
    const cy = memberZones.reduce((s, z) => s + z.y, 0) / memberZones.length;

    // Find nearest low-density zone to centroid (prefer concourse/food types)
    const candidates = zones.filter(z => ['concourse', 'food'].includes(z.type));
    let best = candidates[0];
    let bestScore = Infinity;
    candidates.forEach(z => {
      const dist = Math.sqrt((z.x - cx) ** 2 + (z.y - cy) ** 2);
      const score = dist + z.density * 0.5; // Balance distance and crowding
      if (score < bestScore) { bestScore = score; best = z; }
    });

    return {
      zone: best,
      message: `Meet at ${best.name} — currently ${Math.round(best.density * 100)}% capacity, ~${Math.round(bestScore * 10)} meters from group center`,
    };
  }

  return { generateFlow, findMeetingPoint, ACTIVITY_CATALOG };
})();
