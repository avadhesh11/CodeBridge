import axios from "axios";

const client = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL}/api/`,
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
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/refresh`,
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