
import React, { useState, useEffect } from 'react';
import { Device, Block, AppSettings } from '../types';
import HistoryItem from './HistoryItem';
import BlockDetailsModal from './BlockDetailsModal';
import VerificationModal, { VerificationResult } from './VerificationModal';
import AddDeviceModal from './AddDeviceModal';
import Loader from './Loader';
import { verifyChain } from '../utils/crypto';
import { toast } from 'react-hot-toast';
import { DownloadIcon } from './AIIcons';

interface DeviceDetailsProps {
  device: Device;
  allDevices: Device[];
  chain: Block[];
  settings: AppSettings;
  onBack: () => void;
  onAddConfiguration: (deviceId: string, newConfig: string, operator: string) => void;
  onSelectDevice: (device: Device) => void;
  onAddNewDevice: (deviceData: Omit<Device, 'ipAddress'> & { ipAddress: string }) => void;
  isLoading: boolean;
}

const ShieldCheckIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const PlusIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
);


const DeviceDetails: React.FC<DeviceDetailsProps> = ({ device, allDevices, chain, settings, onBack, onAddConfiguration, onSelectDevice, onAddNewDevice, isLoading }) => {
  const lastBlock = chain[chain.length - 1];
  const [newConfig, setNewConfig] = useState(lastBlock?.data?.config || '');
  const [operator, setOperator] = useState('net_admin');
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);


  useEffect(() => {
    // When the device changes, update the config textarea with the latest config of the new device
    const newLastBlock = chain[chain.length - 1];
    setNewConfig(newLastBlock?.data?.config || '');
  }, [device, chain]);

  const handleFetchFromDevice = async () => {
    if (!settings.agentApiUrl) {
      toast.error('请先在设置中配置本地代理API地址。');
      return;
    }
    setIsFetchingConfig(true);
    const toastId = toast.loading(`正在从 ${device.name} 获取配置...`);
    try {
      const url = `${settings.agentApiUrl}/api/device/${device.id}/config`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({'error': '无法解析错误响应'}));
        throw new Error(errorData.error || `网络响应错误: ${response.statusText}`);
      }
      const data = await response.json();
      setNewConfig(data.config);
      toast.success('配置已成功获取！', { id: toastId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发生未知错误';
      toast.error(`获取配置失败: ${errorMessage}`, { id: toastId });
    } finally {
      setIsFetchingConfig(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // If agent is configured, push to device first
    if (settings.agentApiUrl) {
        const isConfirmed = window.confirm(`您确定要将此配置推送到真实设备 ${device.name} 吗？`);
        if (!isConfirmed) {
            return;
        }
        
        const toastId = toast.loading(`正在将配置推送到 ${device.name}...`);
        try {
            const url = `${settings.agentApiUrl}/api/device/${device.id}/config`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: newConfig }),
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({'error': '无法解析错误响应'}));
                throw new Error(errorData.error || `网络响应错误: ${response.statusText}`);
            }
            toast.success('配置已成功推送到设备！正在记录到区块链...', { id: toastId });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '发生未知错误';
            toast.error(`推送到设备失败: ${errorMessage}。变更未记录到区块链。`, { id: toastId, duration: 6000 });
            return; // Stop execution if push fails
        }
    }

    onAddConfiguration(device.id, newConfig, operator);
  };
  
  const handleVerifyChain = async () => {
    setIsVerifying(true);
    setIsVerificationModalOpen(true);
    setVerificationResults(
      chain.map(block => ({ index: block.index, status: 'pending' }))
    );

    // Give the modal a moment to render before starting the intensive verification task
    await new Promise(resolve => setTimeout(resolve, 100));

    await verifyChain(chain, (index, status, details) => {
      setVerificationResults(prev => {
        const newResults = [...prev];
        const resultIndex = newResults.findIndex(r => r.index === index);
        if (resultIndex > -1) {
            newResults[resultIndex] = { ...newResults[resultIndex], status, details };
        }
        return newResults;
      });
    });

    setIsVerifying(false);
  };

  const sortedChain = [...chain].sort((a, b) => b.index - a.index);

  return (
    <div>
       <button onClick={onBack} className="flex items-center gap-2 mb-6 text-cyan-400 hover:text-cyan-300 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        返回仪表盘
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: History */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-white">配置历史</h3>
            <button 
              onClick={handleVerifyChain}
              disabled={isVerifying || isLoading}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-900 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded-md transition-colors text-sm"
            >
              {isVerifying ? <Loader/> : <ShieldCheckIcon/>}
              <span>验证完整性</span>
            </button>
          </div>
          <div className="mb-6">
            <label htmlFor="device-switcher" className="block text-sm font-medium text-slate-400 mb-1">
                当前设备
            </label>
             <div className="flex items-center gap-2">
                <select
                    id="device-switcher"
                    value={device.id}
                    onChange={(e) => {
                        const selectedId = e.target.value;
                        const newDevice = allDevices.find(d => d.id === selectedId);
                        if (newDevice) {
                            onSelectDevice(newDevice);
                        }
                    }}
                    className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-white font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                    {allDevices.map(d => (
                        <option key={d.id} value={d.id}>
                            {d.name} ({d.id})
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => setIsAddDeviceModalOpen(true)}
                    className="flex-shrink-0 bg-slate-700 hover:bg-cyan-600/50 text-slate-300 hover:text-cyan-300 font-medium p-2 rounded-md transition-colors duration-200"
                    aria-label="添加新设备"
                    title="添加新设备"
                >
                    <PlusIcon />
                </button>
            </div>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {sortedChain.map(block => (
              <HistoryItem key={block.hash} block={block} onSelectBlock={() => setSelectedBlock(block)} />
            ))}
            {sortedChain.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                    <p>未找到该设备的历史配置。</p>
                    <p>请在右侧提交第一个配置。</p>
                </div>
            )}
          </div>
        </div>

        {/* Right Side: Add New Config */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-4">提交新配置</h3>
          <p className="text-slate-400 mb-6">应用新配置将在链上创建一个新的、不可变的区块。</p>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="operator" className="block text-sm font-medium text-slate-300 mb-2">操作员</label>
              <input 
                type="text" 
                id="operator"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                required
              />
            </div>
            <div className="mb-4">
               <div className="flex justify-between items-center mb-2">
                 <label htmlFor="config" className="block text-sm font-medium text-slate-300">配置文本</label>
                 {settings.agentApiUrl && (
                     <button
                        type="button"
                        onClick={handleFetchFromDevice}
                        disabled={isFetchingConfig || isLoading}
                        className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-900 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-1 px-3 rounded-md transition-colors"
                     >
                        {isFetchingConfig ? <Loader /> : <DownloadIcon />}
                        <span>从设备获取</span>
                     </button>
                 )}
               </div>
              <textarea
                id="config"
                rows={15}
                value={newConfig}
                onChange={(e) => setNewConfig(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 font-mono text-sm text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="在此处输入完整的设备配置..."
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || isVerifying || isFetchingConfig}
              className="w-full flex justify-center items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
              {isLoading ? <Loader /> : (settings.agentApiUrl ? '推送到设备并记录' : '提交到区块链')}
            </button>
          </form>
        </div>
      </div>

      {selectedBlock && (
        <BlockDetailsModal block={selectedBlock} onClose={() => setSelectedBlock(null)} />
      )}
      
      {isVerificationModalOpen && (
        <VerificationModal 
            results={verificationResults}
            chain={chain}
            onClose={() => setIsVerificationModalOpen(false)}
            isVerifying={isVerifying}
        />
      )}
        
      {isAddDeviceModalOpen && (
        <AddDeviceModal
            isOpen={isAddDeviceModalOpen}
            onClose={() => setIsAddDeviceModalOpen(false)}
            onAddDevice={onAddNewDevice}
        />
      )}
    </div>
  );
};

export default DeviceDetails;