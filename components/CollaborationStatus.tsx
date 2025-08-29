import React from 'react';
import { User } from '../types';

interface CollaborationStatusProps {
    currentUser: User;
    concurrentUsers: string[];
}

const UsersIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);


const CollaborationStatus: React.FC<CollaborationStatusProps> = ({ currentUser, concurrentUsers }) => {
    const otherUsers = concurrentUsers.filter(username => username !== currentUser.username);

    if (otherUsers.length === 0) {
        return null;
    }

    return (
        <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-700/50 rounded-lg flex items-center gap-3">
            <UsersIcon />
            <p className="text-sm text-yellow-200">
                <span className="font-semibold">注意:</span> 其他用户也正在查看此设备:
                <span className="font-mono font-bold text-white ml-2">
                    {otherUsers.join(', ')}
                </span>
            </p>
        </div>
    );
};

export default CollaborationStatus;
