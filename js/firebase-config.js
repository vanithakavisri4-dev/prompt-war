/**
 * ArenaFlow AI — Firebase Integration
 * Real-time data sync for crowd density, user coordination, and group management.
 * Uses Firebase Realtime Database and Authentication.
 * Falls back to local simulation when Firebase is not configured.
 * @module FirebaseService
 */
'use strict';
const FirebaseService = (() => {
  let _db = null, _auth = null, _configured = false;
  const _groups = new Map();
  /**
   * Initialize Firebase with project config.
   * @param {object} config - Firebase project configuration
   */
  function init(config) {
    if (!config || !config.apiKey || typeof firebase === 'undefined') {
      console.info('Firebase not configured — using local simulation mode');
      return;
    }
    try {
      firebase.initializeApp(config);
      _db = firebase.database();
      _auth = firebase.auth();
      _configured = true;
      _auth.signInAnonymously().catch(e => console.warn('Firebase auth:', e.message));
    } catch (e) { console.warn('Firebase init error:', e.message); }
  }
  /** Check if Firebase is active. */
  function isConfigured() { return _configured; }
  /**
   * Push crowd snapshot to Firebase for real-time sharing.
   * @param {object} snapshot
   */
  async function pushCrowdData(snapshot) {
    if (!_configured || !_db) return;
    try {
      await _db.ref('crowd/latest').set({
        ...snapshot,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
      });
    } catch (e) { console.warn('Firebase push error:', e.message); }
  }
  /**
   * Listen for real-time crowd updates from Firebase.
   * @param {Function} callback
   */
  function onCrowdUpdate(callback) {
    if (!_configured || !_db) return;
    _db.ref('crowd/latest').on('value', snap => {
      const data = snap.val();
      if (data) callback(data);
    });
  }
  /**
   * Create a group for social sync.
   * @param {string} name
   * @param {object} creator - { name, section }
   * @returns {string} Group code
   */
  function createGroup(name, creator) {
    const code = 'ARENA-' + ArenaUtils.randomId(4);
    const group = { name, code, members: [creator], createdAt: Date.now() };
    if (_configured && _db) {
      _db.ref(`groups/${code}`).set(group);
    }
    _groups.set(code, group);
    return code;
  }
  /**
   * Join an existing group.
   * @param {string} code
   * @param {object} member - { name, section }
   * @returns {object|null} Group data
   */
  function joinGroup(code, member) {
    if (_configured && _db) {
      _db.ref(`groups/${code}/members`).push(member);
    }
    let group = _groups.get(code);
    if (!group) {
      group = { name: 'Group', code, members: [], createdAt: Date.now() };
      _groups.set(code, group);
    }
    group.members.push(member);
    return group;
  }
  /**
   * Get group members.
   * @param {string} code
   * @returns {object|null}
   */
  function getGroup(code) { return _groups.get(code) || null; }
  /**
   * Listen for group updates.
   * @param {string} code
   * @param {Function} callback
   */
  function onGroupUpdate(code, callback) {
    if (_configured && _db) {
      _db.ref(`groups/${code}`).on('value', snap => {
        const data = snap.val();
        if (data) { _groups.set(code, data); callback(data); }
      });
    }
  }
  return { init, isConfigured, pushCrowdData, onCrowdUpdate, createGroup, joinGroup, getGroup, onGroupUpdate };
})();
