import React from 'react';
import { Block } from '../types';
import { BrainIcon, CheckCircleIcon, WarningShieldIcon, InfoIcon } from './AIIcons';


interface BlockDetailsModalProps {
  block: Block;
  prevConfig: string;
  onClose: () => void;
}

// --- Side-by-Side Diff Implementation using LCS ---

/**
 * Computes the Longest Common Subsequence (LCS) table.
 * @param oldLines - Array of strings from the old configuration.
 * @param newLines - Array of strings from the new configuration.
 * @returns A 2D array (DP table) representing the LCS lengths.
 */
const computeLCS = (oldLines: string[], newLines: string[]): number[][] => {
    const n = oldLines.length;
    const m = newLines.length;
    const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (oldLines[i - 1] === newLines[j - 1]) {
                dp[i][j] = 1 + dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp;
};

type DiffItem = {
    type: 'common' | 'added' | 'removed';
    leftLine: string | null;
    rightLine: string | null;
};

/**
 * Backtracks through the LCS table to build the diff array.
 * @param dp - The LCS table from computeLCS.
 * @param oldLines - Array of strings from the old configuration.
 * @param newLines - Array of strings from the new configuration.
 * @param i - Current index in oldLines.
 * @param j - Current index in newLines.
 * @returns An array of DiffItem objects representing the diff.
 */
const buildDiff = (dp: number[][], oldLines: string[], newLines: string[], i: number, j: number): DiffItem[] => {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        const result = buildDiff(dp, oldLines, newLines, i - 1, j - 1);
        result.push({ type: 'common', leftLine: oldLines[i - 1], rightLine: newLines[j - 1] });
        return result;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        const result = buildDiff(dp, oldLines, newLines, i, j - 1);
        result.push({ type: 'added', leftLine: null, rightLine: newLines[j - 1] });
        return result;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        const result = buildDiff(dp, oldLines, newLines, i - 1, j);
        result.push({ type: 'removed', leftLine: oldLines[i - 1], rightLine: null });
        return result;
    } else {
        return [];
    }
};

const SideBySideDiffView: React.FC<{ oldConfig: string; newConfig: string; block: Block }> = ({ oldConfig, newConfig, block }) => {
    const oldLines = oldConfig.split('\n');
    const newLines = newConfig.split('\n');
    
    // Handle case where one of the configs is empty
    const validOldLines = oldConfig.trim() === '' ? [] : oldLines;
    const validNewLines = newConfig.trim() === '' ? [] : newLines;

    const dp = computeLCS(validOldLines, validNewLines);
    const diff = buildDiff(dp, validOldLines, validNewLines, validOldLines.length, validNewLines.length);

    let leftLineNum = 1;
    let rightLineNum = 1;

    return (
        <div className="bg-slate-900 rounded-md text-xs font-mono overflow-auto max-h-[50vh] border border-slate-700">
            <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10">
                    <tr>
                        <th className="w-10 p-2 text-slate-500 text-right font-normal select-none">-</th>
                        <th className="p-2 text-left font-semibold text-slate-300 border-r border-slate-700">
                            原始配置 {block.index > 0 ? `(版本 ${block.version - 1})` : '(创世区块)'}
                        </th>
                        <th className="w-10 p-2 text-slate-500 text-right font-normal select-none">+</th>
                        <th className="p-2 text-left font-semibold text-slate-300">
                            新配置 (版本 {block.version})
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {diff.map((item, index) => {
                        const lineType = item.type;
                        let rowClass = 'hover:bg-slate-700/50';
                        let leftCellClass = '';
                        let rightCellClass = '';

                        if (lineType === 'removed') {
                            rowClass = 'bg-red-900/40';
                            leftCellClass = 'bg-red-500/20';
                        } else if (lineType === 'added') {
                            rowClass = 'bg-green-900/40';
                            rightCellClass = 'bg-green-500/20';
                        }
                        
                        const currentLeftNum = item.leftLine !== null ? leftLineNum++ : '';
                        const currentRightNum = item.rightLine !== null ? rightLineNum++ : '';

                        return (
                            <tr key={index} className={rowClass}>
                                <td className={`p-1 w-10 text-right text-slate-500 select-none ${leftCellClass}`}>
                                    {currentLeftNum}
                                </td>
                                <td className={`p-1 pr-4 whitespace-pre-wrap break-all border-r border-slate-700 ${leftCellClass}`}>
                                    <span className={lineType === 'removed' ? 'text-red-300' : 'text-slate-300'}>{item.leftLine ?? ' '}</span>
                                </td>
                                <td className={`p-1 w-10 text-right text-slate-500 select-none ${rightCellClass}`}>
                                    {currentRightNum}
                                </td>
                                <td className={`p-1 pl-4 whitespace-pre-wrap break-all ${rightCellClass}`}>
                                     <span className={lineType === 'added' ? 'text-green-300' : 'text-slate-300'}>{item.rightLine ?? ' '}</span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
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


const BlockDetailsModal: React.FC<BlockDetailsModalProps> = ({ block, prevConfig, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 bg-slate-800/80 backdrop-blur-sm p-4 border-b border-slate-700 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-white">区块 #{block.index} - 版本 {block.version}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>
        
        <div className="flex-grow p-6 space-y-6 overflow-y-auto">
          {/* AI Analysis Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-300 mb-3 flex items-center gap-2"><BrainIcon /> AI 智能分析</h3>
            <div className="bg-slate-900/50 p-4 rounded-md space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-slate-400 mb-1">变更摘要</h4>
                <p className="text-slate-200">{block.summary}</p>
              </div>
               <hr className="border-slate-700"/>
              <div>
                <h4 className="font-semibold text-slate-400 mb-1">详细分析</h4>
                <p className="text-slate-200 whitespace-pre-wrap">{block.analysis}</p>
              </div>
               <hr className="border-slate-700"/>
              <div>
                <h4 className="font-semibold text-slate-400 mb-1">安全评估</h4>
                <SecurityAssessment risks={block.security_risks} />
              </div>
            </div>
          </div>

          {/* Diff View Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-300 mb-3">配置差异</h3>
            <SideBySideDiffView oldConfig={prevConfig} newConfig={block.config} block={block}/>
          </div>
          
          {/* Block Details and Hashes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-slate-300 mb-2">区块元数据</h4>
              <ul className="space-y-2 bg-slate-900/50 p-3 rounded-md">
                <li className="flex justify-between"><span className="text-slate-400">时间戳:</span> <span className="text-slate-200">{new Date(block.timestamp).toLocaleString()}</span></li>
                <li className="flex justify-between"><span className="text-slate-400">操作员:</span> <span className="font-mono bg-slate-700 px-2 py-0.5 rounded">{block.operator}</span></li>
                <li className="flex justify-between"><span className="text-slate-400">变更类型:</span> <span className="font-mono bg-slate-700 px-2 py-0.5 rounded">{block.change_type}</span></li>
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
