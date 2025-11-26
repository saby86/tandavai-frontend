import axios from "axios";
// API Version: v7-archive-path (Force Rebuild)

const getBaseUrl = () => {
    let url = process.env.NEXT_PUBLIC_API_URL || "";
    if (url && !url.startsWith("http")) {
        url = `https://${url}`;
    }
    // Remove trailing slash if present
    if (url.endsWith("/")) {
        url = url.slice(0, -1);
    }
    return `${url}/api`;
};

export const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        "Content-Type": "application/json",
    },
});

// Add interceptors for auth if needed
api.interceptors.request.use((config) => {
    // const token = await window.Clerk.session.getToken();
    // if (token) {
    //     config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
});

export const createProject = async (sourceUrl: string, clipDuration: string = "auto") => {
    const response = await api.post("/process-video", {
        source_url: sourceUrl,
        clip_duration: clipDuration
    });
    return response.data;
};

export const updateClip = async (clipId: string, data: { transcript?: string }) => {
    const response = await api.patch(`/clips/${clipId}`, data);
    return response.data;
};

export const deleteProject = async (projectId: string) => {
    // Use Local Proxy to bypass client-side firewall/CORS issues
    // The Next.js server will handle the actual request to the backend
    const response = await axios.post(`/api/proxy/archive/${projectId}`, {});
    return response.data;
};

export const deleteOldProjects = async (days: number) => {
    const response = await api.post("/projects/cleanup", null, {
        params: { older_than_days: days }
    });
    return response.data;
};
