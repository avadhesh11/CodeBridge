import axios from "axios";

const rawBackendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const cleanBackendUrl = rawBackendUrl.replace(/\/+$/, "");

const client = axios.create({
  baseURL: `${cleanBackendUrl}/api`,
  withCredentials: true
});

/* interceptor for refresh token */
client.interceptors.response.use(
  (response) => response,
  async (error) => {

    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {

      originalRequest._retry = true;

      await axios.post(
        `${cleanBackendUrl}/api/auth/refresh`,
        {},
        { withCredentials: true }
      );

      return client(originalRequest);
    }

    return Promise.reject(error);
  }
);

/* your wrapper (so old code keeps working) */
const api = async (method, url, data=null) => {
  try {
    console.log(`${import.meta.env.VITE_BACKEND_URL}`)
    const res = await client({
      method,
      url,
      data
    });

    return res;

  } catch (error) {
    console.error(`error in ${url}:`, error?.response?.data || error.message);
    throw error;
  }
};

export default api;