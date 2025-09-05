import React, { useState, useMemo } from 'react';
import { User, AuditLogEntry, ConfigTemplate } from '../types';
import { createApiUrl } from '../utils/apiUtils';
import { toast } from 'react-hot-toast';
import { PlusIcon, DocumentDuplicateIcon } from './AIIcons';
import UserEditModal from './UserEditModal';
import TemplateEditModal from './TemplateEditModal';

interface AdminPanelProps {
    currentUser: User;
    allUsers: User[];
    auditLog: AuditLogEntry[];
    templates: ConfigTemplate[];
    agentApiUrl?: string;
    onDataUpdate: () => void;
}

const TabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${active ? 'bg-cyan-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}
    >
        {children}
    </button>
);

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, allUsers, auditLog, templates, agentApiUrl, onDataUpdate }) => {
    const [activeTab, setActiveTab] = useState<'audit' | 'users' | 'templates'>('audit');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [templateToEdit, setTemplateToEdit] = useState<ConfigTemplate | null>(null);
    const [logFilter, setLogFilter] = useState('');
    
    const openAddUserModal = () => {
        setUserToEdit(null);
        setIsUserModalOpen(true);
    };

    const openEditUserModal = (user: User) => {
        setUserToEdit(user);
        setIsUserModalOpen(true);
    };

    const openAddTemplateModal = () => {
        setTemplateToEdit(null);
        setIsTemplateModalOpen(true);
    };

    const openEditTemplateModal = (template: ConfigTemplate) => {
        setTemplateToEdit(template);
        setIsTemplateModalOpen(true);
    };

    const handleDeleteUser = async (userToDelete: User) => {
        if (userToDelete.id === currentUser.id) {
            toast.error("不能删除自己的账户。");
            return;
        }
        if (window.confirm(`您确定要删除用户 "${userToDelete.username}" 吗？此操作不可撤销。`)) {
            const toastId = toast.loading(`正在删除用户 ${userToDelete.username}...`);
            try {
                const url = createApiUrl(agentApiUrl!, `/api/users/${userToDelete.id}`);
                const response = await fetch(url, { 
                    method: 'DELETE',
                    headers: { 'X-Actor-Username': currentUser.username }
                });
                if (!response.ok) {
                    throw new Error('删除失败，代理返回错误。');
                }
                toast.success('用户已删除。', { id: toastId });
                onDataUpdate();
            } catch (error) {
                const msg = error instanceof Error ? error.message : '未知错误。';
                toast.error(`删除失败: ${msg}`, { id: toastId });
            }
        }
    };
    
    const handleDeleteTemplate = async (templateToDelete: ConfigTemplate) => {
        if (window.confirm(`您确定要删除模板 "${templateToDelete.name}" 吗？`)) {
            const toastId = toast.loading(`正在删除模板...`);
            try {
                const url = createApiUrl(agentApiUrl!, `/api/templates/${templateToDelete.id}`);
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: { 'X-Actor-Username': currentUser.username }
                });
                if (!response.ok) throw new Error('删除模板失败');
                toast.success('模板已删除', { id: toastId });
                onDataUpdate();
            } catch (error) {
                const msg = error instanceof Error ? error.message : '未知错误';
                toast.error(`删除失败: ${msg}`, { id: toastId });
            }
        }
    };

    const filteredLogs = useMemo(() => {
        if (!logFilter) return auditLog;
        const lowercasedFilter = logFilter.toLowerCase();
        return auditLog.filter(log => 
            log.action.toLowerCase().includes(lowercasedFilter) ||
            log.username.toLowerCase().includes(lowercasedFilter)
        );
    }, [auditLog, logFilter]);
    
    return (
        <div className="mt-12">
            <div className="flex justify-between items-center mb-6 border-b-2 border-zinc-800 pb-2">
                <h2 className="text-3xl font-bold text-white">管理中心</h2>
            </div>
            <div className="bg-zinc-900 p-6 rounded-lg shadow-xl">
                <div className="flex border-b border-zinc-700 mb-4 space-x-2">
                    <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')}>审计日志</TabButton>
                    <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>用户管理</TabButton>
                    <TabButton active={activeTab === 'templates'} onClick={() => setActiveTab('templates')}>配置模板</TabButton>
                </div>

                {activeTab === 'users' && (
                    <div className="bg-zinc-950/50 rounded-md">
                        <div className="p-4 flex justify-end">
                            <button onClick={openAddUserModal} className="flex items-center gap-2 text-sm bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-3 rounded-md transition-colors duration-200">
                                <PlusIcon /> 添加新用户
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-zinc-300">
                                <thead className="text-xs text-zinc-400 uppercase bg-zinc-800/50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">用户名</th>
                                        <th scope="col" className="px-6 py-3">角色</th>
                                        <th scope="col" className="px-6 py-3 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allUsers.map(user => (
                                        <tr key={user.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                                            <td className="px-6 py-4 font-medium text-white">{user.username}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-cyan-900 text-cyan-300' : 'bg-zinc-700 text-zinc-300'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button onClick={() => openEditUserModal(user)} className="font-medium text-cyan-400 hover:underline">编辑</button>
                                                <button onClick={() => handleDeleteUser(user)} className="font-medium text-red-500 hover:underline">删除</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'templates' && (
                    <div className="bg-zinc-950/50 rounded-md">
                         <div className="p-4 flex justify-end">
                            <button onClick={openAddTemplateModal} className="flex items-center gap-2 text-sm bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-3 rounded-md transition-colors duration-200">
                                <PlusIcon /> 添加新模板
                            </button>
                        </div>
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-zinc-300">
                                <thead className="text-xs text-zinc-400 uppercase bg-zinc-800/50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">模板名称</th>
                                        <th scope="col" className="px-6 py-3 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.map(template => (
                                        <tr key={template.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                                            <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                                                <DocumentDuplicateIcon className="h-4 w-4 text-zinc-400" />
                                                {template.name}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button onClick={() => openEditTemplateModal(template)} className="font-medium text-cyan-400 hover:underline">编辑</button>
                                                <button onClick={() => handleDeleteTemplate(template)} className="font-medium text-red-500 hover:underline">删除</button>
                                            </td>
                                        </tr>
                                    ))}
                                     {templates.length === 0 && (
                                        <tr>
                                            <td colSpan={2} className="text-center py-8 text-zinc-500">
                                                未找到任何配置模板。
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                     <div className="bg-zinc-950/50 rounded-md">
                        <div className="p-4">
                             <input 
                                type="text"
                                value={logFilter}
                                onChange={(e) => setLogFilter(e.target.value)}
                                placeholder="筛选日志..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-md p-2 text-zinc-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                             />
                        </div>
                        <div className="overflow-x-auto max-h-[60vh]">
                            <table className="w-full text-sm text-left text-zinc-300">
                                <thead className="text-xs text-zinc-400 uppercase bg-zinc-800/50 sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 w-1/4">时间戳</th>
                                        <th scope="col" className="px-6 py-3 w-1/6">操作者</th>
                                        <th scope="col" className="px-6 py-3 w-auto">行为</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.length > 0 ? filteredLogs.map((log, index) => (
                                        <tr key={index} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                                            <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="px-6 py-4 font-medium text-white">{log.username}</td>
                                            <td className="px-6 py-4">{log.action}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={3} className="text-center py-8 text-zinc-500">
                                                {logFilter ? '未找到匹配的日志条目。' : '没有可用的审计日志。'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {isUserModalOpen && (
                <UserEditModal 
                    userToEdit={userToEdit}
                    allUsers={allUsers}
                    currentUser={currentUser}
                    agentApiUrl={agentApiUrl}
                    onClose={() => setIsUserModalOpen(false)}
                    onSave={() => {
                        setIsUserModalOpen(false);
                        onDataUpdate();
                    }}
                />
            )}
             {isTemplateModalOpen && (
                <TemplateEditModal 
                    templateToEdit={templateToEdit}
                    currentUser={currentUser}
                    agentApiUrl={agentApiUrl}
                    onClose={() => setIsTemplateModalOpen(false)}
                    onSave={() => {
                        setIsTemplateModalOpen(false);
                        onDataUpdate();
                    }}
                />
            )}
        </div>
    );
};

export default AdminPanel;