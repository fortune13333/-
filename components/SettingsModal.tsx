import React, { useState } from 'react';
import { AppSettings, AIServiceSettings } from '../types';
import Loader from './Loader';
import { CheckCircleSolid, XCircleSolid, BrainIcon } from './AIIcons';
import { toast } from 'react-hot-toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

type ActiveTab = 'analysis' | 'command' | 'check' | 'agent';

const AISettingSection: React.FC<{
  title: string;
  description: string;
  settings: AIServiceSettings;
  onUpdate: (newAISettings: AIServiceSettings) => void;
}> = ({ title, description, settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="bg-slate-900/50 p-4 rounded-md">
        <div className="flex items-center justify-between">
          <label htmlFor={`${title}-toggle`} className="flex flex-col cursor-pointer pr-4">
            <span className="font-semibold text-slate-200">{title}</span>
            <span className="text-sm text-slate-400">{description}</span>
          </label>
          <div className="relative inline-flex items-center flex-shrink-0">
            <input
              type="checkbox"
              id={`${title}-toggle`}
              className="sr-only peer"
              checked={settings.enabled}
              onChange={(e) => onUpdate({ ...settings, enabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-4 peer-focus:ring-cyan-500/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
          </div>
        </div>
      </div>
      {settings.enabled && (
        <div className="bg-slate-900/50 p-4 rounded-md">
          <h4 className="font-semibold text-slate-200 mb-2">自定义服务接口</h4>
          <p className="text-sm text-slate-400 mb-3">
            （可选）输入一个自定义的API端点。如果留空，将默认使用 Google Gemini。
          </p>
          <input
            type="text"
            placeholder="https://your-api.com/endpoint"
            value={settings.apiUrl || ''}
            onChange={(e) => onUpdate({ ...settings, apiUrl: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
          />
        </div>
      )}
    </div>
  );
};


const AgentSettingsSection: React.FC<{
    settings: AppSettings;
    onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}> = ({ settings, onUpdateSettings }) => {
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failure'>('idle');

    const handleTestConnection = async () => {
        if (!settings.agentApiUrl) {
            toast.error('代理API地址不能为空。');
            setTestStatus('failure');
            return;
        }
        setTestStatus('testing');
        await new Promise(resolve => setTimeout(resolve, 500)); // For UX
        try {
            const url = new URL('/api/health', settings.agentApiUrl).toString();
            const response = await fetch(url, { method: 'GET' });
            if (!response.ok) {
                throw new Error(`网络响应错误: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            if (data && data.status === 'ok') {
                setTestStatus('success');
                toast.success('代理连接成功！');
            } else {
                throw new Error('来自代理的响应无效');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知网络错误';
            toast.error(`代理连接测试失败: ${errorMessage}。请检查代理程序是否正在运行且地址正确。`);
            setTestStatus('failure');
        }
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-md">
            <h4 className="font-semibold text-slate-200 mb-2">本地代理接口</h4>
            <p className="text-sm text-slate-400 mb-3">
                输入本地代理的API地址以连接真实设备，实现配置的获取与推送。
            </p>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="http://localhost:8000"
                    value={settings.agentApiUrl || ''}
                    onChange={(e) => {
                        onUpdateSettings({ agentApiUrl: e.target.value });
                        setTestStatus('idle');
                    }}
                    className="flex-grow bg-slate-900 border border-slate-700 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                />
                <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing'}
                    className="flex-shrink-0 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-3 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-wait"
                >
                    测试连接
                </button>
            </div>
            <div className="mt-2 h-5 flex items-center gap-2 text-xs">
                {testStatus === 'testing' && <><Loader /> <span className="text-slate-400">正在测试...</span></>}
                {testStatus === 'success' && <><CheckCircleSolid className="h-4 w-4 text-green-500" /> <span className="text-green-400">连接成功！</span></>}
                {testStatus === 'failure' && <><XCircleSolid className="h-4 w-4 text-red-500" /> <span className="text-red-400">连接失败。</span></>}
            </div>
            <p className="text-xs text-slate-500 mt-2">
                代理需提供 `GET /api/health`, `GET /api/device/:id/config` 和 `POST /api/device/:id/config` 接口。
            </p>
        </div>
    );
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('analysis');

  if (!isOpen) return null;

  const handleAIUpdate = (key: keyof AppSettings['ai'], newAISettings: AIServiceSettings) => {
    onUpdateSettings({
        ai: {
            ...settings.ai,
            [key]: newAISettings,
        }
    })
  };

  const TabButton: React.FC<{ tabId: ActiveTab; children: React.ReactNode }> = ({ tabId, children }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tabId ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
    >
      {children}
    </button>
  );

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">应用设置</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>
        
        <div className="flex border-b border-slate-700 bg-slate-900/30 p-2">
            <div className="flex items-center gap-2 border-r border-slate-700 pr-2 mr-2">
                <BrainIcon />
                <span className="font-semibold text-slate-300">AI 模块</span>
            </div>
            <div className="flex items-center gap-2">
                <TabButton tabId="analysis">智能分析</TabButton>
                <TabButton tabId="command">命令生成</TabButton>
                <TabButton tabId="check">配置体检</TabButton>
            </div>
        </div>
         <div className="flex border-b border-slate-700 bg-slate-900/30 p-2">
             <TabButton tabId="agent">本地代理</TabButton>
         </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
            {activeTab === 'analysis' && (
                <AISettingSection 
                    title="AI 智能分析"
                    description="提交新配置时，由 AI 分析变更内容、影响和安全风险。"
                    settings={settings.ai.analysis}
                    onUpdate={(newAISettings) => handleAIUpdate('analysis', newAISettings)}
                />
            )}
             {activeTab === 'command' && (
                <AISettingSection 
                    title="AI 命令生成"
                    description="在配置编辑区启用 AI 助手，通过自然语言生成配置命令。"
                    settings={settings.ai.commandGeneration}
                    onUpdate={(newAISettings) => handleAIUpdate('commandGeneration', newAISettings)}
                />
            )}
             {activeTab === 'check' && (
                <AISettingSection 
                    title="AI 配置体检"
                    description="启用 AI 对当前配置进行全面的健康和安全审计。"
                    settings={settings.ai.configCheck}
                    onUpdate={(newAISettings) => handleAIUpdate('configCheck', newAISettings)}
                />
            )}
            {activeTab === 'agent' && (
                <AgentSettingsSection settings={settings} onUpdateSettings={onUpdateSettings}/>
            )}
        </div>

        <div className="p-4 border-t border-slate-700 text-right bg-slate-800/80 backdrop-blur-sm">
            <button 
                onClick={onClose} 
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
                完成
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
