
import React from 'react';
import { Block } from '../types';

interface HistoryItemProps {
  block: Block;
  onSelectBlock: (block: Block) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ block, onSelectBlock }) => {
  return (
    <div className="bg-slate-700/50 p-4 rounded-lg hover:bg-slate-700 transition-colors duration-200">
        <div className="flex justify-between items-start">
            <div className="flex-1 pr-4">
                <p className="font-bold text-white">版本 {block.data.version}</p>
                <p className="text-sm text-slate-300 mt-1">
                    {block.data.summary}
                </p>
                 <p className="text-xs text-slate-400 mt-2">
                    <span className="font-semibold">操作员:</span> {block.data.operator}
                </p>
            </div>
            <div className="text-right flex-shrink-0">
                <p className="text-sm text-slate-300">{new Date(block.timestamp).toLocaleString()}</p>
                <p className="font-mono text-xs text-cyan-400 mt-1 truncate" title={block.hash}>
                    {block.hash.substring(0, 16)}...
                </p>
            </div>
        </div>
        <div className="mt-3 text-right">
            <button
                onClick={() => onSelectBlock(block)}
                className="text-sm bg-cyan-600/50 text-cyan-200 px-3 py-1 rounded-md hover:bg-cyan-600 hover:text-white transition-colors"
            >
                查看 AI 分析 & 详情
            </button>
        </div>
    </div>
  );
};

export default HistoryItem;