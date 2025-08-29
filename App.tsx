import React, { useState, useEffect } from 'react';
import { GENESIS_BLOCKS, INITIAL_DEVICES } from './constants';
import { Device, Block, AppSettings, BlockData } from './types';
import { geminiService } from './services/geminiService';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DeviceDetails from './components/DeviceDetails';
import SettingsModal from './components/SettingsModal';
import AddDeviceModal from './components/AddDeviceModal';
import { Toaster, toast } from 'react-hot-toast';
import { calculateBlockHash } from './utils/crypto';

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

  useEffect(() => {
    // Load all data on initial mount
    try {
      const storedDevices = localStorage.getItem('chaintrace_devices');
      const storedBlockchains = localStorage.getItem('chaintrace_blockchains');
      const storedSettings = localStorage.getItem('chaintrace_settings');

      if (storedDevices && storedBlockchains) {
        setDevices(JSON.parse(storedDevices));
        setBlockchains(JSON.parse(storedBlockchains));
      } else {
        setDevices(INITIAL_DEVICES);
        setBlockchains(GENESIS_BLOCKS);
      }
      
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
          // For settings already in new format, merge with default to ensure all keys are present
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
      console.error("Failed to load data from localStorage", error);
      setDevices(INITIAL_DEVICES);
      setBlockchains(GENESIS_BLOCKS);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Save data to localStorage whenever it changes
    try {
      if (!isLoading) {
        localStorage.setItem('chaintrace_devices', JSON.stringify(devices));
        localStorage.setItem('chaintrace_blockchains', JSON.stringify(blockchains));
        localStorage.setItem('chaintrace_settings', JSON.stringify(settings));
      }
    } catch (error) {
      console.error("Failed to save data to localStorage", error);
    }
  }, [blockchains, devices, settings, isLoading]);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    // Deep merge for nested AI settings
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

  const handleResetData = () => {
    const isConfirmed = window.confirm("您确定要重置所有数据到初始状态吗？所有已添加的配置历史将被清除。");
    if (isConfirmed) {
      setIsLoading(true);
      localStorage.removeItem('chaintrace_devices');
      localStorage.removeItem('chaintrace_blockchains');
      setDevices(INITIAL_DEVICES);
      setBlockchains(GENESIS_BLOCKS);
      setSelectedDevice(null);
      toast.success('数据已重置为初始状态!');
      setIsLoading(false);
    }
  };
    
  const handleAddNewDevice = async (newDeviceData: Omit<Device, 'ipAddress'> & { ipAddress: string; }) => {
    if (devices.find(d => d.id.toLowerCase() === newDeviceData.id.toLowerCase())) {
        toast.error(`设备 ID "${newDeviceData.id}" 已存在。`);
        return;
    }

    const newDevice: Device = { ...newDeviceData };

    const genesisConfig = `hostname ${newDevice.name}\n!\nend`;
    const genesisBlockData: BlockData = {
        deviceId: newDevice.id,
        version: 1,
        operator: 'system_init',
        config: genesisConfig,
        diff: `+ ${genesisConfig.split('\n').join('\n+ ')}`,
        changeType: 'initial',
        summary: '初始系统配置。',
        analysis: '这是设备的第一个配置区块，用于建立基线。',
        security_risks: '无。这是一个标准的初始设置。',
    };
    
    const blockWithoutHash: Omit<Block, 'hash'> = {
        index: 0,
        timestamp: new Date().toISOString(),
        data: genesisBlockData,
        prev_hash: '0',
    };

    const newHash = await calculateBlockHash(blockWithoutHash);
    const genesisBlock: Block = {
        ...blockWithoutHash,
        hash: newHash,
    };

    setDevices(prev => [...prev, newDevice]);
    setBlockchains(prev => ({ ...prev, [newDevice.id]: [genesisBlock] }));
    setSelectedDevice(newDevice);
    setIsAddDeviceModalOpen(false); // Close modal on success
    toast.success(`设备 "${newDevice.name}" 已成功添加！`);
  };


  const handleAddConfiguration = async (deviceId: string, newConfig: string, operator: string) => {
    if (!newConfig.trim()) {
      toast.error('配置不能为空。');
      return;
    }
    
    setIsLoading(true);
    const toastId = toast.loading(settings.ai.analysis.enabled ? '正在提交并请求 AI 分析...' : '正在提交到区块链...');
    
    try {
      const currentChain = blockchains[deviceId] || [];
      const { newBlock, aiSuccess } = await geminiService.addNewConfiguration(
        deviceId, 
        newConfig, 
        operator, 
        currentChain,
        settings
      );
      
      setBlockchains(prev => ({
        ...prev,
        [deviceId]: [...currentChain, newBlock]
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

  const handleDeleteDevice = (deviceId: string) => {
    const deviceToDelete = devices.find(d => d.id === deviceId);
    if (!deviceToDelete) return;

    // Update devices state
    setDevices(prev => prev.filter(device => device.id !== deviceId));

    // Update blockchains state
    setBlockchains(prev => {
      const newBlockchains = { ...prev };
      delete newBlockchains[deviceId];
      return newBlockchains;
    });

    // If the deleted device was the one being viewed, go back to the dashboard
    if (selectedDevice?.id === deviceId) {
      setSelectedDevice(null);
    }

    toast.success(`设备 "${deviceToDelete.name}" 已成功删除。`);
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      <Toaster position="top-center" toastOptions={{
        className: '!bg-slate-700 !text-white',
      }} />
      <Header onOpenSettings={() => setIsSettingsModalOpen(true)} />
      <main className="container mx-auto p-4 md:p-8">
        {selectedDevice ? (
          <DeviceDetails 
            device={selectedDevice} 
            allDevices={devices}
            chain={blockchains[selectedDevice.id] || []}
            settings={settings}
            onBack={handleBackToDashboard}
            onAddConfiguration={handleAddConfiguration}
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
    </div>
  );
};

export default App;
