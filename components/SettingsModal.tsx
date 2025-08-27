
import React from 'react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  const handleToggleAI = () => {
    onUpdateSettings({ aiEnabled: !settings.aiEnabled });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">应用设置</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-300 mb-3">AI 模块</h3>
            <div className="bg-slate-900/50 p-4 rounded-md">
              <div className="flex items-center justify-between">
                <label htmlFor="ai-toggle" className="flex flex-col cursor-pointer">
                  <span className="font-semibold text-slate-200">启用 AI 智能分析</span>
                  <span className="text-sm text-slate-400">提交配置时由 AI 分析变更。</span>
                </label>
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    id="ai-toggle"
                    className="sr-only peer"
                    checked={settings.aiEnabled}
                    onChange={handleToggleAI}
                  />
                  <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-4 peer-focus:ring-cyan-500/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-md">
              <h4 className="font-semibold text-slate-200 mb-2">自定义分析服务接口</h4>
               <p className="text-sm text-slate-400 mb-3">
                （可选）输入一个自定义的分析 API 端点。如果留空，将默认使用 Google Gemini。
              </p>
              <input
                type="text"
                placeholder="https://your-api.com/analyze"
                value={settings.analysisApiUrl || ''}
                onChange={(e) => onUpdateSettings({ analysisApiUrl: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">
                自定义接口需接受含 `previousConfig` 和 `newConfig` 的POST请求，并返回兼容的JSON。
              </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 text-right">
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
