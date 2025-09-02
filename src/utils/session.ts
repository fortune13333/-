import { User, SessionUser } from '../types';
import { createApiUrl } from './apiUtils';

/**
 * Registers the current user's session with the agent for a specific device.
 * @param deviceId The ID of the device being viewed.
 * @param user The current User object.
 * @param sessionId The unique ID for the current browser tab session.
 * @param agentApiUrl The base URL of the agent API.
 */
export const joinDeviceSessionAPI = async (deviceId: string, user: User, sessionId: string, agentApiUrl: string | undefined) => {
    if (!agentApiUrl || !user) return;
    try {
        const url = createApiUrl(agentApiUrl, `/api/sessions/${deviceId}`);
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username, sessionId }),
        });
    } catch (e) { 
        console.error('Failed to join session via API', e); 
    }
};

/**
 * Unregisters the current user's session from a specific device via the agent.
 * @param deviceId The ID of the device being left.
 * @param sessionId The unique ID for the current browser tab session.
 * @param agentApiUrl The base URL of the agent API.
 */
export const leaveDeviceSessionAPI = async (deviceId: string, sessionId: string, agentApiUrl: string | undefined) => {
    if (!agentApiUrl) return;
    try {
        const url = createApiUrl(agentApiUrl, `/api/sessions/${deviceId}/${sessionId}`);
        // Use keepalive for requests that might be sent during page unload
        await fetch(url, {
            method: 'DELETE',
            keepalive: true,
        });
    } catch (e) { 
        console.error('Failed to leave session via API', e); 
    }
};

/**
 * Fetches the list of active sessions for a specific device from the agent.
 * @param deviceId The ID of the device to check.
 * @param agentApiUrl The base URL of the agent API.
 * @returns A promise that resolves to an array of SessionUsers.
 */
export const getActiveSessionsAPI = async (deviceId: string, agentApiUrl: string): Promise<SessionUser[]> => {
    if (!agentApiUrl) return [];
    try {
        const url = createApiUrl(agentApiUrl, `/api/sessions/${deviceId}`);
        const response = await fetch(url);
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        // This can happen if the agent is down, it's a normal state.
        // console.error('Failed to get sessions via API', e);
        return [];
    }
};