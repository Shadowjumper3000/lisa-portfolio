const API_BASE = "/api";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      ...getAuthHeaders(),
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface Image {
  id: number;
  title: string;
  description: string;
  info?: string;
  yearCreated?: number;
  image_path: string;
  sort_order: number;
  created_at: string;
  // Computed/transformed fields for frontend
  url?: string;
  category?: string;
  updated_at?: string;
}

export interface SiteSettings {
  hero_image_id?: number;
  about_image_id?: number;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

// Transform backend response to frontend format
function transformImage(img: any): Image {
  // Handle both old format (/api/images/gallery/...) and new format (gallery/...)
  let url = img.image_path;
  if (url && !url.startsWith('/api/images/')) {
    url = `/api/images/${url}`;
  }
  
  return {
    ...img,
    url,
    sort_order: img.sort_order ?? 0,
    category: img.info,
  };
}

// Public
export const fetchImages = async (): Promise<Image[]> => {
  const images = await request<any[]>("/images");
  return images.map(transformImage);
};

export const fetchImage = async (id: string): Promise<Image> => {
  const img = await request<any>(`/images/${id}`);
  return transformImage(img);
};

export const fetchSettings = () => request<SiteSettings>("/settings");

// Auth
export const login = (data: LoginPayload) =>
  request<LoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

// Admin
export const uploadImage = (formData: FormData, onProgress?: (pct: number) => void): Promise<Image> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/images`);
    const token = localStorage.getItem("auth_token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const img = JSON.parse(xhr.responseText);
        resolve(transformImage(img));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });
};

export const updateImage = (id: string, data: Partial<Pick<Image, "title" | "description" | "category">>) =>
  request<Image>(`/images/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(transformImage);

export const deleteImage = (id: string) =>
  request<{ success: boolean }>(`/images/${id}`, { method: "DELETE" });

export const reorderImages = (items: { id: number; sort_order: number }[]) =>
  request<{ status: string }>("/images/reorder", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(items),
  });

export const updateSettings = (data: SiteSettings) =>
  request<SiteSettings>("/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

