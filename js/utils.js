/**
 * ArenaFlow AI — Utility Functions
 * Common helpers used across the application.
 * @module utils
 */

"use strict";

const ArenaUtils = (() => {
  /**
   * Safely query a DOM element by selector.
   * @param {string} sel - CSS selector.
   * @param {Element} [ctx=document] - Context element.
   * @returns {Element|null}
   */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  /**
   * Query all matching DOM elements.
   * @param {string} sel
   * @param {Element} [ctx=document]
   * @returns {NodeListOf<Element>}
   */
  const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

  /**
   * Sanitize user input to prevent XSS.
   * @param {string} str - Raw string.
   * @returns {string} Sanitized string.
   */
  function sanitize(str) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return String(str).replace(/[&<>"']/g, (c) => map[c]);
  }

  /**
   * Debounce a function call.
   * @param {Function} fn
   * @param {number} ms
   * @returns {Function}
   */
  function debounce(fn, ms = 300) {
    let timer;
    return function (...args) {          // ← was: (...args) =>
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /**
   * Generate a random ID string.
   * @param {number} [len=8]
   * @returns {string}
   */
  function randomId(len = 8) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    for (let i = 0; i < len; i++) result += chars[arr[i] % chars.length];
    return result;
  }

  /**
   * Format a Date to HH:MM:SS string.
   * @param {Date} [date]
   * @returns {string}
   */
  function formatTime(date = new Date()) {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  /**
   * Clamp a number between min and max.
   * @param {number} val
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Linear interpolation.
   * @param {number} a
   * @param {number} b
   * @param {number} t - 0..1
   * @returns {number}
   */
  function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
  }

  /**
   * Show a toast notification.
   * @param {string} message
   * @param {'info'|'success'|'warning'|'danger'} [type='info']
   * @param {number} [duration=4000]
   */
  function showToast(message, type = "info", duration = 4000) {
    const container = $("#toast-container");
    if (!container) return;
    const icons = { info: "ℹ️", success: "✅", warning: "⚠️", danger: "🚨" };
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = `<span>${sanitize(icons[type] || "ℹ️")}</span><span>${sanitize(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("removing");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Validate that required form fields are filled.
   * @param {HTMLFormElement} form
   * @returns {boolean}
   */
  function validateForm(form) {
    const fields = form.querySelectorAll("[required]");
    let valid = true;
    fields.forEach((f) => {
      if (!f.value.trim()) {
        f.style.borderColor = "#ef4444";
        valid = false;
      } else {
        f.style.borderColor = "";
      }
    });
    return valid;
  }

  /**
   * Simple localStorage wrapper with JSON serialization.
   */
  const storage = {
    get(key, fallback = null) {
      try {
        return JSON.parse(localStorage.getItem(`arenaflow_${key}`)) ?? fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(`arenaflow_${key}`, JSON.stringify(value));
      } catch {
        /* quota exceeded */
      }
    },
    remove(key) {
      localStorage.removeItem(`arenaflow_${key}`);
    },
  };

  return {
    $,
    $$,
    sanitize,
    debounce,
    randomId,
    formatTime,
    clamp,
    lerp,
    showToast,
    validateForm,
    storage,
  };
})();
