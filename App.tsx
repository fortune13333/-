import React, { useState, useEffect, useMemo } from 'react';
import { Device, Block, AppSettings, User } from './types';
import { geminiService } from './services/geminiService';
import { apiService } from './services/apiService';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DeviceDetails from './components/DeviceDetails';
import SettingsModal from './components/SettingsModal';
import AddDeviceModal from './components/AddDeviceModal';
import Login from './components/Login';
import ConfirmationModal from './components/ConfirmationModal';
import { Toaster, toast } from 'react-hot-toast';

const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    analysis: { enabled: true, apiUrl: '' },
    commandGeneration: { enabled: true, apiUrl: '' },
    configCheck: { enabled: true, apiUrl: '' },
  },
  agentApiUrl: '',
};

const App: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [blockchains, setBlockchains] = useState<Record<string, Block[]>>({});
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<Block | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // --- Data Loading and Initialization ---
  useEffect(() => {
    // Load settings from localStorage (settings are client-specific)
    try {
      const storedSettings = localStorage.getItem('chaintrace_settings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        // Migration from old settings structure
        if (parsed.hasOwnProperty('aiEnabled')) {
          const migratedSettings: AppSettings = {
            ai: {
              analysis: { enabled: parsed.aiEnabled, apiUrl: parsed.analysisApiUrl || '' },
              commandGeneration: { enabled: parsed.aiEnabled, apiUrl: '' },
              configCheck: { enabled: parsed.aiEnabled, apiUrl: '' },
            },
            agentApiUrl: parsed.agentApiUrl || '',
          };
          setSettings(migratedSettings);
        } else {
          const mergedSettings: AppSettings = {
            ...DEFAULT_SETTINGS,
            ...parsed,
            ai: {
              ...DEFAULT_SETTINGS.ai,
              ...(parsed.ai || {}),
              analysis: { ...DEFAULT_SETTINGS.ai.analysis, ...(parsed.ai?.analysis || {}) },
              commandGeneration: { ...DEFAULT_SETTINGS.ai.commandGeneration, ...(parsed.ai?.commandGeneration || {}) },
              configCheck: { ...DEFAULT_SETTINGS.ai.configCheck, ...(parsed.ai?.configCheck || {}) },
            },
          };
          setSettings(mergedSettings);
        }
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage", error);
      setSettings(DEFAULT_SETTINGS);
    }

    // Check for existing token and validate it with the backend
    const token = apiService.getToken();
    if (token) {
        apiService.getCurrentUser()
          .then(user => {
            setCurrentUser(user);
            setIsAuthenticated(true);
          })
          .catch(() => {
            // Token is invalid or expired, log the user out
            apiService.logout();
          })
          .finally(() => {
            setIsLoading(false);
          });
    } else {
      setIsLoading(false);
    }
  }, []);

  // Fetch devices when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true);
      apiService.getDevices()
        .then(data => {
          setDevices(data);
        })
        .catch(error => {
          toast.error(`获取设备列表失败: ${error.message}`);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isAuthenticated]);


  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('chaintrace_settings', JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings to localStorage", error);
    }
  }, [settings]);

  // --- Handlers ---
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    toast.success(`欢迎, ${user.username}!`);
  };

  const handleLogout = () => {
    apiService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setSelectedDevice(null);
    setDevices([]);
    setBlockchains({});
    toast.success('您已成功登出。');
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({
        ...prev,
        ...newSettings,
        ai: {
            ...prev.ai,
            ...(newSettings.ai || {}),
            analysis: { ...DEFAULT_SETTINGS.ai.analysis, ...(newSettings.ai?.analysis || {}) },
            commandGeneration: { ...DEFAULT_SETTINGS.ai.commandGeneration, ...(newSettings.ai?.commandGeneration || {}) },
            configCheck: { ...DEFAULT_SETTINGS.ai.configCheck, ...(newSettings.ai?.configCheck || {}) },
        },
    }));
  };

  const handleSelectDevice = async (device: Device) => {
    setIsLoading(true);
    setSelectedDevice(device);
    try {
        if (!blockchains[device.id]) {
            const deviceWithChain = await apiService.getDeviceWithBlockchain(device.id);
            setBlockchains(prev => ({
                ...prev,
                [device.id]: deviceWithChain.blocks
            }));
        }
    } catch (error) {
        toast.error(`获取设备 ${device.name} 的历史记录失败。`);
        setSelectedDevice(null); // Deselect if fetching fails
    } finally {
        setIsLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    setSelectedDevice(null);
  };

  const handleResetData = async () => {
    if (currentUser?.role !== 'admin') {
      toast.error('只有管理员才能重置数据。');
      return;
    }
    const isConfirmed = window.confirm("您确定要重置所有数据到初始状态吗？此操作将清空后端数据库并重新填充初始数据。");
    if (isConfirmed) {
      setIsLoading(true);
      try {
        await apiService.resetData();
        const data = await apiService.getDevices();
        setDevices(data);
        setBlockchains({}); // Clear local cache
        setSelectedDevice(null);
        toast.success('数据已重置为初始状态!');
      } catch (error) {
        toast.error(`重置数据失败: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };
    
  const handleAddNewDevice = async (newDeviceData: Omit<Device, 'ip_address'> & { ip_address: string; }) => {
    if (devices.find(d => d.id.toLowerCase() === newDeviceData.id.toLowerCase())) {
        toast.error(`设备 ID "${newDeviceData.id}" 已存在。`);
        return;
    }
    try {
      const newDevice = await apiService.addDevice(newDeviceData);
      // After adding, fetch the full device with its new genesis block
      const deviceWithChain = await apiService.getDeviceWithBlockchain(newDevice.id);
      
      setDevices(prev => [...prev, newDevice]);
      setBlockchains(prev => ({
        ...prev,
        [newDevice.id]: deviceWithChain.blocks,
      }));
      setSelectedDevice(newDevice); // Navigate to new device
      
      setIsAddDeviceModalOpen(false);
      toast.success(`设备 "${newDevice.name}" 已成功添加！`);
    } catch (error) {
       toast.error(`添加设备失败: ${error.message}`);
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
    
    setIsLoading(true);
    const toastId = toast.loading(settings.ai.analysis.enabled ? '正在提交并请求 AI 分析...' : '正在提交到区块链...');
    
    try {
      const currentChain = blockchains[deviceId] || [];
      const lastBlock = currentChain.length > 0 ? currentChain[0] : null; // Chain is sorted descending
      
      const { analysisResult, aiSuccess } = await geminiService.getAIAnalysisForNewConfig(
          lastBlock,
          newConfig,
          settings,
          'update'
      );
      
      const newBlock = await apiService.addBlock(deviceId, {
          config: newConfig,
          operator: currentUser.username,
          change_type: 'update',
          ...analysisResult
      });

      setBlockchains(prev => ({
        ...prev,
        [deviceId]: [newBlock, ...currentChain]
      }));
      
      if (settings.ai.analysis.enabled) {
          if (aiSuccess) {
            toast.success('配置已成功添加到区块链！', { id: toastId });
          } else {
            toast.success('配置已添加，但AI分析失败。', {
              id: toastId,
              icon: '⚠️',
              duration: 5000,
            });
          }
      } else {
        toast.success('配置已成功添加到区块链（未进行 AI 分析）。', { id: toastId });
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
    
    const deviceId = targetBlock.device_id;
    const currentChain = blockchains[deviceId] || [];
    const lastBlock = currentChain[0]; // Descending sort
    if (lastBlock.hash === targetBlock.hash) {
      toast.error('无法回滚到当前最新版本。');
      return;
    }

    setRollbackTarget(targetBlock);
  };

  const executeRollback = async () => {
    if (!rollbackTarget || !currentUser) return;
    
    const targetBlock = rollbackTarget;
    const deviceId = targetBlock.device_id;
    const currentChain = blockchains[deviceId] || [];
    const lastBlock = currentChain[0];

    setIsLoading(true);
    const toastId = toast.loading(`正在回滚至版本 ${targetBlock.version} 并请求 AI 分析...`);
    setRollbackTarget(null);

    try {
      const rollbackConfig = targetBlock.config;
      const changeDescription = `配置从版本 ${lastBlock.version} 回滚至版本 ${targetBlock.version}。`;

      const { analysisResult } = await geminiService.getAIAnalysisForNewConfig(
        lastBlock,
        rollbackConfig,
        settings,
        'rollback',
        changeDescription
      );

      const newBlock = await apiService.addBlock(deviceId, {
          config: rollbackConfig,
          operator: currentUser.username,
          change_type: 'rollback',
          ...analysisResult
      });

      setBlockchains(prev => ({
        ...prev,
        [deviceId]: [newBlock, ...currentChain]
      }));
      
      toast.success(`已成功回滚至版本 ${targetBlock.version}！`, { id: toastId });

    } catch (error) {
      console.error("Error rolling back configuration:", error);
      const errorMessage = error instanceof Error ? error.message : '发生未知错误。';
      toast.error(`回滚失败: ${errorMessage}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (currentUser?.role !== 'admin') {
      toast.error('只有管理员才能删除设备。');
      return;
    }
    const deviceToDelete = devices.find(d => d.id === deviceId);
    if (!deviceToDelete) return;

    try {
        await apiService.deleteDevice(deviceId);
        setDevices(prev => prev.filter(device => device.id !== deviceId));

        setBlockchains(prev => {
          const newBlockchains = { ...prev };
          delete newBlockchains[deviceId];
          return newBlockchains;
        });

        if (selectedDevice?.id === deviceId) {
          setSelectedDevice(null);
        }

        toast.success(`设备 "${deviceToDelete.name}" 已成功删除。`);
    } catch (error) {
        toast.error(`删除设备失败: ${error.message}`);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-slate-400">正在加载应用...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
        <div className="min-h-screen bg-slate-900 font-sans flex items-center justify-center">
            <Toaster position="top-center" toastOptions={{
                className: '!bg-slate-700 !text-white',
            }} />
            <Login onLogin={handleLogin} />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      <Toaster position="top-center" toastOptions={{
        className: '!bg-slate-700 !text-white',
      }} />
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
            currentUser={currentUser}
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
            currentUser={currentUser}
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
          <p className="text-sm text-slate-300">
            您确定要将设备 <strong className="font-bold text-white">{rollbackTarget.device_id}</strong> 的配置回滚到 <strong className="font-bold text-white">版本 {rollbackTarget.version}</strong> 吗？
          </p>
          <p className="mt-2 text-xs text-slate-400">
            此操作将在区块链上创建一个新的配置记录，而不是删除历史记录。
          </p>
        </ConfirmationModal>
      )}
    </div>
  );
};

export default App;