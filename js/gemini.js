/**
 * ArenaFlow AI — Gemini AI Integration
 * Handles conversational AI using Google Gemini API for the stadium concierge.
 * Falls back to a smart local response engine when API key is not configured.
 * @module GeminiService
 */

// eslint-disable-next-line no-unused-vars
const GeminiService = (() => {
  "use strict";
  /* ── Constants ─────────────────────────────────────────────── */

  /** Maximum allowed input message length. */
  const MAX_MESSAGE_LENGTH = 500;

  /** Gemini model identifier. */
  const GEMINI_MODEL = "gemini-2.0-flash";

  /** Gemini REST API base endpoint. */
  const GEMINI_ENDPOINT =
    "https://generativelanguage.googleapis.com/v1beta/models";

  /** Multiplier for converting to percentages. */
  const PERCENT_MULTIPLIER = 100;

  /** Default density percentages. */
  const DEFAULT_DENSITY_FOOD = 50;
  const DEFAULT_DENSITY_RESTROOM = 45;
  const DEFAULT_DENSITY_EXIT = 25;
  const DEFAULT_DENSITY_MERCH = 70;
  const DEFAULT_DENSITY_CONCOURSE = 0.5;

  /** High crowd threshold percentage. */
  const HIGH_CROWD_PERCENT = 70;

  /** Multiplier to estimate exit time from density. */
  const EXIT_TIME_MULTIPLIER = 12;

  /** Default density to use for exit calculation if unknown. */
  const DEFAULT_EXIT_DENSITY = 0.3;

  /** Additional time for browsing merch. */
  const MERCH_BROWSE_ADDED_MINS = 5;

  /* ── State ─────────────────────────────────────────────────── */

  /**
   * Gemini API key.
   * In production, this would be set via environment variable or secure config.
   * @type {string}
   */
  let _apiKey = "";

  /**
   * System prompt that defines the AI concierge persona.
   */
  const SYSTEM_PROMPT = `You are ArenaFlow AI, an intelligent stadium concierge assistant at a large sporting venue. You help attendees with:
  - Finding food, restrooms, and facilities with shortest wait times
  - Navigation and directions within the stadium
  - Real-time crowd information and predictions
  - Group coordination and meeting points
  - Accessibility guidance for wheelchair users, elderly, and families
  - Emergency information and evacuation routes
  - Event schedule, live scores, and entertainment info
  - Parking and transport advice for post-event departure
  - Multi-language support — respond in the user's preferred language when identifiable
  
  Current venue data will be provided with each query. Be concise, friendly, and proactive.
  Always suggest the least crowded option. Use emojis for readability.
  If asked about something outside the stadium context, politely redirect to stadium-related help.`;
  /**
   * Configure the API key for Gemini.
   * @param {string} key
   */
  function configure(key) {
    _apiKey = key;
  }

  /* ── Public API ───────────────────────────────────────────── */

  /**
   * Send a message to Gemini and get a response.
   * Falls back to local pattern matching when the API is unavailable.
   * @param {string} userMessage - User's chat message
   * @param {object} [context={}] - Current venue/crowd context
   * @returns {Promise<string>} AI response text
   */
  async function chat(userMessage, context = {}) {
    const safeMessage = String(userMessage).substring(0, MAX_MESSAGE_LENGTH);
    const contextStr = buildContextString(context);

    if (_apiKey) {
      try {
        return await callGeminiAPI(safeMessage, contextStr);
      } catch (err) {
        console.warn("Gemini API call failed, using local fallback:", err.message);
        return localFallback(safeMessage, context);
      }
    }

    return localFallback(safeMessage, context);
  }

  /* ── API Integration ─────────────────────────────────────── */
  /**
   * Call the Gemini REST API with safety settings and generation config.
   * @param {string} message - Sanitized user message
   * @param {string} contextStr - Formatted venue context string
   * @returns {Promise<string>} Generated response text
   * @throws {Error} If API returns non-200 or empty response
   */
  async function callGeminiAPI(message, contextStr) {
    const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${_apiKey}`;
    const body = {
      contents: [
        {
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\nCurrent venue data:\n${contextStr}\n\nUser: ${message}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 512,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty Gemini response");
    return text;
  }

  /**
   * Build a human-readable context string from current crowd/venue data.
   * Used to provide real-time context to the AI model.
   * @param {object} ctx - Context object with snapshot, userSection, accessibility
   * @returns {string} Formatted multi-line context string
   */
  function buildContextString(ctx) {
    if (!ctx.snapshot) return "No live data available.";
    const s = ctx.snapshot;
    const lines = [
      `Event Phase: ${s.phase}`,
      `Total Attendees: ~${s.totalAttendees?.toLocaleString()}`,
      `Average Density: ${Math.round(s.avgDensity * PERCENT_MULTIPLIER)}%`,
      `Safety Index: ${CrowdEngine.getSafetyIndex()}%`,
      "",
      "Zone Densities:",
    ];
    s.zones?.forEach((z) => {
      lines.push(`  ${z.name}: ${Math.round(z.density * PERCENT_MULTIPLIER)}% (${z.type})`);
    });
    if (ctx.userSection) lines.push(`\nUser Section: ${ctx.userSection}`);
    if (ctx.accessibility) lines.push(`Accessibility: ${ctx.accessibility}`);
    return lines.join("\n");
  }

  /**
   * Smart local fallback when Gemini API is not available.
   * Pattern-matches user intent and provides contextual responses
   * using live crowd data from CrowdEngine.
   * @param {string} message - Lowercase user message to match patterns against
   * @param {object} context - Context with snapshot, userSection, accessibility
   * @returns {string} Formatted response with emoji and markdown
   */
  function localFallback(message, context) {
    const msg = message.toLowerCase();
    const snapshot = context.snapshot || CrowdEngine.getSnapshot();

    // Food-related queries
    if (msg.match(/food|eat|hungry|drink|snack|burger|pizza|beer/)) {
      const best = CrowdEngine.findLeastCrowded("food");
      const wait = CrowdEngine.getWaitTime("food");
      return (
        `🍔 **Best food option right now:** ${best ? best.name : "Food Court NW"}\n\n` +
        `📊 Current density: ${best ? Math.round(best.density * PERCENT_MULTIPLIER) : DEFAULT_DENSITY_FOOD}%\n` +
        `⏱️ Estimated wait: ~${wait} minutes\n\n` +
        `💡 **Pro tip:** ${wait > 8 ? "Wait times are high! I recommend going in about 10 minutes when the rush subsides." : "Great time to grab food — lines are short!"}`
      );
    }

    // Restroom queries
    if (msg.match(/restroom|bathroom|toilet|washroom|loo/)) {
      const best = CrowdEngine.findLeastCrowded("restroom");
      const wait = CrowdEngine.getWaitTime("restroom");
      return (
        `🚻 **Nearest available restroom:** ${best ? best.name : "Restrooms North"}\n\n` +
        `📊 Current density: ${best ? Math.round(best.density * PERCENT_MULTIPLIER) : DEFAULT_DENSITY_RESTROOM}%\n` +
        `⏱️ Estimated wait: ~${wait} minutes\n\n` +
        `🗺️ Head towards the ${best ? best.name.split(" ").pop() : "North"} concourse.`
      );
    }

    // Navigation / directions
    if (msg.match(/where|find|navigate|direction|how.*(get|go)|seat|section/)) {
      return (
        `🗺️ **Navigation Help**\n\n` +
        `Your section: **${context.userSection || "North Lower"}**\n` +
        `📍 Follow the illuminated signs along the concourse.\n\n` +
        `Current concourse density: ${Math.round((snapshot.zones?.find((z) => z.id === "concourse-n")?.density || DEFAULT_DENSITY_CONCOURSE) * PERCENT_MULTIPLIER)}%\n\n` +
        `💡 Would you like me to find the fastest route to a specific location?`
      );
    }

    // Crowd / wait time queries
    if (msg.match(/crowd|busy|wait|line|queue|density|packed/)) {
      const avgD = Math.round(snapshot.avgDensity * PERCENT_MULTIPLIER);
      return (
        `📊 **Current Crowd Status**\n\n` +
        `🏟️ Overall density: **${avgD}%**\n` +
        `🛡️ Safety index: **${CrowdEngine.getSafetyIndex()}%**\n` +
        `📈 Phase: **${snapshot.phase?.replace("-", " ")}**\n\n` +
        `${avgD > HIGH_CROWD_PERCENT ? "⚠️ Venue is getting crowded. Consider waiting before moving." : "✅ Comfortable crowd levels — good time to move around!"}`
      );
    }

    // Exit queries
    if (msg.match(/exit|leave|go home|parking|car/)) {
      const best = CrowdEngine.findLeastCrowded("gate");
      return (
        `🚪 **Fastest Exit: ${best ? best.name : "Gate B"}**\n\n` +
        `📊 Current density: ${best ? Math.round(best.density * PERCENT_MULTIPLIER) : DEFAULT_DENSITY_EXIT}%\n` +
        `⏱️ Estimated exit time: ~${Math.round((best?.density || DEFAULT_EXIT_DENSITY) * EXIT_TIME_MULTIPLIER)} minutes\n\n` +
        `💡 **Smart tip:** Leaving 5 minutes before the final whistle can save you up to 20 minutes in exit queues!`
      );
    }

    // Emergency
    if (msg.match(/emergency|help|medical|hurt|injured|fire|danger/)) {
      return (
        `🚨 **Emergency Assistance**\n\n` +
        `🏥 Nearest medical station: **Medical Station (East Wing)**\n` +
        `📞 Stadium security: **Dial 100 on any courtesy phone**\n` +
        `🚪 Nearest emergency exit: Follow illuminated green signs\n\n` +
        `⚠️ If this is a life-threatening emergency, alert the nearest steward immediately.`
      );
    }

    // Merchandise
    if (msg.match(/merch|shop|buy|souvenir|jersey|store/)) {
      const best = CrowdEngine.findLeastCrowded("merch");
      return (
        `🛍️ **Merchandise Store**\n\n` +
        `📍 Location: ${best ? best.name : "Main Merchandise Store"}\n` +
        `📊 Current density: ${best ? Math.round(best.density * PERCENT_MULTIPLIER) : DEFAULT_DENSITY_MERCH}%\n` +
        `⏱️ Estimated browse time with current crowds: ~${CrowdEngine.getWaitTime("merch") + MERCH_BROWSE_ADDED_MINS} minutes\n\n` +
        `💡 Best time to visit: During play when most fans are in their seats.`
      );
    }

    // Default
    return (
      `👋 I can help you with:\n\n` +
      `🍔 **Food** — Find the shortest food lines\n` +
      `🚻 **Restrooms** — Locate nearest available\n` +
      `🗺️ **Navigation** — Directions to any area\n` +
      `📊 **Crowd Info** — Real-time density data\n` +
      `🚪 **Exit Planning** — Fastest way out\n` +
      `🏥 **Emergency** — Medical & safety help\n` +
      `🛍️ **Merchandise** — Store locations\n\n` +
      `Just ask me anything about the venue! 😊`
    );
  }

  /**
   * Translate text using Google Cloud Translation API.
   * Falls back to returning original text if API is unavailable
   * or language code is invalid.
   * @param {string} text - Text to translate
   * @param {string} [targetLang='en'] - ISO 639-1 language code
   * @returns {Promise<string>} Translated text or original on failure
   */
  async function translate(text, targetLang = "en") {
    if (targetLang === "en" || !_apiKey) return text;
    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${_apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, target: targetLang, format: "text" }),
      });
      const data = await res.json();
      return data?.data?.translations?.[0]?.translatedText || text;
    } catch {
      return text;
    }
  }

  return { configure, chat, translate };
})();
