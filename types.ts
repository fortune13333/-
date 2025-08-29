
export interface Device {
  id: string;
  name: string;
  ipAddress: string;
  type: 'Router' | 'Switch' | 'Firewall';
}

export interface BlockData {
  deviceId: string;
  version: number;
  operator: string;
  config: string;
  diff: string;
  changeType: 'initial' | 'update';
  summary: string;
  analysis: string;
  security_risks: string;
}

export interface Block {
  index: number;
  timestamp: string;
  data: BlockData;
  prev_hash: string;
  hash: string;
}

export interface AIServiceSettings {
  enabled: boolean;
  apiUrl?: string;
}

export interface AppSettings {
  ai: {
    analysis: AIServiceSettings;
    commandGeneration: AIServiceSettings;
    configCheck: AIServiceSettings;
  };
  agentApiUrl?: string;
}
