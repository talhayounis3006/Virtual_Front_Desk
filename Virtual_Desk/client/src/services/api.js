/**
 * ============================================================
 *  API SERVICE — services/api.js
 * ============================================================
 *  Centralized API client for all backend requests.
 *
 *  WHAT IT DOES:
 *  - Provides a `request()` helper that handles:
 *    - Adding the Authorization header (JWT token from localStorage)
 *    - Setting Content-Type to application/json
 *    - Parsing JSON responses
 *    - Throwing errors with the server's error message
 *  - Exports an `api` object with methods for every backend endpoint
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Fetch API: the browser's built-in HTTP client.
 *  2. Authorization Header: `Bearer <token>` is how the server knows who you are.
 *  3. API Organization: methods are grouped by resource (auth, business, bookings, etc.)
 *  4. Error Handling: if the response isn't OK, throw an Error with the message.
 * ============================================================
 */

// Base URL for all API requests
// In development, Vite proxies /api to http://localhost:5000 (see vite.config.js)
const API_BASE = "/api";

/**
 * request — the core fetch wrapper.
 *
 * @param {string} endpoint — API path (e.g., "/auth/login")
 * @param {Object} options — fetch options (method, body, headers, etc.)
 * @returns {Promise<any>} — parsed JSON response
 */
async function request(endpoint, options = {}) {
  // Get the JWT token from localStorage (if logged in)
  const token = localStorage.getItem("token");

  // Build the fetch configuration
  const config = {
    headers: {
      "Content-Type": "application/json",
      // If a token exists, add the Authorization header
      // Format: "Bearer <token>" — the server expects this exact format
      ...(token && { Authorization: `Bearer ${token}` }),
      // Allow callers to override/add headers
      ...options.headers,
    },
    ...options,
  };

  // Make the HTTP request
  const res = await fetch(`${API_BASE}${endpoint}`, config);
  // Parse the response body as JSON
  const data = await res.json();

  // If the response was not OK (2xx), throw an error
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

/**
 * api — organized collection of all API methods.
 * Each method maps to a backend endpoint.
 */
export const api = {
  // ---- AUTHENTICATION ----
  auth: {
    register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    me: () => request("/auth/me"), // GET current user
  },

  // ---- BUSINESSES ----
  business: {
    getMine: () => request("/businesses/mine"), // get logged-in user's business
    updateMine: (body) => request("/businesses/mine", { method: "PUT", body: JSON.stringify(body) }),
    getBySlug: (slug) => request(`/businesses/slug/${slug}`), // public: get by URL slug
    addService: (body) => request("/businesses/mine/services", { method: "POST", body: JSON.stringify(body) }),
    removeService: (id) => request(`/businesses/mine/services/${id}`, { method: "DELETE" }),
  },

  // ---- BOOKINGS ----
  bookings: {
    getDashboard: () => request("/bookings/dashboard"), // dashboard stats
    getAll: () => request("/bookings/all"), // all bookings for owner's business
    getByBusiness: (id, date) => {
      const params = date ? `?date=${date}` : "";
      return request(`/bookings/business/${id}${params}`);
    },
    create: (body) => request("/bookings", { method: "POST", body: JSON.stringify(body) }),
    updateStatus: (id, status) =>
      request(`/bookings/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
    update: (id, body) =>
      request(`/bookings/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    getMine: () => request("/bookings/mine"), // logged-in user's bookings
  },

  // ---- AVAILABILITY ----
  availability: {
    getSlots: (businessId, date, serviceId) => {
      let params = `?date=${date}`;
      if (serviceId) params += `&serviceId=${serviceId}`;
      return request(`/availability/${businessId}${params}`);
    },
  },

  // ---- PAYMENTS (Stripe) ----
  payments: {
    createCheckoutSession: (bookingId) =>
      request("/payments/create-checkout-session", { method: "POST", body: JSON.stringify({ bookingId }) }),
    getSession: (sessionId) => request(`/payments/session/${sessionId}`),
  },

  // ---- DASHBOARD ----
  dashboard: {
    getStats: () => request("/dashboard/stats"),
  },

  // ---- SETTINGS ----
  settings: {
    get: () => request("/settings"),
    update: (body) => request("/settings", { method: "PUT", body: JSON.stringify(body) }),
    checkAvailability: (date, time) =>
      request(`/settings/availability?date=${date}&time=${time}`),
  },

  // ---- AI CHAT ----
  chat: {
    send: (body) => request("/chat", { method: "POST", body: JSON.stringify(body) }),
    getLogs: (businessId) => request(`/chat/logs/${businessId}`),
  },
};