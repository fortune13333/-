import { Device, Block, User } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000'; // Your backend server URL

interface ApiErrorData {
    detail: string | { msg: string }[];
}

class ApiService {
    private token: string | null = null;

    constructor() {
        this.token = sessionStorage.getItem('chaintrace_token');
    }
    
    // --- Helper Methods ---
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config: RequestInit = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                const errorData: ApiErrorData = await response.json().catch(() => ({ detail: response.statusText }));
                // Handle complex Pydantic error messages
                if (Array.isArray(errorData.detail)) {
                    throw new Error(errorData.detail.map(e => e.msg).join(', '));
                }
                throw new Error(errorData.detail || `Request failed with status ${response.status}`);
            }
             // Handle 204 No Content
            if (response.status === 204) {
                return null as T;
            }
            return await response.json();
        } catch (error) {
            console.error(`API request to ${endpoint} failed:`, error);
            throw error; // Re-throw to be handled by the caller
        }
    }

    public getToken(): string | null {
        return this.token;
    }
    
    // This function is now only a fallback for decoding, but getCurrentUser is preferred.
    public getUserFromToken(token: string): User | null {
        try {
            const payloadBase64 = token.split('.')[1];
            const decodedPayload = atob(payloadBase64);
            const { sub } = JSON.parse(decodedPayload);
            // This is a simplified user object. The role must be fetched from the server.
            // This is a temporary assignment for UI purposes before full user object is fetched.
            const role = sub === 'admin' ? 'admin' : 'operator';
            return { username: sub, role };
        } catch (error) {
            console.error("Failed to decode token", error);
            this.logout();
            return null;
        }
    }


    // --- Authentication ---
    async login(username: string, password: string):Promise<User> {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const data = await this.request<{ access_token: string }>('/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
        });

        this.token = data.access_token;
        sessionStorage.setItem('chaintrace_token', this.token);
        
        // After getting token, fetch the full user profile to get all details, including role.
        return this.getCurrentUser();
    }
    
    getCurrentUser(): Promise<User> {
        return this.request<User>('/api/users/me');
    }

    logout() {
        this.token = null;
        sessionStorage.removeItem('chaintrace_token');
    }

    // --- Devices ---
    getDevices(): Promise<Device[]> {
        return this.request<Device[]>('/api/devices');
    }
    
    getDeviceWithBlockchain(deviceId: string): Promise<Device & { blocks: Block[] }> {
        return this.request(`/api/devices/${deviceId}`);
    }

    addDevice(deviceData: Omit<Device, 'ip_address'> & { ip_address: string; }): Promise<Device> {
        return this.request<Device>('/api/devices', {
            method: 'POST',
            body: JSON.stringify(deviceData),
        });
    }

    deleteDevice(deviceId: string): Promise<void> {
        return this.request<void>(`/api/devices/${deviceId}`, {
            method: 'DELETE',
        });
    }
    
    // --- Blockchain ---
    addBlock(deviceId: string, blockData: any): Promise<Block> {
        return this.request<Block>(`/api/devices/${deviceId}/blockchain`, {
            method: 'POST',
            body: JSON.stringify(blockData),
        });
    }

    // --- Admin ---
    resetData(): Promise<void> {
        return this.request<void>('/api/reset-data', {
            method: 'POST',
        });
    }
}

// Export a singleton instance
export const apiService = new ApiService();