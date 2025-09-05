import React from 'react';
import { Device, Block, User } from '../types';
import { TrashIcon, PlusIcon } from './AIIcons';

interface DashboardProps {
  devices: Device[];
  blockchains: Record<string, Block[]>;
  onSelectDevice: (device: Device) => void;
  isLoading: boolean;
  onResetData: () => void;
  onDeleteDevice: (deviceId: string) => void;
  onOpenAddDeviceModal: () => void;
  currentUser: User;
}

const DeviceIcon: React.FC<{ type: Device['type'] }> = ({ type }) => {
  const iconPath = {
    Router: "M13 10V3L4 14h7v7l9-11h-7z", // Lightning bolt, abstract for router
    Switch: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4", // Arrows for switching
    Firewall: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", // Shield
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={iconPath[type]} />
    </svg>
  );
};

const SkeletonCard: React.FC = () => (
  <div className="bg-zinc-900 p-4 rounded-lg shadow-md animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-zinc-800 rounded-md"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
        <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
      </div>
    </div>
    <div className="mt-4 border-t border-zinc-800 pt-3 space-y-2">
      <div className="h-3 bg-zinc-800 rounded w-full"></div>
      <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
      <div className="h-3 bg-zinc-800 rounded w-1/3"></div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ devices, blockchains, onSelectDevice, isLoading, onResetData, onDeleteDevice, onOpenAddDeviceModal, currentUser }) => {
  
  const isAdmin = currentUser.role === 'admin';

  const handleDelete = (e: React.MouseEvent, deviceId: string, deviceName: string) => {
    e.stopPropagation(); // Prevent card click event from firing
    const isConfirmed = window.confirm(`您确定要删除设备 "${deviceName}" 及其所有配置历史吗？此操作不可撤销。`);
    if (isConfirmed) {
      onDeleteDevice(deviceId);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 border-b-2 border-zinc-800 pb-2 gap-4">
        <h2 className="text-3xl font-bold text-white">受管设备</h2>
        {isAdmin && (
          <div className="flex items-center gap-2">
              <button
                onClick={onOpenAddDeviceModal}
                className="flex items-center gap-2 text-sm bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-3 rounded-md transition-colors duration-200"
              >
                <PlusIcon />
                <span>添加新设备</span>
              </button>
              <button
                onClick={onResetData}
                className="text-sm bg-zinc-800 hover:bg-red-600/50 text-zinc-300 hover:text-red-300 font-medium py-2 px-3 rounded-md transition-colors duration-200"
              >
                重置数据
              </button>
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : devices.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900 rounded-lg">
              <h3 className="text-xl font-semibold text-white">未找到任何设备</h3>
              <p className="text-zinc-400 mt-2 mb-6">开始您的链踪之旅，请先添加您的第一个网络设备。</p>
              {isAdmin && (
                <button
                  onClick={onOpenAddDeviceModal}
                  className="flex items-center gap-2 text-sm bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 mx-auto"
                >
                  <PlusIcon />
                  <span>添加第一个设备</span>
                </button>
              )}
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map(device => {
            const lastBlock = blockchains[device.id]?.[blockchains[device.id].length - 1];
            return (
              <div 
                key={device.id}
                onClick={() => onSelectDevice(device)}
                className="relative bg-zinc-900 p-4 rounded-lg shadow-md cursor-pointer hover:bg-zinc-800 transition-all duration-200 group flex flex-col justify-between border border-transparent hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10"
              >
                {isAdmin && (
                  <button
                    onClick={(e) => handleDelete(e, device.id, device.name)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-800/50 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/50 hover:text-red-300 transition-all duration-200 z-10"
                    aria-label={`删除设备 ${device.name}`}
                    title={`删除设备 ${device.name}`}
                  >
                      <TrashIcon />
                  </button>
                )}
                <div>
                  <div className="flex items-center gap-4">
                    <div className="bg-zinc-950 p-2 rounded-md">
                      <DeviceIcon type={device.type} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">{device.name}</h3>
                      <p className="text-sm text-zinc-400 font-mono">{device.ipAddress}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-zinc-300 border-t border-zinc-800 pt-3 space-y-2">
                  {lastBlock ? (
                    <>
                      <p className="truncate text-zinc-300" title={lastBlock.data.summary}>
                        <span className="font-semibold text-zinc-400">最新摘要: </span>{lastBlock.data.summary}
                      </p>
                      <p className="text-xs">
                        <span className="font-semibold text-zinc-400">版本:</span> {lastBlock.data.version} | <span className="font-semibold text-zinc-400">操作员:</span> <span className="font-mono">{lastBlock.data.operator}</span>
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(lastBlock.timestamp).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p>未找到配置历史。</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;