import axios from "axios";

import {
  ACCESS_TOKEN,
  CSRF_TOKEN,
} from "@/features/auth/constants";

// @deprecated: This client is being replaced by Convex
const api = axios.create({
  // baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const csrfToken = localStorage.getItem(CSRF_TOKEN);
    const accessToken = localStorage.getItem(ACCESS_TOKEN);

    // Si existe un access_token y la solicitud es a una ruta privada, agregarlo al encabezado
    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }

    if (csrfToken) {
      config.headers["X-Csrf-Token"] = csrfToken;
    }

    return config;
  },
  (error) => {
    // Manejar errores en la solicitud
    return Promise.reject(error);
  }
);

// Agregar interceptor de respuesta
// api.interceptors.response.use(
//   (response) => {
//     // Si la respuesta es exitosa, simplemente devuélvela
//     return response;
//   },
//   (error) => {
//     // Manejar errores de respuesta
//     if (error.response?.status === 401) {
//       // Token expirado o inválido, cerrar sesión
//       try {
//         useAuthStore.getState().logout();
//         toast.info("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
//         // Opcional: Redirigir al login
//         window.location.href = "/iniciar-sesion"; // Ajusta la ruta según tu aplicación
//       } catch (err) {
//         toast.error("Error al cerrar sesión. Inténtalo de nuevo.");
//       }
//     }
//     return Promise.reject(error);
//   }
// );

export default api;
