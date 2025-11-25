import axios from "axios";

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
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
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
};
