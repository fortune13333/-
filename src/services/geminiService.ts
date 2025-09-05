import { GoogleGenAI, Type } from "@google/genai";
import { Block, BlockData, AppSettings, Device } from '../types';
import { AppError } from "../utils/errors";

// --- Singleton Initializer for the Google AI Client ---
let aiInstance: GoogleGenAI | null = null;

// FIX: Add checkKeyAvailability function to verify API key existence on app startup.
/**
 * Checks if the API key is available in the environment.
 * Throws a specific AppError if the key is missing.
 */
const checkKeyAvailability = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new AppError(
            "Google Gemini API key is not configured.",
            'ERR_GEMINI_API_KEY_MISSING'
        );
    }
};

/**
 * Lazily initializes and returns a singleton instance of the GoogleGenAI client.
 * This defers the API key check until an AI function is called, preventing a startup crash.
 * @throws {Error} If the API_KEY environment variable is not configured.
 */
const getAiClient = (): GoogleGenAI => {
    if (aiInstance) {
        return aiInstance;
    }
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        // This error will be caught by the calling function and handled gracefully.
        throw new Error("Google Gemini API key is not configured. Please set it up in your environment configuration.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
    return aiInstance;
};


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

export interface NewBlockPayload {
    operator: string;
    config: string;
    diff: string;
    changeType: BlockData['changeType'];
    summary: string;
    analysis: string;
    security_risks: string;
}

const analyzeConfigurationChange = async (
  newConfig: string, 
  operator: string, 
  currentChain: Block[],
  settings: AppSettings,
  changeType: BlockData['changeType'],
  changeDescription?: string,
): Promise<{ payload: NewBlockPayload; aiSuccess: boolean }> => {
  const { enabled: analysisEnabled, apiUrl: analysisApiUrl } = settings.ai.analysis;
  const lastBlock = currentChain.length > 0 ? currentChain[currentChain.length - 1] : null;
  const lastConfig = lastBlock?.data?.config || '';
  
  let analysisResult;
  let aiSuccess = false;

  if (analysisEnabled) {
    if (analysisApiUrl) {
      console.log("Creating new block with custom API analysis...");
      try {
        const response = await fetch(analysisApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            previousConfig: lastConfig,
            newConfig: newConfig,
            changeDescription: changeDescription,
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
          diff: generateSimpleDiff(lastConfig, newConfig),
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
        ${changeDescription ? `Context for the change: ${changeDescription}` : ''}

        Previous Configuration:
        ---
        ${lastConfig}
        ---
        New Configuration:
        ---
        ${newConfig}
        ---
        Your task is to:
        1. Create a simple text-based diff of the changes. Use '+' for additions and '-' for deletions.
        2. Write a concise, one-sentence summary of the main purpose of the change. If a specific context is provided, use it to inform your summary.
        3. Provide a brief analysis of what the changes do in plain English.
        4. Identify any potential security risks or best practice violations introduced by the new configuration. If there are no obvious risks, state that clearly.

        Provide the response in Simplified Chinese, in the following JSON format. Do not include any other text or markdown formatting.
      `;

      try {
        // FIX: Lazily initialize AI client to prevent startup crash if API key is missing.
        const ai = getAiClient();
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          },
        });
        
        // FIX: Add a check for an empty response to prevent JSON parsing errors.
        const text = response.text;
        if (!text) {
          throw new Error("AI model returned an empty or invalid response.");
        }
        analysisResult = JSON.parse(text.trim());
        aiSuccess = true;

      } catch (error) {
        console.error("Gemini API call failed, falling back to basic diff.", error);
        let errorDetails = error instanceof Error ? error.message : JSON.stringify(error);

        analysisResult = {
          diff: generateSimpleDiff(lastConfig, newConfig),
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
      diff: generateSimpleDiff(lastConfig, newConfig),
      summary: '用户禁用了AI分析。',
      analysis: '此配置变更在提交时未经过AI智能分析。',
      security_risks: '未进行安全评估，因为AI分析已被禁用。',
    };
    aiSuccess = true; // Success in the sense that the operation completed as requested
  }
  
  const payload: NewBlockPayload = {
    operator,
    config: newConfig,
    diff: analysisResult.diff,
    summary: analysisResult.summary,
    analysis: analysisResult.analysis,
    security_risks: analysisResult.security_risks,
    changeType: changeType,
  };
  
  return { payload, aiSuccess };
};


const generateConfigFromPrompt = async (
  userInput: string,
  deviceType: Device['type'],
  currentConfig: string,
  settings: AppSettings
): Promise<string> => {
    if (!settings.ai.commandGeneration.enabled) {
        throw new Error('AI 命令生成功能已被禁用。');
    }
    const { apiUrl } = settings.ai.commandGeneration;
    
    // Simple mapping from our types to potential netmiko-style types for better prompts
    const syntaxType = {
        'Router': 'Cisco IOS style',
        'Switch': 'Cisco IOS style',
        'Firewall': 'Cisco ASA style'
    }[deviceType];
    
    if (apiUrl) {
        console.log("Generating config with custom command generation API...");
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userInput, deviceType, currentConfig, syntaxType }),
            });
            if (!response.ok) throw new Error(`Custom API failed with status: ${response.status}`);
            const data = await response.json();
            return data.commands || '';
        } catch (error) {
            console.error("Custom command generation API call failed:", error);
            const msg = error instanceof Error ? error.message : "An unknown error occurred.";
            throw new Error(`自定义 AI 接口调用失败: ${msg}`);
        }
    }

    const prompt = `
    You are an expert network configuration assistant.
    The target device uses ${syntaxType} syntax.
    The user wants to achieve the following: "${userInput}".

    Here is the current running configuration for context:
    ---
    ${currentConfig}
    ---

    Your task is to generate ONLY the necessary configuration commands to fulfill the user's request.
    - Do not include any explanations, introductory phrases like "Here are the commands:", or markdown code blocks.
    - Output only the raw command lines, each on a new line.
    - If the request requires entering a specific configuration mode (e.g., 'configure terminal', 'interface X'), include those commands.
    `;

    try {
        // FIX: Lazily initialize AI client to prevent startup crash if API key is missing.
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        // FIX: Safely access response.text to avoid errors if it is null or undefined.
        return response.text?.trim() ?? '';
    } catch (error) {
        console.error("Gemini config generation failed:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred with the AI model.";
        throw new Error(`AI command generation failed: ${errorMessage}`);
    }
};

const checkConfiguration = async (
    config: string,
    deviceType: Device['type'],
    settings: AppSettings
): Promise<string> => {
    if (!settings.ai.configCheck.enabled) {
        throw new Error('AI 配置体检功能已被禁用。');
    }
    const { apiUrl } = settings.ai.configCheck;

    const syntaxType = {
        'Router': 'Cisco IOS style',
        'Switch': 'Cisco IOS style',
        'Firewall': 'Cisco ASA style'
    }[deviceType];

    if (apiUrl) {
        console.log("Checking config with custom check API...");
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config, deviceType, syntaxType }),
            });
            if (!response.ok) throw new Error(`Custom API failed with status: ${response.status}`);
            const data = await response.json();
            return data.report || '自定义接口未返回报告。';
        } catch (error) {
            console.error("Custom config check API call failed:", error);
            const msg = error instanceof Error ? error.message : "An unknown error occurred.";
            throw new Error(`自定义 AI 接口调用失败: ${msg}`);
        }
    }

    const prompt = `
    You are an expert network security auditor and configuration analyst.
    The target device uses ${syntaxType} syntax.
    Analyze the following complete network device configuration.
    Your task is to:
    1. Identify any potential security vulnerabilities (e.g., open ports, weak passwords, insecure protocols).
    2. Check for violations of common network best practices (e.g., lack of logging, missing ACLs, improper STP configuration).
    3. Find any logical errors or inconsistencies in the configuration.
    4. Provide actionable recommendations for improvement, presented clearly using bullet points.
    
    If no issues are found, state that the configuration appears to be solid and well-configured.
    Provide the response as a single block of text in Simplified Chinese.
    Do not include any other text or markdown formatting.

    Configuration to analyze:
    ---
    ${config}
    ---
    `;

    try {
        // FIX: Lazily initialize AI client to prevent startup crash if API key is missing.
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        // FIX: Safely access response.text to avoid errors if it is null or undefined.
        return response.text?.trim() ?? '';
    } catch (error) {
        console.error("Gemini config check failed:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred with the AI model.";
        throw new Error(`AI config check failed: ${errorMessage}`);
    }
};

export const geminiService = {
  checkKeyAvailability,
  analyzeConfigurationChange,
  generateConfigFromPrompt,
  checkConfiguration,
};