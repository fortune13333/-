import React, { useState, useEffect } from 'react';
import { Device, Block, AppSettings, User, SessionUser } from '../types';
import HistoryItem from './HistoryItem';
import BlockDetailsModal from './BlockDetailsModal';
import VerificationModal, { VerificationResult } from './VerificationModal';
import Loader from './Loader';
import { verifyChain } from '../utils/crypto';
import { toast } from 'react-hot-toast';
import { DownloadIcon, PlusIcon, SparklesIcon, BrainIcon } from './AIIcons';
import { geminiService } from '../services/geminiService';
import { joinDeviceSessionAPI, leaveDeviceSessionAPI, getActiveSessionsAPI } from '../utils/session';
import { createApiUrl } from '../utils/apiUtils';
import { getAIFailureMessage } from '../utils/errorUtils';

interface DeviceDetailsProps {
  device: Device;
  allDevices: Device[];
  chain: Block[];
  settings: AppSettings;
  agentMode: 'live' | 'simulation';
  currentUser: User;
  sessionId: string;
  onBack: () => void;
  onAddConfiguration: (deviceId: string, newConfig: string) => void;
  onPromptRollback: (targetBlock: Block) => void;
  onSelectDevice: (device: Device) => void;
  onOpenAddDeviceModal: () => void;
  isLoading: boolean;
}

const ShieldCheckIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const CollaborationWarning: React.FC<{ users: SessionUser[] }> = ({ users }) => {
    if (users.length === 0) return null;

    const userNames = users.map(u => u.username).join(', ');

    return (
        <div className="bg-yellow-900/50 border border-yellow-700/50 text-yellow-300 p-3 rounded-md mb-4 text-sm flex items-center gap-3">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>
                注意: 用户 <strong className="font-bold text-yellow-200">{userNames}</strong> 也正在查看此设备。
            </span>
        </div>
    );
};

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ 
    device, allDevices, chain, settings, agentMode, currentUser, sessionId,
    onBack, onAddConfiguration, onPromptRollback, onSelectDevice, onOpenAddDeviceModal, isLoading 
}) => {
  const lastBlock = chain[chain.length - 1];
  const [newConfig, setNewConfig] = useState(lastBlock?.data?.config || '');
  const [selectedBlockInfo, setSelectedBlockInfo] = useState<{ block: Block; prevConfig: string } | null>(null);
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [isCheckingConfig, setIsCheckingConfig] = useState(false);
  const [configCheckResult, setConfigCheckResult] = useState<string | null>(null);

  const [otherViewingUsers, setOtherViewingUsers] = useState<SessionUser[]>([]);

  // Effect for Centralized, API-based session management
  useEffect(() => {
    if (!settings.agentApiUrl) {
        setOtherViewingUsers([]);
        return;
    }

    // 1. Initial join: Register presence immediately on component mount.
    joinDeviceSessionAPI(device.id, currentUser.username, sessionId, settings.agentApiUrl);

    // 2. Set up polling to get other viewers AND send a heartbeat.
    const intervalId = setInterval(async () => {
        // Heartbeat: Re-join the session periodically to handle server restarts.
        joinDeviceSessionAPI(device.id, currentUser.username, sessionId, settings.agentApiUrl);
        
        // Fetch other viewers
        const viewers = await getActiveSessionsAPI(device.id, settings.agentApiUrl!);
        setOtherViewingUsers(viewers.filter(u => u.sessionId !== sessionId));
    }, 3000); // Poll every 3 seconds

    // 3. Cleanup function: leave the session and clear the interval.
    return () => {
      clearInterval(intervalId);
      leaveDeviceSessionAPI(device.id, sessionId, settings.agentApiUrl!);
    };
  }, [device.id, currentUser.username, sessionId, settings.agentApiUrl]);
  

  useEffect(() => {
    // When the device changes, update the config textarea with the latest config of the new device
    const newLastBlock = chain[chain.length - 1];
    setNewConfig(newLastBlock?.data?.config || '');
    setConfigCheckResult(null); // Reset check result on device change
  }, [device, chain]);
  
  useEffect(() => {
    // Reset check result if config text is manually changed
    setConfigCheckResult(null);
  }, [newConfig]);

  const handleSelectBlock = (block: Block) => {
    const prevBlock = chain.find(b => b.index === block.index - 1);
    const prevConfig = prevBlock ? prevBlock.data.config : '';
    setSelectedBlockInfo({ block, prevConfig });
  };

  const handleFetchFromDevice = async () => {
    if (!settings.agentApiUrl) {
      toast.error('请先在设置中配置本地代理API地址。');
      return;
    }
    setIsFetchingConfig(true);
    const toastId = toast.loading(`正在从 ${device.name} 获取配置...`);
    try {
      const url = createApiUrl(settings.agentApiUrl, `/api/device/${device.id}/config`);
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
    const isSimulation = agentMode === 'simulation';

    // If agent is configured and we are in 'live' mode, push to the real device first.
    if (settings.agentApiUrl && !isSimulation) {
        const isConfirmed = window.confirm(`您确定要将此配置推送到真实设备 ${device.name} 吗？`);
        if (!isConfirmed) {
            return;
        }
        
        const toastId = toast.loading(`正在将配置推送到 ${device.name}...`);
        try {
            const url = createApiUrl(settings.agentApiUrl, `/api/device/${device.id}/config`);
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

    // This part is executed for:
    // 1. Simulation mode (the 'if' block above is skipped).
    // 2. No agent configured (settings.agentApiUrl is falsy).
    // 3. Live mode after a successful push to the device.
    onAddConfiguration(device.id, newConfig);
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
  
  const handleGenerateConfig = async () => {
      if (!aiPrompt.trim()) {
          toast.error('请输入您的配置意图。');
          return;
      }
      setIsGenerating(true);
      const toastId = toast.loading('AI 助手正在生成命令...');
      try {
          const generatedCommands = await geminiService.generateConfigFromPrompt(aiPrompt, device.type, newConfig, settings);
          if (generatedCommands) {
              // Append the new commands to the existing config
              setNewConfig(prev => `${prev.trim()}\n${generatedCommands}`.trim());
              setAiPrompt(''); // Clear the input field
              toast.success('AI 命令已生成并追加！', { id: toastId });
          } else {
              toast.error('AI 未能生成命令，请检查您的输入或稍后再试。', { id: toastId });
          }
      } catch (error) {
          const errorMessage = getAIFailureMessage(error);
          toast.error(`生成失败: ${errorMessage}`, { id: toastId });
      } finally {
          setIsGenerating(false);
      }
  };

  const handleConfigCheck = async () => {
    if (!newConfig.trim()) {
      toast.error('配置文本不能为空。');
      return;
    }
    setIsCheckingConfig(true);
    setConfigCheckResult(null);
    const toastId = toast.loading('AI 正在进行配置体检...');
    try {
      const report = await geminiService.checkConfiguration(newConfig, device.type, settings);
      setConfigCheckResult(report);
      toast.success('配置体检完成！', { id: toastId });
    } catch (error) {
      const errorMessage = getAIFailureMessage(error);
      toast.error(`体检失败: ${errorMessage}`, { id: toastId });
    } finally {
      setIsCheckingConfig(false);
    }
  };


  const sortedChain = [...chain].sort((a, b) => b.index - a.index);
  const isSimulation = agentMode === 'simulation';
  const submitButtonText = settings.agentApiUrl
    ? (isSimulation ? '提交到模拟区块链' : '推送到设备并记录')
    : '提交到区块链';


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
        <div className="bg-zinc-900 p-6 rounded-lg shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-white">配置历史</h3>
            <button 
              onClick={handleVerifyChain}
              disabled={isVerifying || isLoading}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-950 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded-md transition-colors text-sm"
            >
              {isVerifying ? <Loader/> : <ShieldCheckIcon/>}
              <span>验证完整性</span>
            </button>
          </div>
          <div className="mb-6">
            <label htmlFor="device-switcher" className="block text-sm font-medium text-zinc-400 mb-1">
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
                    className="flex-grow bg-zinc-800 border border-zinc-700 rounded-md p-2 text-white font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                    {allDevices.map(d => (
                        <option key={d.id} value={d.id}>
                            {d.name} ({d.id})
                        </option>
                    ))}
                </select>
                {currentUser.role === 'admin' && (
                  <button
                      onClick={onOpenAddDeviceModal}
                      className="flex-shrink-0 bg-zinc-800 hover:bg-cyan-600/50 text-zinc-300 hover:text-cyan-300 font-medium p-2 rounded-md transition-colors duration-200"
                      aria-label="添加新设备"
                      title="添加新设备"
                  >
                      <PlusIcon />
                  </button>
                )}
            </div>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {sortedChain.map((block, index) => (
              <HistoryItem 
                key={block.hash} 
                block={block} 
                isLatest={index === 0}
                currentUser={currentUser}
                onSelectBlock={() => handleSelectBlock(block)} 
                onRollback={() => onPromptRollback(block)}
              />
            ))}
            {sortedChain.length === 0 && (
                <div className="text-center py-8 text-zinc-500">
                    <p>未找到该设备的历史配置。</p>
                    <p>请在右侧提交第一个配置。</p>
                </div>
            )}
          </div>
        </div>

        {/* Right Side: Add New Config */}
        <div className="bg-zinc-900 p-6 rounded-lg shadow-xl flex flex-col">
          <CollaborationWarning users={otherViewingUsers} />
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">提交新配置</h3>
            <p className="text-zinc-400 mb-6">应用新配置将在链上创建一个新的、不可变的区块，操作员为 <span className="font-mono text-cyan-400">{currentUser.username}</span>。</p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
            <div className="mb-4 flex-grow flex flex-col">
               <div className="flex justify-between items-center mb-2">
                 <label htmlFor="config" className="block text-sm font-medium text-zinc-300">配置文本</label>
                 <div className="flex items-center gap-2">
                    {settings.ai.configCheck.enabled && (
                        <button
                            type="button"
                            onClick={handleConfigCheck}
                            disabled={isCheckingConfig || isLoading}
                            className="flex items-center gap-2 text-xs bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-950 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-bold py-1 px-3 rounded-md transition-colors"
                        >
                            {isCheckingConfig ? <Loader /> : <BrainIcon />}
                            <span>AI 配置体检</span>
                        </button>
                    )}
                    {settings.agentApiUrl && (
                        <button
                            type="button"
                            onClick={handleFetchFromDevice}
                            disabled={isFetchingConfig || isLoading}
                            className="flex items-center gap-2 text-xs bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-950 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-bold py-1 px-3 rounded-md transition-colors"
                        >
                            {isFetchingConfig ? <Loader /> : <DownloadIcon />}
                            <span>从设备获取</span>
                        </button>
                    )}
                 </div>
               </div>
              <textarea
                id="config"
                value={newConfig}
                onChange={(e) => setNewConfig(e.target.value)}
                className="w-full flex-grow bg-zinc-950 border border-zinc-700 rounded-md p-2 font-mono text-sm text-zinc-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="在此处输入完整的设备配置..."
              />
            </div>

            {isCheckingConfig && (
                <div className="mb-4 text-center"><Loader /></div>
            )}

            {configCheckResult && (
                <div className="mb-4 p-3 rounded-md bg-zinc-950 border border-zinc-700 max-h-40 overflow-y-auto">
                    <h4 className="flex items-center gap-2 font-semibold text-zinc-300 mb-2 text-sm">
                        <BrainIcon /> AI 配置体检报告
                    </h4>
                    <p className="text-xs text-zinc-300 whitespace-pre-wrap">{configCheckResult}</p>
                </div>
            )}
            
            {settings.ai.commandGeneration.enabled && (
                <div className="mb-6 bg-zinc-950/50 p-3 rounded-md">
                    <label htmlFor="ai-prompt" className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                        <SparklesIcon className="h-5 w-5 text-cyan-400" />
                        <span>AI 助手</span>
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            id="ai-prompt"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGenerateConfig(); }}}
                            className="flex-grow bg-zinc-800 border border-zinc-700 rounded-md p-2 text-zinc-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                            placeholder="例如：为 VLAN 10 添加端口 G0/1"
                            disabled={isGenerating}
                        />
                        <button
                            type="button"
                            onClick={handleGenerateConfig}
                            disabled={isGenerating || isLoading}
                            className="flex-shrink-0 flex items-center justify-center gap-2 w-32 bg-zinc-800 hover:bg-cyan-600/50 text-white font-bold py-2 px-3 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-wait"
                        >
                           {isGenerating ? <Loader/> : '生成命令'}
                        </button>
                    </div>
                </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isVerifying || isFetchingConfig || isGenerating || isCheckingConfig}
              className="w-full flex justify-center items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-600 text-white font-bold py-2 px-4 rounded-md transition-colors mt-auto"
            >
              {isLoading ? <Loader /> : submitButtonText}
            </button>
          </form>
        </div>
      </div>

      {selectedBlockInfo && (
        <BlockDetailsModal 
            block={selectedBlockInfo.block} 
            prevConfig={selectedBlockInfo.prevConfig}
            onClose={() => setSelectedBlockInfo(null)} 
        />
      )}
      
      {isVerificationModalOpen && (
        <VerificationModal 
            results={verificationResults}
            chain={chain}
            onClose={() => setIsVerificationModalOpen(false)}
            isVerifying={isVerifying}
        />
      )}
    </div>
  );
};
export default DeviceDetails;