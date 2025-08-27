import React, { useState } from 'react';
import { Device } from '../types';
import { toast } from 'react-hot-toast';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDevice: (deviceData: Omit<Device, 'ipAddress'> & { ipAddress: string }) => void;
}

const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ isOpen, onClose, onAddDevice }) => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [type, setType] = useState<'Router' | 'Switch' | 'Firewall'>('Router');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !name.trim() || !ipAddress.trim()) {
      toast.error('所有字段均为必填项。');
      return;
    }
    // Simple IP validation
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
      toast.error('请输入有效的 IP 地址。');
      return;
    }

    onAddDevice({ id, name, ipAddress, type });
    onClose();
    // Reset form for next time
    setId('');
    setName('');
    setIpAddress('');
    setType('Router');
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
          <h2 className="text-xl font-bold text-white">添加新设备</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="deviceId" className="block text-sm font-medium text-slate-300 mb-2">设备 ID</label>
              <input 
                type="text" 
                id="deviceId"
                value={id}
                onChange={(e) => setId(e.target.value.toUpperCase())}
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-slate-200 font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="例如 RTR02-NYC"
                required
              />
            </div>
             <div>
              <label htmlFor="deviceName" className="block text-sm font-medium text-slate-300 mb-2">设备名称</label>
              <input 
                type="text" 
                id="deviceName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="例如 Core Router 2 NYC"
                required
              />
            </div>
             <div>
              <label htmlFor="deviceIp" className="block text-sm font-medium text-slate-300 mb-2">IP 地址</label>
              <input 
                type="text" 
                id="deviceIp"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-slate-200 font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                 placeholder="例如 192.168.1.2"
                required
              />
            </div>
            <div>
              <label htmlFor="deviceType" className="block text-sm font-medium text-slate-300 mb-2">设备类型</label>
              <select
                id="deviceType"
                value={type}
                onChange={(e) => setType(e.target.value as Device['type'])}
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="Router">路由器 (Router)</option>
                <option value="Switch">交换机 (Switch)</option>
                <option value="Firewall">防火墙 (Firewall)</option>
              </select>
            </div>
          </div>

          <div className="p-4 border-t border-slate-700 flex justify-end items-center gap-4">
              <button 
                  type="button"
                  onClick={onClose} 
                  className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
              >
                  取消
              </button>
              <button 
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
              >
                  添加设备
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDeviceModal;