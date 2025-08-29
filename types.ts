export interface Device {
  id: string;
  name: string;
  ip_address: string;
  type: 'Router' | 'Switch' | 'Firewall';
}

export interface Block {
  hash: string;
  index: number;
  timestamp: string;
  prev_hash: string;
  device_id: string;
  version: number;
  operator: string;
  config: string;
  diff: string;
  change_type: string;
  summary: string;
  analysis: string;
  security_risks: string;
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

export interface User {
  id?: number; // Optional as it's not present on login payload
  username: string;
  password?: string;
  role: 'admin' | 'operator';
}
