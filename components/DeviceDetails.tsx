import React, { useState, useEffect, useRef } from 'react';
import { Device, Block, AppSettings, User } from '../types';
import HistoryItem from './HistoryItem';
import BlockDetailsModal from './BlockDetailsModal';
import Loader from './Loader';
import { toast } from 'react-hot-toast';
import { DownloadIcon, PlusIcon, SparklesIcon, BrainIcon } from './AIIcons';
import { geminiService } from '../services/geminiService';
import CollaborationStatus from './CollaborationStatus';
import { WS_BASE_URL } from '../constants';

interface DeviceDetailsProps {
  device: Device;
  allDevices: Device[];
  chain: Block[];
  settings: AppSettings;
  currentUser: User;
  onBack: () => void;
  onAddConfiguration: (deviceId: string, newConfig: string) => void;
  onPromptRollback: (targetBlock: Block) => void;
  onSelectDevice: (device: Device) => void;
  onOpenAddDeviceModal: () => void;
  onRealtimeBlockAdd: (deviceId: string, newBlock: Block) => void;
  isSubmitting: boolean;
}

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ 
    device, allDevices, chain, settings, currentUser,
    onBack, onAddConfiguration, onPromptRollback, onSelectDevice, onOpenAddDeviceModal, onRealtimeBlockAdd, isSubmitting
}) => {
  const lastBlock = chain[0]; // Chain is sorted descending
  const [newConfig, setNewConfig] = useState(lastBlock?.config || '');
  const [selectedBlockInfo, setSelectedBlockInfo] = useState<{ block: Block; prevConfig: string } | null>(null);
  
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [isCheckingConfig, setIsCheckingConfig] = useState(false);
  const [configCheckResult, setConfigCheckResult] = useState<string | null>(null);

  const [concurrentUsers, setConcurrentUsers] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // When the device changes, update the config textarea with the latest config of the new device
    const newLastBlock = chain[0]; // Chain is sorted descending
    setNewConfig(newLastBlock?.config || '');
    setConfigCheckResult(null); // Reset check result on device change
  }, [device, chain]);
  
  useEffect(() => {
    // Reset check result if config text is manually changed
    setConfigCheckResult(null);
  }, [newConfig]);

  // --- WebSocket Connection Manager ---
  useEffect(() => {
    // Clean up previous connection if it exists when dependencies change
    if (socketRef.current) {
        socketRef.current.close();
    }
    
    // Don't connect if we don't have the necessary info
    if (!device.id || !currentUser.username) {
        return;
    }

    // Connect to WebSocket endpoint using the centralized base URL.
    const socket = new WebSocket(`${WS_BASE_URL}/ws/${device.id}/${currentUser.username}`);
    socketRef.current = socket;

    socket.onopen = () => {
        console.log(`WebSocket connected for device ${device.id}`);
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'USER_LIST_UPDATE' && Array.isArray(message.payload)) {
                setConcurrentUsers(message.payload);
            } else if (message.type === 'NEW_BLOCK' && message.payload) {
                // The current user who submitted the block doesn't need a UI update,
                // because their UI updates via the standard HTTP response flow.
                // This prevents duplicate state updates and confusing notifications.
                if (message.payload.operator !== currentUser.username) {
                    onRealtimeBlockAdd(device.id, message.payload);
                }
            } else {
                console.warn('Received unknown WebSocket message format:', message);
            }
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    };

    socket.onerror = (event) => {
      // The onerror event is not very informative and logging the event object is unhelpful.
      // The subsequent onclose event will provide a detailed error message.
      console.warn('A WebSocket error occurred. See the error log from the "onclose" event for details.');
    };

    socket.onclose = (event) => {
      let reasonMessage = event.reason || 'No reason given.';
      let reasonDescription = '';
      switch (event.code) {
        case 1000: reasonDescription = "Normal closure, connection successfully closed."; break;
        case 1001: reasonDescription = "Endpoint going away, such as a server shutting down or a browser tab being closed."; break;
        case 1002: reasonDescription = "Protocol error."; break;
        case 1003: reasonDescription = "Unsupported data type received."; break;
        case 1005: reasonDescription = "No status code was present."; break;
        case 1006: reasonDescription = "Abnormal closure. This is a generic error returned when the connection was lost unexpectedly. Check if the server is running, the URL is correct, and if any proxy/firewall supports WebSockets."; break;
        case 1007: reasonDescription = "Invalid frame payload data."; break;
        case 1008: reasonDescription = "Policy violation."; break;
        case 1009: reasonDescription = "Message too big to process."; break;
        case 1010: reasonDescription = "Missing extension for the server to continue."; break;
        case 1011: reasonDescription = "Internal server error on the WebSocket server."; break;
        case 1015: reasonDescription = "TLS handshake failed (e.g., the server certificate can't be verified)."; break;
        default: reasonDescription = "Unknown close code.";
      }
      
      const logMessage = `WebSocket disconnected for device ${device.id}. ` +
          `Code: ${event.code}, Cleanly closed: ${event.wasClean}, Reason: "${reasonMessage}".\n` +
          `Description: ${reasonDescription}`;

      if (event.wasClean) {
          console.log(logMessage);
      } else {
          console.error(logMessage); // Log as an error for abnormal closures
      }

      setConcurrentUsers([]); // Clear users when disconnected
    };

    // Cleanup function: this is called when the component unmounts or dependencies change
    return () => {
        if (socketRef.current) {
            console.log(`Cleaning up WebSocket for device ${device.id}`);
            socketRef.current.close(1000, "Component unmounting"); // Normal closure
            socketRef.current = null;
        }
    };
  }, [device.id, currentUser.username, onRealtimeBlockAdd]); // Re-run effect if device or user changes

  const handleSelectBlock = (block: Block) => {
    const prevBlock = chain.find(b => b.index === block.index - 1);
    const prevConfig = prevBlock ? prevBlock.config : '';
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

    onAddConfiguration(device.id, newConfig);
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
          const errorMessage = error instanceof Error ? error.message : '发生未知错误。';
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
      const errorMessage = error instanceof Error ? error.message : '发生未知错误。';
      toast.error(`体检失败: ${errorMessage}`, { id: toastId });
    } finally {
      setIsCheckingConfig(false);
    }
  };

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
          </div>
          <CollaborationStatus currentUser={currentUser} concurrentUsers={concurrentUsers} />
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
                    onClick={onOpenAddDeviceModal}
                    className="flex-shrink-0 bg-slate-700 hover:bg-cyan-600/50 text-slate-300 hover:text-cyan-300 font-medium p-2 rounded-md transition-colors duration-200"
                    aria-label="添加新设备"
                    title="添加新设备"
                >
                    <PlusIcon />
                </button>
            </div>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {chain.map((block, index) => (
              <HistoryItem 
                key={block.hash} 
                block={block} 
                isLatest={index === 0}
                currentUser={currentUser}
                onSelectBlock={() => handleSelectBlock(block)} 
                onRollback={() => onPromptRollback(block)}
              />
            ))}
            {chain.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                    <p>未找到该设备的历史配置。</p>
                    <p>请在右侧提交第一个配置。</p>
                </div>
            )}
          </div>
        </div>

        {/* Right Side: Add New Config */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl flex flex-col">
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">提交新配置</h3>
            <p className="text-slate-400 mb-6">应用新配置将在链上创建一个新的、不可变的区块，操作员为 <span className="font-mono text-cyan-400">{currentUser.username}</span>。</p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
            <div className="mb-4 flex-grow flex flex-col">
               <div className="flex justify-between items-center mb-2">
                 <label htmlFor="config" className="block text-sm font-medium text-slate-300">配置文本</label>
                 <div className="flex items-center gap-2">
                    {settings.ai.configCheck.enabled && (
                        <button
                            type="button"
                            onClick={handleConfigCheck}
                            disabled={isCheckingConfig || isSubmitting}
                            className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-900 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-1 px-3 rounded-md transition-colors"
                        >
                            {isCheckingConfig ? <Loader /> : <BrainIcon />}
                            <span>AI 配置体检</span>
                        </button>
                    )}
                    {settings.agentApiUrl && (
                        <button
                            type="button"
                            onClick={handleFetchFromDevice}
                            disabled={isFetchingConfig || isSubmitting}
                            className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-900 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-1 px-3 rounded-md transition-colors"
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
                className="w-full flex-grow bg-slate-900 border border-slate-700 rounded-md p-2 font-mono text-sm text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="在此处输入完整的设备配置..."
                disabled={isSubmitting}
              />
            </div>

            {isCheckingConfig && (
                <div className="mb-4 text-center"><Loader /></div>
            )}

            {configCheckResult && (
                <div className="mb-4 p-3 rounded-md bg-slate-900 border border-slate-700 max-h-40 overflow-y-auto">
                    <h4 className="flex items-center gap-2 font-semibold text-slate-300 mb-2 text-sm">
                        <BrainIcon /> AI 配置体检报告
                    </h4>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{configCheckResult}</p>
                </div>
            )}
            
            {settings.ai.commandGeneration.enabled && (
                <div className="mb-6 bg-slate-900/50 p-3 rounded-md">
                    <label htmlFor="ai-prompt" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
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
                            className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                            placeholder="例如：为 VLAN 10 添加端口 G0/1"
                            disabled={isGenerating || isSubmitting}
                        />
                        <button
                            type="button"
                            onClick={handleGenerateConfig}
                            disabled={isGenerating || isSubmitting}
                            className="flex-shrink-0 flex items-center justify-center gap-2 w-32 bg-slate-700 hover:bg-cyan-600/50 text-white font-bold py-2 px-3 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-wait"
                        >
                           {isGenerating ? <Loader/> : '生成命令'}
                        </button>
                    </div>
                </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isFetchingConfig || isGenerating || isCheckingConfig}
              className="w-full flex justify-center items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 text-white font-bold py-2 px-4 rounded-md transition-colors mt-auto"
            >
              {isSubmitting ? <Loader /> : (settings.agentApiUrl ? '推送到设备并记录' : '提交到区块链')}
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
      
    </div>
  );
};

export default DeviceDetails;