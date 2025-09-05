import React, { useState, useMemo } from 'react';
import { User, ConfigTemplate, Device } from '../types';
import { toast } from 'react-hot-toast';
import { createApiUrl } from '../utils/apiUtils';
import Loader from './Loader';

interface BulkDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  selectedDeviceIds: string[];
  templates: ConfigTemplate[];
  currentUser: User;
  agentApiUrl?: string;
  onDeploymentComplete: () => void;
}

const BulkDeployModal: React.FC<BulkDeployModalProps> = ({ isOpen, onClose, devices, selectedDeviceIds, templates, currentUser, agentApiUrl, onDeploymentComplete }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const selectedDevices = useMemo(() => {
    return devices.filter(d => selectedDeviceIds.includes(d.id));
  }, [devices, selectedDeviceIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) {
        toast.error('请选择一个要部署的模板。');
        return;
    }
    
    setIsLoading(true);
    const toastId = toast.loading(`正在向 ${selectedDeviceIds.length} 台设备部署模板...`);
    
    try {
        const url = createApiUrl(agentApiUrl!, '/api/bulk-deploy');
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Actor-Username': currentUser.username
            },
            body: JSON.stringify({
                template_id: selectedTemplateId,
                device_ids: selectedDeviceIds,
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.detail || '部署失败，代理返回错误。');
        }

        if (result.failures && result.failures.length > 0) {
            toast.error(
                (t) => (
                    <div className="text-sm">
                        <p className="font-bold mb-2">{result.message}</p>
                        <ul className="list-disc list-inside">
                            {result.failures.map((f: string, i: number) => <li key={i}>{f}</li>)}
                        </ul>
                    </div>
                ),
                { id: toastId, duration: 10000 }
            );
        } else {
            toast.success(result.message, { id: toastId });
        }
        onDeploymentComplete();

    } catch (error) {
        const msg = error instanceof Error ? error.message : '未知错误';
        toast.error(`部署失败: ${msg}`, { id: toastId });
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-900 rounded-lg shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">批量部署配置模板</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-3xl leading-none" disabled={isLoading}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
                <label htmlFor="template-select" className="block text-sm font-medium text-zinc-300 mb-2">选择一个模板</label>
                <select
                    id="template-select"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-2 text-zinc-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                    <option value="" disabled>-- 请选择 --</option>
                    {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>
            <div>
                 <p className="text-sm font-medium text-zinc-300 mb-2">目标设备 ({selectedDevices.length})</p>
                 <div className="max-h-32 overflow-y-auto bg-zinc-950 rounded-md border border-zinc-700 p-2 space-y-1">
                    {selectedDevices.map(d => (
                        <p key={d.id} className="text-xs text-zinc-400 font-mono">{d.name} ({d.ipAddress})</p>
                    ))}
                 </div>
            </div>
            <div className="text-xs text-yellow-400 bg-yellow-900/50 p-2 rounded-md">
                <strong>注意:</strong> 此操作将在每台选定设备的链上创建一个新的配置区块。这是一个不可逆的操作。
            </div>
          </div>

          <div className="p-4 border-t border-zinc-700 flex justify-end items-center gap-4">
              <button 
                  type="button"
                  onClick={onClose} 
                  className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                  disabled={isLoading}
              >
                  取消
              </button>
              <button 
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-zinc-600 w-28 flex justify-center"
                  disabled={!selectedTemplateId || isLoading}
              >
                  {isLoading ? <Loader /> : '确认部署'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkDeployModal;