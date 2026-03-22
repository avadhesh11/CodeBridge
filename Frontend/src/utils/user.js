import axios from "axios";

const user = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true
});

user.interceptors.response.use(
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

      return user(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default user;