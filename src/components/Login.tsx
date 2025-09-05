import React, { useState } from 'react';
import { User } from '../types';
import { toast } from 'react-hot-toast';
import { createApiUrl } from '../utils/apiUtils';
import Loader from './Loader';

interface LoginProps {
  onLogin: (user: User) => void;
  agentApiUrl?: string;
}

const ChainIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-cyan-400" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const Login: React.FC<LoginProps> = ({ onLogin, agentApiUrl }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentApiUrl) {
      toast.error('代理地址未配置，无法登录。请刷新页面或检查设置。');
      return;
    }
    setIsLoading(true);

    try {
      const url = createApiUrl(agentApiUrl, '/api/users');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('无法从代理获取用户列表。');
      }
      const users: User[] = await response.json();
      
      const user = users.find(
        u => u.username === username && u.password === password
      );

      if (user) {
        const { password, ...userToLogin } = user;
        onLogin(userToLogin);
      } else {
        toast.error('用户名或密码无效。');
      }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '发生未知错误。';
        toast.error(`登录失败: ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-lg shadow-2xl">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
            <ChainIcon />
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">链踪</h1>
                <p className="text-md text-zinc-400">网络配置守护者</p>
            </div>
        </div>
        <p className="text-zinc-300">请登录以继续</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label 
            htmlFor="username" 
            className="block text-sm font-medium text-zinc-300 mb-2"
          >
            用户名
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-3 text-zinc-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            required
            autoComplete="username"
            disabled={isLoading}
          />
        </div>
        <div>
          <label 
            htmlFor="password" 
            className="block text-sm font-medium text-zinc-300 mb-2"
          >
            密码
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-3 text-zinc-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            required
            autoComplete="current-password"
            disabled={isLoading}
          />
        </div>
        <div>
          <button
            type="submit"
            className="w-full flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-zinc-600"
            disabled={isLoading}
          >
            {isLoading ? <Loader /> : '登录'}
          </button>
        </div>
      </form>
       <div className="mt-6 text-center text-xs text-zinc-500 bg-zinc-950/50 p-3 rounded-md">
            <p className="font-semibold mb-2">默认账户 (可在管理员面板修改):</p>
            <p>管理员: admin / admin</p>
            <p>操作员: operator1 / password</p>
        </div>
    </div>
  );
};

export default Login;