import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("chh_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Let the browser/Axios add the multipart boundary for file uploads.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("chh_token");
      localStorage.removeItem("chh_user");
    }
    return Promise.reject(error);
  }
);

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem("chh_user") || "null"); }
  catch { return null; }
};

export const setAuth = (payload) => {
  localStorage.setItem("chh_token", payload.token);
  localStorage.setItem("chh_user", JSON.stringify(payload.user));
};

export const clearAuth = () => {
  localStorage.removeItem("chh_token");
  localStorage.removeItem("chh_user");
};

export const isLoggedIn = () => Boolean(localStorage.getItem("chh_token"));

export const errorMessage = (error, fallback = "Something went wrong.") =>
  error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
