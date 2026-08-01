const API_BASE = "/api";

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export const api = {
  auth: {
    register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    me: () => request("/auth/me"),
  },
  business: {
    getMine: () => request("/businesses/mine"),
    updateMine: (body) => request("/businesses/mine", { method: "PUT", body: JSON.stringify(body) }),
    getBySlug: (slug) => request(`/businesses/slug/${slug}`),
    addService: (body) => request("/businesses/mine/services", { method: "POST", body: JSON.stringify(body) }),
    removeService: (id) => request(`/businesses/mine/services/${id}`, { method: "DELETE" }),
  },
  bookings: {
    getDashboard: () => request("/bookings/dashboard"),
    getAll: () => request("/bookings/all"),
    getByBusiness: (id, date) => {
      const params = date ? `?date=${date}` : "";
      return request(`/bookings/business/${id}${params}`);
    },
    create: (body) => request("/bookings", { method: "POST", body: JSON.stringify(body) }),
    updateStatus: (id, status) =>
      request(`/bookings/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
    update: (id, body) =>
      request(`/bookings/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    getMine: () => request("/bookings/mine"),
  },
  availability: {
    getSlots: (businessId, date, serviceId) => {
      let params = `?date=${date}`;
      if (serviceId) params += `&serviceId=${serviceId}`;
      return request(`/availability/${businessId}${params}`);
    },
  },
  payments: {
    createCheckoutSession: (bookingId) =>
      request("/payments/create-checkout-session", { method: "POST", body: JSON.stringify({ bookingId }) }),
    getSession: (sessionId) => request(`/payments/session/${sessionId}`),
  },
  dashboard: {
    getStats: () => request("/dashboard/stats"),
  },
  settings: {
    get: () => request("/settings"),
    update: (body) => request("/settings", { method: "PUT", body: JSON.stringify(body) }),
    checkAvailability: (date, time) =>
      request(`/settings/availability?date=${date}&time=${time}`),
  },
  chat: {
    send: (body) => request("/chat", { method: "POST", body: JSON.stringify(body) }),
    getLogs: (businessId) => request(`/chat/logs/${businessId}`),
  },
};
