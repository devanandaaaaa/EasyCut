import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add the JWT token automatically to authenticated requests.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("easycut-token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export const checkBackendHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

export const createProject = async (projectData) => {
  const response = await api.post("/auth/projects", projectData);
  return response.data;
};

export const uploadProjectFile = async (projectId, file) => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post(
    `/auth/projects/${projectId}/files`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const getProjects = async () => {
  const response = await api.get("/auth/projects");
  return response.data;
};

// Generate a video from a project script and source video.
export const generateVideoFromScript = async (script, sourceVideo) => {
  const response = await api.post("/processing/script", {
    script,
    source_video: sourceVideo,
  });

  return response.data;
};

export default api;