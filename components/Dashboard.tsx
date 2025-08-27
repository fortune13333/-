import React from 'react';
import { Device, Block } from '../types';

interface DashboardProps {
  devices: Device[];
  blockchains: Record<string, Block[]>;
  onSelectDevice: (device: Device) => void;
  isLoading: boolean;
  onResetData: () => void;
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
  <div className="bg-slate-800 p-4 rounded-lg shadow-md animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-slate-700 rounded-md"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-700 rounded w-3/4"></div>
        <div className="h-3 bg-slate-700 rounded w-1/2"></div>
      </div>
    </div>
    <div className="mt-4 border-t border-slate-700 pt-3 space-y-2">
      <div className="h-3 bg-slate-700 rounded w-full"></div>
      <div className="h-3 bg-slate-700 rounded w-1/2"></div>
      <div className="h-3 bg-slate-700 rounded w-1/3"></div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ devices, blockchains, onSelectDevice, isLoading, onResetData }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6 border-b-2 border-slate-700 pb-2">
        <h2 className="text-3xl font-bold text-white">受管设备</h2>
        <button
          onClick={onResetData}
          className="text-sm bg-slate-700 hover:bg-red-600/50 text-slate-300 hover:text-red-300 font-medium py-1 px-3 rounded-md transition-colors duration-200"
        >
          重置为初始数据
        </button>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map(device => {
            const lastBlock = blockchains[device.id]?.[blockchains[device.id].length - 1];
            return (
              <div 
                key={device.id}
                onClick={() => onSelectDevice(device)}
                className="bg-slate-800 p-4 rounded-lg shadow-md cursor-pointer hover:bg-slate-700 transition-colors duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-900 p-2 rounded-md">
                      <DeviceIcon type={device.type} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">{device.name}</h3>
                      <p className="text-sm text-slate-400 font-mono">{device.ipAddress}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-slate-300 border-t border-slate-700 pt-3 space-y-2">
                  {lastBlock ? (
                    <>
                      <p className="truncate text-slate-300" title={lastBlock.data.summary}>
                        <span className="font-semibold text-slate-400">最新摘要: </span>{lastBlock.data.summary}
                      </p>
                      <p className="text-xs">
                        <span className="font-semibold text-slate-400">版本:</span> {lastBlock.data.version} | <span className="font-semibold text-slate-400">操作员:</span> <span className="font-mono">{lastBlock.data.operator}</span>
                      </p>
                      <p className="text-xs text-slate-500">
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