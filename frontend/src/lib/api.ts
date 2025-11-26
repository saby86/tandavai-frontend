import axios from "axios";
// API Version: v7-archive-path (Force Rebuild)

const getBaseUrl = () => {
    // Always use the local Next.js proxy to bypass client-side firewalls
    return "/api/proxy";
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

export const burnClip = async (clipId: string, data: { start_time?: number; end_time?: number; style_name?: string }) => {
    const response = await api.post(`/clips/${clipId}/burn`, data);
    return response.data;
};

export const deleteProject = async (projectId: string) => {
    // Now going through the generic proxy automatically
    const response = await api.post(`/projects/${projectId}/archive`, {});
    return response.data;
};

export const deleteOldProjects = async (days: number) => {
    const response = await api.post("/projects/cleanup", null, {
        params: { older_than_days: days }
    });
    return response.data;
};
