
import React, { useState } from 'react';
import { User } from '../types';
import { toast } from 'react-hot-toast';

interface LoginProps {
  onLogin: (user: User) => void;
  mockUsers: User[];
}

const ChainIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const Login: React.FC<LoginProps> = ({ onLogin, mockUsers }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = mockUsers.find(
      u => u.username === username && u.password === password
    );

    if (user) {
      // In a real app, you would not send the password back
      const { password, ...userToLogin } = user;
      onLogin(userToLogin);
    } else {
      toast.error('用户名或密码无效。');
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-800 p-8 rounded-lg shadow-2xl">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
            <ChainIcon />
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">链踪</h1>
                <p className="text-md text-slate-400">网络配置守护者</p>
            </div>
        </div>
        <p className="text-slate-300">请登录以继续</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label 
            htmlFor="username" 
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            用户名
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md p-3 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            required
            autoComplete="username"
          />
        </div>
        <div>
          <label 
            htmlFor="password" 
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            密码
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md p-3 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            required
            autoComplete="current-password"
          />
        </div>
        <div>
          <button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-md transition-colors"
          >
            登录
          </button>
        </div>
      </form>
       <div className="mt-6 text-center text-xs text-slate-500 bg-slate-900/50 p-3 rounded-md">
            <p className="font-semibold mb-2">测试账户:</p>
            <p>管理员: admin / admin</p>
            <p>操作员: operator1 / password</p>
        </div>
    </div>
  );
};

export default Login;
