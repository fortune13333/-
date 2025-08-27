import React, { useMemo, useState } from 'react';
import Loader from './Loader';
import { CheckCircleSolid, XCircleSolid } from './AIIcons';
import { Block } from '../types';

export interface VerificationResult {
    index: number;
    status: 'pending' | 'success' | 'failure';
    details?: { stored: string; calculated: string };
}

interface VerificationModalProps {
  results: VerificationResult[];
  chain: Block[];
  onClose: () => void;
  isVerifying: boolean;
}

const StatusIcon: React.FC<{ status: VerificationResult['status'] }> = ({ status }) => {
    switch (status) {
        case 'pending':
            return <Loader />;
        case 'success':
            return <CheckCircleSolid className="h-5 w-5 text-green-500"/>;
        case 'failure':
            return <XCircleSolid className="h-5 w-5 text-red-500"/>;
        default:
            return null;
    }
};

const ChainVisualizer: React.FC<{ results: VerificationResult[] }> = ({ results }) => {
    
    const getStatusColorClasses = (status: VerificationResult['status']) => {
        switch(status) {
            case 'success': return { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-300' };
            case 'failure': return { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-300' };
            default: return { bg: 'bg-slate-700', border: 'border-slate-600', text: 'text-slate-300' };
        }
    }

    return (
        <div className="overflow-x-auto pb-4 mb-4">
            <div className="flex items-center space-x-2 p-4 min-w-max">
                {results.map((result, i) => {
                    const colors = getStatusColorClasses(result.status);
                    const nextLinkColors = i < results.length - 1 ? getStatusColorClasses(results[i+1].status) : colors;
                    
                    return(
                        <React.Fragment key={result.index}>
                            <div className={`flex flex-col items-center justify-center w-24 h-16 rounded-lg border-2 ${colors.border} ${colors.bg} transition-all duration-300`}>
                                <span className={`font-bold text-lg ${colors.text}`}>#{result.index}</span>
                                <span className="text-xs text-slate-400">区块</span>
                            </div>
                            {i < results.length - 1 && (
                                <div className={`h-1 flex-1 min-w-[50px] rounded-full ${nextLinkColors.bg} transition-all duration-300`}></div>
                            )}
                        </React.Fragment>
                    )
                })}
            </div>
        </div>
    );
};


const VerificationModal: React.FC<VerificationModalProps> = ({ results, chain, onClose, isVerifying }) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const blocksMap = useMemo(() => new Map(chain.map(b => [b.index, b])), [chain]);
    
    const totalBlocks = results.length;
    const verifiedBlocks = results.filter(r => r.status !== 'pending').length;
    const hasFailure = results.some(r => r.status === 'failure');
    const finalStatus = isVerifying 
        ? 'in_progress' 
        : hasFailure 
            ? 'failure' 
            : 'success';

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-4xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">链完整性验证</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none" disabled={isVerifying}>&times;</button>
        </div>
        
        <div className="p-6">
            <ChainVisualizer results={results} />
            <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-3">
                {results.map(result => {
                    const block = blocksMap.get(result.index);
                    const isExpanded = expandedIndex === result.index;

                    return (
                        <div key={result.index} className={`p-3 rounded-md transition-all duration-300 ${result.status === 'failure' ? 'bg-red-500/10 border border-red-500/30' : 'bg-slate-700/50'}`}>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-200">区块 #{result.index}</span>
                                <div className="flex items-center gap-4">
                                    {block && (
                                         <button 
                                            onClick={() => setExpandedIndex(isExpanded ? null : result.index)}
                                            className="text-xs text-cyan-400 hover:text-white hover:underline"
                                        >
                                            {isExpanded ? '隐藏内容' : '显示内容'}
                                        </button>
                                    )}
                                    <StatusIcon status={result.status} />
                                </div>
                            </div>
                            
                            {isExpanded && block && (
                                <div className="mt-2 pt-2 border-t border-slate-600/50">
                                    <h4 className="text-sm font-semibold text-slate-300 mb-1">配置内容:</h4>
                                    <pre className="bg-slate-900 p-2 rounded-md font-mono text-xs text-slate-400 max-h-40 overflow-auto">
                                        <code>{block.data.config}</code>
                                    </pre>
                                </div>
                            )}

                            {result.status === 'failure' && result.details && (
                                <div className="mt-2 pt-2 border-t border-red-500/20 text-xs font-mono">
                                    <p className="text-slate-400">哈希值不匹配：</p>
                                    <p className="mt-1"><span className="text-yellow-400">存储值:</span> <span className="text-yellow-500 break-all">{result.details.stored}</span></p>
                                    <p className="mt-1"><span className="text-red-400">计算值:</span> <span className="text-red-500 break-all">{result.details.calculated}</span></p>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>

        <div className="p-4 border-t border-slate-700">
            <div className="flex justify-between items-center">
                <div>
                     {finalStatus === 'in_progress' && <div className="flex items-center gap-2 text-slate-300"><Loader/><span>正在验证... ({verifiedBlocks}/{totalBlocks})</span></div>}
                     {finalStatus === 'success' && <div className="flex items-center gap-2 text-green-400 font-bold"><CheckCircleSolid/><span>验证成功！区块链完整且未被篡改。</span></div>}
                     {finalStatus === 'failure' && <div className="flex items-center gap-2 text-red-400 font-bold"><XCircleSolid/><span>验证失败！发现被篡改的区块。</span></div>}
                </div>
                <button 
                    onClick={onClose} 
                    disabled={isVerifying}
                    className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    关闭
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;