/**
 * ArenaFlow AI — Firebase Integration
 * Real-time data sync for crowd density, user coordination, and group management.
 * Uses Firebase Realtime Database and Firebase Authentication.
 * Falls back to local in-memory simulation when Firebase is not configured.
 *
 * Features:
 * - Real-time crowd data broadcasting across connected clients
 * - Social group creation and joining with shareable codes
 * - Anonymous authentication for secure data access
 * - Graceful offline fallback with Map-based local storage
 *
 * @module FirebaseService
 * @version 2.0.0
 * @author ArenaFlow AI Team
 */
'use strict';

const FirebaseService = (() => {
  /* ── Constants ─────────────────────────────────────────────── */

  /** Prefix for generated group codes. */
  const GROUP_CODE_PREFIX = 'ARENA-';

  /** Length of random characters in group codes. */
  const GROUP_CODE_RANDOM_LENGTH = 4;

  /** Firebase database path for latest crowd data. */
  const DB_PATH_CROWD = 'crowd/latest';

  /** Firebase database path prefix for groups. */
  const DB_PATH_GROUPS = 'groups';

  /* ── State ─────────────────────────────────────────────────── */

  /** @type {object|null} Firebase database reference. */
  let _db = null;

  /** @type {object|null} Firebase auth reference. */
  let _auth = null;

  /** @type {boolean} Whether Firebase is active and configured. */
  let _configured = false;

  /** @type {Map<string, object>} Local group storage for offline mode. */
  const _groups = new Map();

  /* ── Initialization ───────────────────────────────────────── */

  /**
   * Initialize Firebase with project configuration.
   * Falls back to local simulation if config is missing or Firebase SDK
   * is not loaded.
   *
   * @param {object} [config] - Firebase project configuration object
   * @param {string} config.apiKey - Firebase API key
   * @param {string} config.authDomain - Firebase auth domain
   * @param {string} config.databaseURL - Firebase Realtime Database URL
   * @param {string} config.projectId - Firebase project ID
   */
  function init(config) {
    if (!config || !config.apiKey || typeof firebase === 'undefined') {
      console.info('[FirebaseService] Not configured — using local simulation mode');
      return;
    }

    try {
      firebase.initializeApp(config);
      _db = firebase.database();
      _auth = firebase.auth();
      _configured = true;

      _auth.signInAnonymously().catch(error => {
        console.warn('[FirebaseService] Anonymous auth failed:', error.message);
      });

      console.info('[FirebaseService] Initialized successfully');
    } catch (error) {
      console.warn('[FirebaseService] Init error:', error.message);
    }
  }

  /* ── Status ───────────────────────────────────────────────── */

  /**
   * Check whether Firebase is active and configured.
   * @returns {boolean} True if Firebase is initialized
   */
  function isConfigured() {
    return _configured;
  }

  /* ── Crowd Data Sync ──────────────────────────────────────── */

  /**
   * Push a crowd snapshot to Firebase for real-time sharing across clients.
   * No-op when Firebase is not configured (offline mode).
   *
   * @param {object} snapshot - Crowd engine snapshot data
   * @returns {Promise<void>}
   */
  async function pushCrowdData(snapshot) {
    if (!_configured || !_db) return;

    try {
      await _db.ref(DB_PATH_CROWD).set({
        ...snapshot,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
      });
    } catch (error) {
      console.warn('[FirebaseService] Push error:', error.message);
    }
  }

  /**
   * Listen for real-time crowd updates from Firebase.
   * Calls the provided callback whenever new data arrives.
   *
   * @param {Function} callback - Handler receiving the crowd data object
   */
  function onCrowdUpdate(callback) {
    if (!_configured || !_db) return;

    _db.ref(DB_PATH_CROWD).on('value', snap => {
      const data = snap.val();
      if (data) {
        callback(data);
      }
    });
  }

  /* ── Group Management ─────────────────────────────────────── */

  /**
   * Create a new social sync group with a unique shareable code.
   * The group is stored both locally and in Firebase (when configured).
   *
   * @param {string} name - Display name for the group
   * @param {object} creator - Creator's profile
   * @param {string} creator.name - Creator's display name
   * @param {string} creator.section - Creator's seat section
   * @returns {string} Generated group code (e.g., 'ARENA-X7K2')
   */
  function createGroup(name, creator) {
    const code = GROUP_CODE_PREFIX + ArenaUtils.randomId(GROUP_CODE_RANDOM_LENGTH);
    const group = {
      name,
      code,
      members: [creator],
      createdAt: Date.now(),
    };

    // Persist to Firebase if available
    if (_configured && _db) {
      _db.ref(`${DB_PATH_GROUPS}/${code}`).set(group);
    }

    // Always store locally for offline access
    _groups.set(code, group);
    return code;
  }

  /**
   * Join an existing group by its code.
   * If the group doesn't exist locally, creates a fallback group.
   *
   * @param {string} code - Group code to join (e.g., 'ARENA-X7K2')
   * @param {object} member - Joining member's profile
   * @param {string} member.name - Member's display name
   * @param {string} member.section - Member's seat section
   * @returns {object} Updated group data with member added
   */
  function joinGroup(code, member) {
    // Push to Firebase if available
    if (_configured && _db) {
      _db.ref(`${DB_PATH_GROUPS}/${code}/members`).push(member);
    }

    // Get or create local group
    let group = _groups.get(code);
    if (!group) {
      group = {
        name: 'Group',
        code,
        members: [],
        createdAt: Date.now(),
      };
      _groups.set(code, group);
    }

    group.members.push(member);
    return group;
  }

  /**
   * Retrieve group data by its code.
   *
   * @param {string} code - Group code to look up
   * @returns {object|null} Group data or null if not found
   */
  function getGroup(code) {
    return _groups.get(code) || null;
  }

  /**
   * Listen for real-time updates to a specific group from Firebase.
   * Updates the local group cache whenever remote changes arrive.
   *
   * @param {string} code - Group code to monitor
   * @param {Function} callback - Handler receiving the updated group data
   */
  function onGroupUpdate(code, callback) {
    if (!_configured || !_db) return;

    _db.ref(`${DB_PATH_GROUPS}/${code}`).on('value', snap => {
      const data = snap.val();
      if (data) {
        _groups.set(code, data);
        callback(data);
      }
    });
  }

  /* ── Public API ────────────────────────────────────────────── */

  return {
    init,
    isConfigured,
    pushCrowdData,
    onCrowdUpdate,
    createGroup,
    joinGroup,
    getGroup,
    onGroupUpdate,
  };
})();
