
import React from 'react';
import { Block } from '../types';
import { BrainIcon, CheckCircleIcon, WarningShieldIcon, InfoIcon } from './AIIcons';


interface BlockDetailsModalProps {
  block: Block;
  onClose: () => void;
}

const DiffView: React.FC<{ diff: string }> = ({ diff }) => {
  const lines = diff.split('\n');
  const relevantLines = (lines.length > 2 && (lines[0].startsWith('---') || lines[1].startsWith('+++'))) ? lines.slice(2) : lines;

  return (
    <pre className="bg-slate-900 p-4 rounded-md text-xs font-mono overflow-x-auto max-h-60">
      <code>
        {relevantLines.map((line, index) => {
          const color = line.startsWith('+') ? 'text-green-400' :
                        line.startsWith('-') ? 'text-red-400' :
                        'text-slate-400';
          return (
            <span key={index} className={`block ${color}`}>
              {line}
            </span>
          );
        })}
      </code>
    </pre>
  );
};

const SecurityAssessment: React.FC<{ risks: string }> = ({ risks }) => {
    const lowerCaseRisks = risks.toLowerCase();
    const hasRisks = lowerCaseRisks.includes('警告') || lowerCaseRisks.includes('风险') || lowerCaseRisks.includes('注意');
    const hasNoRisks = lowerCaseRisks.includes('未发现') || lowerCaseRisks.includes('没有明显') || lowerCaseRisks.includes('无');

    if (hasNoRisks) {
        return <div className="flex items-start gap-2 text-green-400"><CheckCircleIcon /> <p>{risks}</p></div>;
    }
    if (hasRisks) {
        return <div className="flex items-start gap-2 text-yellow-400"><WarningShieldIcon /> <p>{risks}</p></div>;
    }
    return <div className="flex items-start gap-2 text-slate-400"><InfoIcon /> <p>{risks}</p></div>;
}


const BlockDetailsModal: React.FC<BlockDetailsModalProps> = ({ block, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-800/80 backdrop-blur-sm p-4 border-b border-slate-700 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-white">区块 #{block.index} - 版本 {block.data.version}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* AI Analysis Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-300 mb-3 flex items-center gap-2"><BrainIcon /> AI 智能分析</h3>
            <div className="bg-slate-900/50 p-4 rounded-md space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-slate-400 mb-1">变更摘要</h4>
                <p className="text-slate-200">{block.data.summary}</p>
              </div>
               <hr className="border-slate-700"/>
              <div>
                <h4 className="font-semibold text-slate-400 mb-1">详细分析</h4>
                <p className="text-slate-200 whitespace-pre-wrap">{block.data.analysis}</p>
              </div>
               <hr className="border-slate-700"/>
              <div>
                <h4 className="font-semibold text-slate-400 mb-1">安全评估</h4>
                <SecurityAssessment risks={block.data.security_risks} />
              </div>
            </div>
          </div>

          {/* Diff View Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-300 mb-3">配置差异</h3>
            <DiffView diff={block.data.diff} />
          </div>
          
          {/* Block Details and Hashes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-slate-300 mb-2">区块元数据</h4>
              <ul className="space-y-2 bg-slate-900/50 p-3 rounded-md">
                <li className="flex justify-between"><span className="text-slate-400">时间戳:</span> <span className="text-slate-200">{new Date(block.timestamp).toLocaleString()}</span></li>
                <li className="flex justify-between"><span className="text-slate-400">操作员:</span> <span className="font-mono bg-slate-700 px-2 py-0.5 rounded">{block.data.operator}</span></li>
                <li className="flex justify-between"><span className="text-slate-400">变更类型:</span> <span className="font-mono bg-slate-700 px-2 py-0.5 rounded">{block.data.changeType}</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-300 mb-2">链哈希值</h4>
              <ul className="space-y-2 font-mono text-xs bg-slate-900/50 p-3 rounded-md">
                <li><span className="text-slate-400">当前哈希:</span> <span className="text-green-400 block break-all">{block.hash}</span></li>
                <li className="mt-2"><span className="text-slate-400">前一哈希:</span> <span className="text-yellow-400 block break-all">{block.prev_hash}</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockDetailsModal;