
import { GoogleGenAI, Type } from "@google/genai";
import { Block, BlockData, AppSettings } from '../types';
import { calculateBlockHash } from '../utils/crypto';

// Initialize the Google AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Define the expected JSON response structure for the Gemini model
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    diff: {
      type: Type.STRING,
      description: 'A line-by-line diff. Use + for additions and - for deletions.',
    },
    summary: {
      type: Type.STRING,
      description: 'A one-sentence summary of the change in Chinese.',
    },
    analysis: {
      type: Type.STRING,
      description: 'A plain English explanation of the changes in Chinese.',
    },
    security_risks: {
      type: Type.STRING,
      description: 'A list of potential security risks or a statement that none were found, in Chinese.',
    },
  },
  required: ['diff', 'summary', 'analysis', 'security_risks'],
};

// A simple diff generator for when AI is disabled
const generateSimpleDiff = (oldConfig: string, newConfig: string): string => {
  const oldLines = new Set(oldConfig.split('\n'));
  const newLines = new Set(newConfig.split('\n'));
  let diff = '';

  oldConfig.split('\n').forEach(line => {
    if (!newLines.has(line)) {
      diff += `- ${line}\n`;
    }
  });

  newConfig.split('\n').forEach(line => {
    if (!oldLines.has(line)) {
      diff += `+ ${line}\n`;
    }
  });
  
  return diff.trim() || 'No textual changes detected.';
};


const addNewConfiguration = async (
  deviceId: string, 
  newConfig: string, 
  operator: string, 
  currentChain: Block[],
  settings: AppSettings
): Promise<{ newBlock: Block; aiSuccess: boolean }> => {
  const { aiEnabled, analysisApiUrl } = settings;
  const lastBlock = currentChain[currentChain.length - 1];
  
  let analysisResult;
  let aiSuccess = false;

  if (aiEnabled) {
    if (analysisApiUrl) {
      console.log("Creating new block with custom API analysis...");
      try {
        const response = await fetch(analysisApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            previousConfig: lastBlock.data.config,
            newConfig: newConfig,
          }),
        });

        if (!response.ok) {
          throw new Error(`Custom API failed with status: ${response.status}`);
        }

        analysisResult = await response.json();
        if (!analysisResult.diff || !analysisResult.summary || !analysisResult.analysis || !analysisResult.security_risks) {
          throw new Error('Custom API response is missing required fields.');
        }
        aiSuccess = true;

      } catch (error) {
        console.error("Custom API call failed, falling back to basic diff.", error);
        const errorDetails = error instanceof Error ? error.message : JSON.stringify(error);
        analysisResult = {
          diff: generateSimpleDiff(lastBlock.data.config, newConfig),
          summary: '自定义API分析失败，已记录基本变更。',
          analysis: `由于自定义API调用失败，无法提供详细分析。配置已按原样保存。\n错误详情: ${errorDetails}`,
          security_risks: '无法进行安全评估。'
        };
        aiSuccess = false;
      }
    } else {
      console.log("Creating new block with Gemini analysis...");
      const prompt = `
        You are an expert network and security engineer.
        Analyze the following network device configuration change.
        Previous Configuration:
        ---
        ${lastBlock.data.config}
        ---
        New Configuration:
        ---
        ${newConfig}
        ---
        Your task is to:
        1. Create a simple text-based diff of the changes. Use '+' for additions and '-' for deletions.
        2. Write a concise, one-sentence summary of the main purpose of the change.
        3. Provide a brief analysis of what the changes do in plain English.
        4. Identify any potential security risks or best practice violations introduced by the new configuration. If there are no obvious risks, state that clearly.

        Provide the response in Simplified Chinese, in the following JSON format. Do not include any other text or markdown formatting.
      `;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          },
        });
        
        analysisResult = JSON.parse(response.text);
        aiSuccess = true;

      } catch (error) {
        console.error("Gemini API call failed, falling back to basic diff.", error);
        let errorDetails = error instanceof Error ? error.message : JSON.stringify(error);

        analysisResult = {
          diff: generateSimpleDiff(lastBlock.data.config, newConfig),
          summary: 'AI分析失败，已记录基本变更。',
          analysis: `由于AI模型调用失败，无法提供详细分析。配置已按原样保存。\n错误详情: ${errorDetails}`,
          security_risks: '无法进行安全评估。'
        };
        aiSuccess = false;
      }
    }
  } else {
    console.log("Creating new block without AI analysis...");
    analysisResult = {
      diff: generateSimpleDiff(lastBlock.data.config, newConfig),
      summary: '用户禁用了AI分析。',
      analysis: '此配置变更在提交时未经过AI智能分析。',
      security_risks: '未进行安全评估，因为AI分析已被禁用。',
    };
    aiSuccess = true; // Success in the sense that the operation completed as requested
  }
  
  const newIndex = lastBlock.index + 1;
  const newVersion = lastBlock.data.version + 1;

  const newBlockData: BlockData = {
    deviceId,
    version: newVersion,
    operator,
    config: newConfig,
    diff: analysisResult.diff,
    summary: analysisResult.summary,
    analysis: analysisResult.analysis,
    security_risks: analysisResult.security_risks,
    changeType: 'update',
  };

  const blockWithoutHash: Omit<Block, 'hash'> = {
    index: newIndex,
    timestamp: new Date().toISOString(),
    data: newBlockData,
    prev_hash: lastBlock.hash,
  };
  
  const newHash = await calculateBlockHash(blockWithoutHash);
  
  const newBlock: Block = {
    ...blockWithoutHash,
    hash: newHash,
  };
  
  console.log("New block created:", newBlock);
  return { newBlock, aiSuccess };
};

export const geminiService = {
  addNewConfiguration,
};