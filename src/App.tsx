import React from 'react';
import { MOCK_USERS } from './constants';
import { Device, Block, AppSettings, User } from './types';
import { geminiService } from './services/geminiService';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DeviceDetails from './components/DeviceDetails';
import SettingsModal from './components/SettingsModal';
import AddDeviceModal from './components/AddDeviceModal';
import Login from './components/Login';
import ConfirmationModal from './components/ConfirmationModal';
import { Toaster, toast } from 'react-hot-toast';
import { leaveDeviceSessionAPI } from './utils/session';
import { createApiUrl } from './utils/apiUtils';


const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    analysis: { enabled: true, apiUrl: '' },
    commandGeneration: { enabled: true, apiUrl: '' },
    configCheck: { enabled: true, apiUrl: '' },
  },
  agentApiUrl: '',
};


const App: React.FC = () => {
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [blockchains, setBlockchains] = React.useState<Record<string, Block[]>>({});
  const [selectedDevice, setSelectedDevice] = React.useState<Device | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = React.useState(false);
  const [settings, setSettings] = React.useState<AppSettings>(DEFAULT_SETTINGS);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [rollbackTarget, setRollbackTarget] = React.useState<Block | null>(null);
  const [agentMode, setAgentMode] = React.useState<'live' | 'simulation'>('live');

  const sessionId = React.useMemo(() => crypto.randomUUID(), []);
  
  // Use a ref to track loading state to prevent re-fetching in polling
  const isLoadingRef = React.useRef(isLoading);
  isLoadingRef.current = isLoading;

  const fetchDataFromAgent = React.useCallback(async (isSilent = false) => {
    if (!settings.agentApiUrl) {
        if (!isSilent) toast.error('未配置代理地址，无法加载数据。请在设置中配置。', { icon: '⚙️' });
        setDevices([]);
        setBlockchains({});
        setIsLoading(false);
        return;
    }
    if (!isSilent) setIsLoading(true);

    try {
      const url = createApiUrl(settings.agentApiUrl, '/api/data');
      const response = await fetch(url);
      if (!response.ok) {
        let detail = response.statusText;
        try {
            const errorJson = await response.json();
            detail = errorJson.detail || JSON.stringify(errorJson);
        } catch (e) {
            // Response was not JSON
        }
        throw new Error(`代理返回错误 (${response.status}): ${detail}`);
      }
      const data = await response.json();
      setDevices(data.devices || []);
      setBlockchains(data.blockchains || {});
    } catch (error) {
      console.error("Failed to load data from agent", error);
      const errorMessage = error instanceof Error ? error.message : '发生未知错误。';
      
      let displayMessage = errorMessage;
      if (errorMessage.toLowerCase().includes('failed to fetch')) {
          displayMessage = '网络请求失败。请检查代理是否正在运行，URL是否正确，以及是否存在CORS问题。';
      }

      if (!isSilent) toast.error(`从代理加载数据失败: ${displayMessage}`, { duration: 6000 });

      // Fallback to empty state if agent is down
      setDevices([]);
      setBlockchains({});
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [settings.agentApiUrl]);


  React.useEffect(() => {
    // Load settings from localStorage (settings remain local to the browser)
    const storedSettings = localStorage.getItem('chaintrace_settings');
    if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
    } else {
        setSettings(DEFAULT_SETTINGS);
    }

    // Load user from sessionStorage
    const storedUser = sessionStorage.getItem('chaintrace_user');
    if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
    }
    
  }, []);

  // Effect for initial data load and setting up polling
  React.useEffect(() => {
    if (currentUser && settings.agentApiUrl) {
      // 1. Initial fetch
      fetchDataFromAgent();

      // 2. Set up polling for real-time updates
      const intervalId = setInterval(() => {
        // Only poll if the page is visible and not already in a loading state
        if (!document.hidden && !isLoadingRef.current) {
          fetchDataFromAgent(true); // silent fetch
        }
      }, 5000); // Poll every 5 seconds

      // 3. Cleanup on component unmount or when dependencies change
      return () => clearInterval(intervalId);
    } else if (!settings.agentApiUrl) {
        setIsLoading(false);
    }
  }, [settings.agentApiUrl, currentUser, fetchDataFromAgent]);
  
  // Check agent status and mode whenever URL changes
  React.useEffect(() => {
    const checkAgentStatus = async () => {
        if (settings.agentApiUrl) {
            try {
                const url = new URL('/api/health', settings.agentApiUrl).toString();
                const response = await fetch(url);
                if (!response.ok) {
                    setAgentMode('live'); // Default to live if health check fails but is reachable
                    return;
                }
                const data = await response.json();
                setAgentMode(data.mode || 'live');
            } catch (e) {
                setAgentMode('live'); // Default to live if fetch fails
            }
        }
    };
    checkAgentStatus();
  }, [settings.agentApiUrl]);

  React.useEffect(() => {
    // Save settings to localStorage whenever they change
    localStorage.setItem('chaintrace_settings', JSON.stringify(settings));
  }, [settings]);

  React.useEffect(() => {
    const handleBeforeUnload = () => {
        if (selectedDevice && settings.agentApiUrl) {
            leaveDeviceSessionAPI(selectedDevice.id, sessionId, settings.agentApiUrl);
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedDevice, sessionId, settings.agentApiUrl]);


  const handleLogin = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('chaintrace_user', JSON.stringify(user));
    toast.success(`欢迎, ${user.username}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedDevice(null);
    sessionStorage.removeItem('chaintrace_user');
    toast.success('您已成功登出。');
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({
        ...prev,
        ...newSettings,
        ai: {
            ...prev.ai,
            ...(newSettings.ai || {}),
        }
    }));
  };

  const handleSelectDevice = (device: Device) => {
    setSelectedDevice(device);
  };

  const handleBackToDashboard = () => {
    setSelectedDevice(null);
  };

  const handleResetData = async () => {
    if (!settings.agentApiUrl) {
        toast.error('未配置代理地址。');
        return;
    }
    const isConfirmed = window.confirm("您确定要重置所有数据到初始状态吗？所有已添加的配置历史将被清除。");
    if (isConfirmed) {
      setIsLoading(true);
      try {
        const url = createApiUrl(settings.agentApiUrl, '/api/reset');
        const response = await fetch(url, { method: 'POST' });
        if (!response.ok) throw new Error("代理重置失败");
        await fetchDataFromAgent(); // Refetch the now-empty data
        setSelectedDevice(null);
        toast.success('数据已重置为初始状态!');
      } catch (error) {
        toast.error('重置数据失败。');
      } finally {
        setIsLoading(false);
      }
    }
  };
    
  const handleAddNewDevice = async (newDeviceData: Omit<Device, 'ipAddress'> & { ipAddress: string; }) => {
    if (!settings.agentApiUrl) {
      toast.error('请配置代理地址后再添加设备。');
      return;
    }
    const toastId = toast.loading(`正在添加设备 ${newDeviceData.name}...`);
    try {
        const url = createApiUrl(settings.agentApiUrl, '/api/devices');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newDeviceData),
        });
        if (response.status === 409) {
            throw new Error(`设备 ID "${newDeviceData.id}" 已存在。`);
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({'detail': '代理返回错误。'}));
            throw new Error(errorData.detail || '代理返回错误。');
        }
        const newDevice = await response.json();
        await fetchDataFromAgent(); // Refresh all data
        setSelectedDevice(newDevice);
        setIsAddDeviceModalOpen(false);
        toast.success(`设备 "${newDevice.name}" 已成功添加！`, { id: toastId });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误。';
        toast.error(`添加失败: ${errorMessage}`, { id: toastId });
    }
  };

  const handleAddConfiguration = async (deviceId: string, newConfig: string) => {
    if (!currentUser) {
      toast.error('未授权的操作。请重新登录。');
      return;
    }
    if (!newConfig.trim()) {
      toast.error('配置不能为空。');
      return;
    }
    if (!settings.agentApiUrl) {
      toast.error('未配置代理地址。');
      return;
    }
    
    setIsLoading(true);
    const toastId = toast.loading(settings.ai.analysis.enabled ? '正在提交并请求 AI 分析...' : '正在提交...');
    
    try {
      const currentChain = blockchains[deviceId] || [];
      const { payload, aiSuccess } = await geminiService.analyzeConfigurationChange(
        newConfig, 
        currentUser.username, 
        currentChain,
        settings,
        'update'
      );

      const url = createApiUrl(settings.agentApiUrl, `/api/blockchains/${deviceId}`);
      const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({'detail': 'Failed to save new block to agent.'}));
        throw new Error(errorData.detail || "无法将新区块保存到代理。");
      }

      await fetchDataFromAgent(); // Refresh data from server for immediate feedback
      
      if (settings.ai.analysis.enabled) {
          if (aiSuccess) {
            toast.success('配置已成功记录！', { id: toastId });
          } else {
            toast.success('配置已记录，但AI分析失败。', { id: toastId, icon: '⚠️' });
          }
      } else {
        toast.success('配置已成功记录（未进行 AI 分析）。', { id: toastId });
      }

    } catch (error) {
      console.error("Error adding configuration:", error);
      const errorMessage = error instanceof Error ? error.message : '发生未知错误。';
      toast.error(`添加配置失败: ${errorMessage}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePromptRollback = (targetBlock: Block) => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error('权限不足，只有管理员才能执行回滚操作。');
      return;
    }
    const deviceId = targetBlock.data.deviceId;
    const currentChain = blockchains[deviceId] || [];
    const lastBlock = currentChain[currentChain.length - 1];
    if (lastBlock.hash === targetBlock.hash) {
      toast.error('无法回滚到当前最新版本。');
      return;
    }
    setRollbackTarget(targetBlock);
  };

  const executeRollback = async () => {
    if (!rollbackTarget || !currentUser || !settings.agentApiUrl) return;
    
    // Capture the target block in a local variable to prevent race conditions.
    const blockToRollbackTo = rollbackTarget;
    const deviceId = blockToRollbackTo.data.deviceId;
    
    setIsLoading(true);
    setRollbackTarget(null); // Close modal immediately
    const toastId = toast.loading(`正在回滚至版本 ${blockToRollbackTo.data.version}...`);

    try {
      const currentChain = blockchains[deviceId] || []; 
      const lastVersion = currentChain.length > 0 ? currentChain[currentChain.length - 1].data.version : 0;
      const rollbackConfig = blockToRollbackTo.data.config;
      const changeDescription = `配置从版本 ${lastVersion} 回滚至版本 ${blockToRollbackTo.data.version}。`;

      const { payload } = await geminiService.analyzeConfigurationChange(
        rollbackConfig, currentUser.username, currentChain,
        settings, 'rollback', changeDescription
      );

      const url = createApiUrl(settings.agentApiUrl, `/api/blockchains/${deviceId}`);
      const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({'detail': 'Failed to save rollback block to agent.'}));
        throw new Error(errorData.detail || "无法将回滚区块保存到代理。");
      }

      await fetchDataFromAgent(); // Refresh data
      
      toast.success(`已成功回滚至版本 ${blockToRollbackTo.data.version}！`, { id: toastId });

    } catch (error) {
      console.error("Error rolling back configuration:", error);
      const errorMessage = error instanceof Error ? error.message : '发生未知错误。';
      toast.error(`回滚失败: ${errorMessage}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!settings.agentApiUrl) return;
    const deviceToDelete = devices.find(d => d.id === deviceId);
    if (!deviceToDelete) return;

    try {
        const url = createApiUrl(settings.agentApiUrl, `/api/devices/${deviceId}`);
        const response = await fetch(url, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error("代理删除设备失败");

        await fetchDataFromAgent(); // Refresh data
        
        if (selectedDevice?.id === deviceId) {
            setSelectedDevice(null);
        }
        toast.success(`设备 "${deviceToDelete.name}" 已成功删除。`);
    } catch(error) {
        toast.error("删除设备失败。");
    }
  };
  
  if (!currentUser) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <Toaster position="top-center" toastOptions={{ className: '!bg-indigo-800 !text-zinc-100 !border !border-indigo-700 !shadow-lg' }} />
            <Login onLogin={handleLogin} mockUsers={MOCK_USERS} />
        </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Toaster position="top-center" toastOptions={{ className: '!bg-indigo-800 !text-zinc-100 !border !border-indigo-700 !shadow-lg' }} />
      <Header 
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsModalOpen(true)} 
      />
      <main className="container mx-auto p-4 md:p-8">
        {selectedDevice ? (
          <DeviceDetails 
            device={selectedDevice} 
            allDevices={devices}
            chain={blockchains[selectedDevice.id] || []}
            settings={settings}
            agentMode={agentMode}
            currentUser={currentUser}
            sessionId={sessionId}
            onBack={handleBackToDashboard}
            onAddConfiguration={handleAddConfiguration}
            onPromptRollback={handlePromptRollback}
            onSelectDevice={handleSelectDevice}
            onOpenAddDeviceModal={() => setIsAddDeviceModalOpen(true)}
            isLoading={isLoading}
          />
        ) : (
          <Dashboard 
            devices={devices} 
            blockchains={blockchains}
            onSelectDevice={handleSelectDevice}
            isLoading={isLoading}
            onResetData={handleResetData}
            onDeleteDevice={handleDeleteDevice}
            onOpenAddDeviceModal={() => setIsAddDeviceModalOpen(true)}
          />
        )}
      </main>
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
      <AddDeviceModal
        isOpen={isAddDeviceModalOpen}
        onClose={() => setIsAddDeviceModalOpen(false)}
        onAddDevice={handleAddNewDevice}
      />
      {rollbackTarget && (
        <ConfirmationModal
          isOpen={!!rollbackTarget}
          onClose={() => setRollbackTarget(null)}
          onConfirm={executeRollback}
          title="确认回滚操作"
          confirmText="确认回滚"
          confirmButtonVariant="warning"
        >
          <p className="text-sm text-zinc-300">
            您确定要将设备 <strong className="font-bold text-white">{rollbackTarget.data.deviceId}</strong> 的配置回滚到 <strong className="font-bold text-white">版本 {rollbackTarget.data.version}</strong> 吗？
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            此操作将在区块链上创建一个新的配置记录，而不是删除历史记录。
          </p>
        </ConfirmationModal>
      )}
    </div>
  );
};

export default App;