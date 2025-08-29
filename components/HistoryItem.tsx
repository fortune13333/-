import React from 'react';
import { Block, User } from '../types';

interface HistoryItemProps {
  block: Block;
  isLatest: boolean;
  currentUser: User;
  onSelectBlock: () => void;
  onRollback: (block: Block) => void;
}

const RollbackIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
    </svg>
);


const HistoryItem: React.FC<HistoryItemProps> = ({ block, isLatest, currentUser, onSelectBlock, onRollback }) => {
  return (
    <div className="bg-slate-700/50 p-4 rounded-lg hover:bg-slate-700 transition-colors duration-200">
        <div className="flex justify-between items-start">
            <div className="flex-1 pr-4">
                <p className="font-bold text-white">
                    版本 {block.version}
                    {block.change_type === 'rollback' && <span className="text-xs text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded-full ml-2">回滚点</span>}
                </p>
                <p className="text-sm text-slate-300 mt-1">
                    {block.summary}
                </p>
                 <p className="text-xs text-slate-400 mt-2">
                    <span className="font-semibold">操作员:</span> <span className="font-mono">{block.operator}</span>
                </p>
            </div>
            <div className="text-right flex-shrink-0">
                <p className="text-sm text-slate-300">{new Date(block.timestamp).toLocaleString()}</p>
                <p className="font-mono text-xs text-cyan-400 mt-1 truncate" title={block.hash}>
                    {block.hash.substring(0, 16)}...
                </p>
            </div>
        </div>
        <div className="mt-3 flex justify-end items-center gap-2">
            {currentUser.role === 'admin' && !isLatest && (
                 <button
                    onClick={() => onRollback(block)}
                    className="flex items-center gap-1.5 text-sm bg-yellow-600/50 text-yellow-200 px-3 py-1 rounded-md hover:bg-yellow-600 hover:text-white transition-colors"
                >
                    <RollbackIcon />
                    回滚至此版本
                </button>
            )}
            <button
                onClick={onSelectBlock}
                className="text-sm bg-cyan-600/50 text-cyan-200 px-3 py-1 rounded-md hover:bg-cyan-600 hover:text-white transition-colors"
            >
                查看 AI 分析 & 详情
            </button>
        </div>
    </div>
  );
};

export default HistoryItem;
