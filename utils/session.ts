
import { User, SessionUser } from '../types';

const SESSION_STORAGE_KEY = 'chaintrace_active_sessions';

/**
 * Retrieves and safely parses the active session data from localStorage.
 * @returns A record mapping device IDs to an array of SessionUsers.
 */
export const getActiveSessions = (): Record<string, SessionUser[]> => {
    try {
        const storedSessions = localStorage.getItem(SESSION_STORAGE_KEY);
        return storedSessions ? JSON.parse(storedSessions) : {};
    } catch (error) {
        console.error("Failed to parse active sessions from localStorage", error);
        return {};
    }
};

/**
 * Writes the active session data to localStorage.
 * @param sessions The session data object to store.
 */
const setActiveSessions = (sessions: Record<string, SessionUser[]>) => {
    try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
        console.error("Failed to save active sessions to localStorage", error);
    }
};

/**
 * Adds the current user's session to a specific device's viewing list.
 * @param deviceId The ID of the device being viewed.
 * @param user The current User object.
 * @param sessionId The unique ID for the current browser tab session.
 */
export const joinDeviceSession = (deviceId: string, user: User, sessionId: string) => {
    if (!user) return;
    
    const sessions = getActiveSessions();
    if (!sessions[deviceId]) {
        sessions[deviceId] = [];
    }

    // Remove any previous session from this user/tab combo before adding the new one
    sessions[deviceId] = sessions[deviceId].filter(u => u.sessionId !== sessionId);
    sessions[deviceId].push({ username: user.username, sessionId });

    setActiveSessions(sessions);
};

/**
 * Removes the current user's session from a specific device's viewing list.
 * @param deviceId The ID of the device being left.
 * @param sessionId The unique ID for the current browser tab session.
 */
export const leaveDeviceSession = (deviceId: string, sessionId: string) => {
    const sessions = getActiveSessions();
    if (sessions[deviceId]) {
        sessions[deviceId] = sessions[deviceId].filter(u => u.sessionId !== sessionId);
        if (sessions[deviceId].length === 0) {
            delete sessions[deviceId];
        }
    }
    setActiveSessions(sessions);
};

/**
 * Clears all sessions associated with the current session ID, regardless of device.
 * Used for logout or closing the tab.
 * @param sessionId The unique ID for the current browser tab session.
 */
export const clearAllMySessions = (sessionId: string) => {
    const sessions = getActiveSessions();
    let sessionsModified = false;

    for (const deviceId in sessions) {
        const originalLength = sessions[deviceId].length;
        sessions[deviceId] = sessions[deviceId].filter(u => u.sessionId !== sessionId);
        
        if(sessions[deviceId].length < originalLength) {
            sessionsModified = true;
        }

        if (sessions[deviceId].length === 0) {
            delete sessions[deviceId];
        }
    }
    
    if (sessionsModified) {
       setActiveSessions(sessions);
    }
};
