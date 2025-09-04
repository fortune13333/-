import React from 'react';

interface ApiKeyInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <pre className="bg-zinc-950 p-3 rounded-md text-sm text-cyan-300 overflow-x-auto">
        <code>{children}</code>
    </pre>
);

const ApiKeyInstructionsModal: React.FC<ApiKeyInstructionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-key-instructions-title"
    >
      <div
        className="bg-zinc-900 rounded-lg shadow-2xl w-full max-w-2xl border border-zinc-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
          <h2 id="api-key-instructions-title" className="text-xl font-bold text-white">
            如何配置 Gemini API 密钥
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          <p className="text-zinc-300">
            为了启用AI功能，我们推荐使用 `.env` 文件来安全地配置您的 Google Gemini API 密钥。这是一种简单且一次性设置的方法。
          </p>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">第 1 步：获取您的 API 密钥</h3>
            <p className="text-zinc-400 text-sm">
              如果您还没有密钥，可以从 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">Google AI Studio</a> 获取。
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">第 2 步：创建并编辑 `.env` 文件</h3>
            <p className="text-zinc-400 text-sm mb-3">
              在项目的根目录（与 `package.json` 文件位于同一级别），请按照以下步骤操作：
            </p>
            <ol className="list-decimal list-inside space-y-2 text-zinc-300 text-sm">
                <li>找到项目中的 `env.txt` 文件。</li>
                <li>将该文件**重命名**为 `.env` (注意文件名前只有一个点，没有后缀)。</li>
                <li>用文本编辑器打开新创建的 `.env` 文件。</li>
                <li>将您的 API 密钥粘贴到引号内。</li>
            </ol>
             <p className="text-xs text-zinc-500 mt-2">
              (备用方法: 您也可以复制 `.env.example` 文件并重命名为 `.env`)
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-200">文件内容示例 (`.env`):</h4>
            <CodeBlock>{`API_KEY="AIzaSy...your...key...here"`}</CodeBlock>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">第 3 步：重启开发服务器</h3>
              <p className="text-zinc-400 text-sm mb-3">
                如果您正在运行开发服务器 (`npm run dev`)，请在终端中按 `Ctrl+C` 停止它，然后重新运行 `npm run dev` 来加载新的 `.env` 文件。
              </p>
          </div>

            <div className="bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 p-3 rounded-md text-sm">
            <strong>完成！</strong> 您现在应该可以正常使用所有AI功能了。`.env` 文件会被自动忽略，不会上传到代码仓库，确保您的密钥安全。
          </div>

        </div>

        <div className="p-4 bg-zinc-950/50 border-t border-zinc-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            我明白了
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyInstructionsModal;