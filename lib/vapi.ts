import { supabase } from './supabase';
import { decrypt } from './encrypt';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface CreateAgentConfig {
  name: string;
  systemPrompt: string;
  voiceId: string;
  language: 'hi' | 'en' | 'hinglish';
  firstMessage?: string;
}

export interface OutboundCallConfig {
  phoneNumber: string;
  assistantId: string;
  phoneNumberId: string;
  customerName?: string;
}

// ─────────────────────────────────────────────
// VapiClient — per-admin API key wrapper
// ─────────────────────────────────────────────
export class VapiClient {
  private apiKey: string;
  private baseUrl = 'https://api.vapi.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`VAPI API error ${res.status}: ${errBody}`);
    }

    return res.json() as Promise<T>;
  }

  /** Create an AI assistant on VAPI */
  async createAgent(config: CreateAgentConfig) {
    const langCode = config.language === 'hi' ? 'hi' : config.language === 'hinglish' ? 'hi' : 'en';

    const firstMessage = config.firstMessage
      || (langCode === 'hi'
        ? 'नमस्ते! मैं आपकी कैसे मदद कर सकता हूं?'
        : 'Hello! How can I help you today?');

    return this.request('/assistant', {
      method: 'POST',
      body: JSON.stringify({
        name: config.name,
        model: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          messages: [{ role: 'system', content: config.systemPrompt }],
        },
        voice: {
          provider: 'elevenlabs',
          voiceId: config.voiceId,
        },
        firstMessage,
        transcriber: {
          provider: 'deepgram',
          language: langCode,
        },
        recordingEnabled: true,
      }),
    });
  }

  /** Update an existing assistant's config */
  async updateAgent(vapiAgentId: string, config: Partial<CreateAgentConfig>) {
    const body: Record<string, any> = {};
    if (config.name) body.name = config.name;
    if (config.systemPrompt) {
      body.model = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'system', content: config.systemPrompt }],
      };
    }
    if (config.voiceId) {
      body.voice = { provider: 'elevenlabs', voiceId: config.voiceId };
    }
    if (config.firstMessage) body.firstMessage = config.firstMessage;

    return this.request(`/assistant/${vapiAgentId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /** Delete an assistant from VAPI */
  async deleteAgent(vapiAgentId: string) {
    return this.request(`/assistant/${vapiAgentId}`, { method: 'DELETE' });
  }

  /** Initiate an outbound phone call */
  async makeOutboundCall(config: OutboundCallConfig) {
    return this.request('/call/phone', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumberId: config.phoneNumberId,
        assistantId: config.assistantId,
        customer: {
          number: config.phoneNumber,
          name: config.customerName,
        },
      }),
    });
  }

  /** Get details of a specific call */
  async getCallDetails(vapiCallId: string) {
    return this.request(`/call/${vapiCallId}`);
  }

  /** List all phone numbers in admin's VAPI account */
  async listPhoneNumbers() {
    return this.request('/phone-number');
  }

  /** Link a phone number to an assistant for inbound routing */
  async linkPhoneNumberToAgent(phoneNumberId: string, assistantId: string) {
    return this.request(`/phone-number/${phoneNumberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ assistantId }),
    });
  }

  /** Verify VAPI API key is valid */
  async testConnection() {
    try {
      await this.request('/assistant?limit=1');
      return { valid: true };
    } catch {
      return { valid: false };
    }
  }
}

// ─────────────────────────────────────────────
// Helper: get VapiClient for a specific admin
// Uses Supabase instead of old MongoDB model
// ─────────────────────────────────────────────
export async function getVapiClientForAdmin(adminId: string): Promise<VapiClient> {
  const { data: admin, error } = await supabase
    .from('users')
    .select('vapi_api_key, is_active')
    .eq('id', adminId)
    .single();

  if (error || !admin) {
    throw new Error('Admin not found');
  }

  if (!admin.vapi_api_key) {
    throw new Error('Admin has no VAPI API key configured. Please set it in API Keys settings.');
  }

  // Try to decrypt — if it fails (key was stored plaintext), use as-is
  let apiKey: string;
  try {
    apiKey = decrypt(admin.vapi_api_key);
  } catch {
    apiKey = admin.vapi_api_key; // fallback for plaintext keys
  }

  return new VapiClient(apiKey);
}

/** Build language code for VAPI from DB language field */
export function getLanguageCode(language: string): 'hi' | 'en' | 'hinglish' {
  const l = language?.toUpperCase();
  if (l === 'HINDI') return 'hi';
  if (l === 'HINGLISH') return 'hinglish';
  return 'en';
}