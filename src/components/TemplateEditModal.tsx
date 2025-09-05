import React, { useState, useEffect } from 'react';
import { User, ConfigTemplate } from '../types';
import { toast } from 'react-hot-toast';
import { createApiUrl } from '../utils/apiUtils';

interface TemplateEditModalProps {
  templateToEdit: ConfigTemplate | null;
  currentUser: User;
  agentApiUrl?: string;
  onClose: () => void;
  onSave: () => void;
}

const TemplateEditModal: React.FC<TemplateEditModalProps> = ({ templateToEdit, currentUser, agentApiUrl, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const isEditing = !!templateToEdit;

  useEffect(() => {
    if (isEditing) {
      setName(templateToEdit.name);
      setContent(templateToEdit.content);
    }
  }, [templateToEdit, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) {
      toast.error('模板名称和内容均不能为空。');
      return;
    }

    const toastId = toast.loading(isEditing ? '正在更新模板...' : '正在创建模板...');
    
    const payload = {
        id: isEditing ? templateToEdit.id : crypto.randomUUID(),
        name: name.trim(),
        content: content.trim(),
    };
    
    try {
        const url = isEditing
            ? createApiUrl(agentApiUrl!, `/api/templates/${templateToEdit.id}`)
            : createApiUrl(agentApiUrl!, '/api/templates');
        
        const response = await fetch(url, {
            method: isEditing ? 'PUT' : 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Actor-Username': currentUser.username,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: '代理返回了未知错误。' }));
            throw new Error(errorData.detail);
        }

        toast.success(isEditing ? '模板更新成功！' : '模板创建成功！', { id: toastId });
        onSave();

    } catch (error) {
        const msg = error instanceof Error ? error.message : '未知错误。';
        toast.error(`操作失败: ${msg}`, { id: toastId });
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-900 rounded-lg shadow-2xl w-full max-w-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{isEditing ? '编辑配置模板' : '创建新配置模板'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label htmlFor="templateName" className="block text-sm font-medium text-zinc-300 mb-2">模板名称</label>
              <input 
                type="text" 
                id="templateName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-2 text-zinc-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="例如 '标准交换机端口安全配置'"
                required
              />
            </div>
             <div>
              <label htmlFor="templateContent" className="block text-sm font-medium text-zinc-300 mb-2">配置内容</label>
              <textarea
                id="templateContent"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-64 bg-zinc-950 border border-zinc-700 rounded-md p-2 font-mono text-sm text-zinc-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="在此处输入模板配置..."
                required
              />
            </div>
          </div>

          <div className="p-4 border-t border-zinc-700 flex justify-end items-center gap-4">
              <button 
                  type="button"
                  onClick={onClose} 
                  className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
              >
                  取消
              </button>
              <button 
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
              >
                  {isEditing ? '保存更改' : '创建模板'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateEditModal;