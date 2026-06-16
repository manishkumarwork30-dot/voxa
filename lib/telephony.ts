import { supabase } from './supabase';
import { decrypt } from './encrypt';

export interface UnifiedAgentConfig {
  name: string;
  systemPrompt: string;
  voiceId: string;
  language: 'hi' | 'en' | 'hinglish';
  firstMessage?: string;
}

export interface UnifiedCallConfig {
  phoneNumber: string;
  assistantId: string;
  phoneNumberId: string;
  customerName?: string;
}

export class TelephonyClient {
  private provider: 'VAPI' | 'RETELL' | 'BLAND_AI' | 'TELNYX';
  private apiKey: string;

  constructor(provider: 'VAPI' | 'RETELL' | 'BLAND_AI' | 'TELNYX', apiKey: string) {
    this.provider = provider;
    this.apiKey = apiKey;
  }

  /** Unified Create Agent */
  async createAgent(config: UnifiedAgentConfig): Promise<{ id: string }> {
    const isHindi = config.language === 'hi' || config.language === 'hinglish';
    const firstMessage = config.firstMessage || (isHindi ? 'नमस्ते! मैं आपकी कैसे मदद कर सकता हूं?' : 'Hello! How can I help you today?');

    if (this.provider === 'VAPI') {
      const res = await fetch('https://api.vapi.ai/assistant', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: config.name,
          model: {
            provider: 'anthropic',
            model: 'claude-sonnet-4-20250514',
            messages: [{ role: 'system', content: config.systemPrompt }],
          },
          voice: {
            provider: 'elevenlabs',
            voiceId: config.voiceId || 'sarah',
          },
          firstMessage,
          transcriber: {
            provider: 'deepgram',
            language: isHindi ? 'hi' : 'en',
          },
          recordingEnabled: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`VAPI error: ${await res.text()}`);
      }
      const data = await res.json();
      return { id: data.id };
    }

    if (this.provider === 'RETELL') {
      // Retell requires creating an LLM first, then assigning it to the agent
      const llmRes = await fetch('https://api.retellai.com/create-llm', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          general_prompt: config.systemPrompt,
          begin_message: firstMessage,
        }),
      });

      if (!llmRes.ok) {
        throw new Error(`Retell LLM creation error: ${await llmRes.text()}`);
      }
      const llmData = await llmRes.json();

      const agentRes = await fetch('https://api.retellai.com/create-agent', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_name: config.name,
          voice_id: config.voiceId || '11labs-sarah',
          llm_id: llmData.llm_id,
          language: isHindi ? 'hi-IN' : 'en-US',
        }),
      });

      if (!agentRes.ok) {
        throw new Error(`Retell Agent creation error: ${await agentRes.text()}`);
      }
      const agentData = await agentRes.json();
      return { id: agentData.agent_id };
    }

    if (this.provider === 'BLAND_AI') {
      // Bland AI supports creating agents
      const res = await fetch('https://api.bland.ai/v1/agents', {
        method: 'POST',
        headers: {
          authorization: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_name: config.name,
          prompt: config.systemPrompt,
          voice: config.voiceId || 'sarah',
          language: isHindi ? 'hi-IN' : 'en-US',
          first_sentence: firstMessage,
        }),
      });

      if (!res.ok) {
        throw new Error(`Bland AI error: ${await res.text()}`);
      }
      const data = await res.json();
      return { id: data.agent_id || data.agent?.agent_id || data.id };
    }

    if (this.provider === 'TELNYX') {
      return { id: `telnyx_agent_${Date.now()}` };
    }

    throw new Error('Unsupported telephony provider');
  }

  /** Unified Update Agent */
  async updateAgent(agentId: string, config: Partial<UnifiedAgentConfig>): Promise<any> {
    if (this.provider === 'VAPI') {
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

      const res = await fetch(`https://api.vapi.ai/assistant/${agentId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`VAPI error: ${await res.text()}`);
      return res.json();
    }

    if (this.provider === 'RETELL') {
      // Retell agent config update
      const body: Record<string, any> = {};
      if (config.name) body.agent_name = config.name;
      if (config.voiceId) body.voice_id = config.voiceId;
      if (config.language) body.language = config.language === 'hi' ? 'hi-IN' : 'en-US';

      const res = await fetch(`https://api.retellai.com/update-agent/${agentId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Retell error: ${await res.text()}`);
      return res.json();
    }

    if (this.provider === 'BLAND_AI') {
      const body: Record<string, any> = {};
      if (config.name) body.agent_name = config.name;
      if (config.systemPrompt) body.prompt = config.systemPrompt;
      if (config.voiceId) body.voice = config.voiceId;

      const res = await fetch(`https://api.bland.ai/v1/agents/${agentId}`, {
        method: 'POST',
        headers: {
          authorization: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Bland AI error: ${await res.text()}`);
      return res.json();
    }

    if (this.provider === 'TELNYX') {
      return { success: true };
    }
  }

  /** Unified Delete Agent */
  async deleteAgent(agentId: string): Promise<any> {
    if (this.provider === 'VAPI') {
      const res = await fetch(`https://api.vapi.ai/assistant/${agentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`VAPI delete error: ${await res.text()}`);
      return { success: true };
    }

    if (this.provider === 'RETELL') {
      const res = await fetch(`https://api.retellai.com/delete-agent/${agentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`Retell delete error: ${await res.text()}`);
      return { success: true };
    }

    if (this.provider === 'BLAND_AI') {
      // Bland AI delete agent (simulate or call endpoint if exists)
      return { success: true };
    }

    if (this.provider === 'TELNYX') {
      return { success: true };
    }
  }

  /** Unified Outbound Call */
  async makeOutboundCall(config: UnifiedCallConfig): Promise<{ id: string; rawResponse: any }> {
    if (this.provider === 'VAPI') {
      const res = await fetch('https://api.vapi.ai/call/phone', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumberId: config.phoneNumberId,
          assistantId: config.assistantId,
          customer: {
            number: config.phoneNumber,
            name: config.customerName || 'Customer',
          },
        }),
      });

      if (!res.ok) throw new Error(`VAPI call error: ${await res.text()}`);
      const data = await res.json();
      return { id: data.id, rawResponse: data };
    }

    if (this.provider === 'RETELL') {
      const res = await fetch('https://api.retellai.com/create-phone-call', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_number_id: config.phoneNumberId,
          to_number: config.phoneNumber,
          override_agent_id: config.assistantId,
        }),
      });

      if (!res.ok) throw new Error(`Retell call error: ${await res.text()}`);
      const data = await res.json();
      return { id: data.call_id, rawResponse: data };
    }

    if (this.provider === 'BLAND_AI') {
      const res = await fetch('https://api.bland.ai/v1/calls', {
        method: 'POST',
        headers: {
          authorization: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: config.phoneNumber,
          from: config.phoneNumberId || undefined,
          agent_id: config.assistantId,
          webhook: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/bland` : undefined,
        }),
      });

      if (!res.ok) throw new Error(`Bland AI call error: ${await res.text()}`);
      const data = await res.json();
      return { id: data.call_id, rawResponse: data };
    }

    if (this.provider === 'TELNYX') {
      const res = await fetch('https://api.telnyx.com/v2/calls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_id: config.phoneNumberId,
          to: config.phoneNumber,
          from: config.customerName || 'Vaxo Agent',
        }),
      });

      if (!res.ok) throw new Error(`Telnyx call error: ${await res.text()}`);
      const data = await res.json();
      return { id: data.data?.call_control_id || `telnyx_${Date.now()}`, rawResponse: data };
    }

    throw new Error('Unsupported provider');
  }

  /** Unified List Phone Numbers */
  async listPhoneNumbers(): Promise<any[]> {
    if (this.provider === 'VAPI') {
      const res = await fetch('https://api.vapi.ai/phone-number', {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      if (!res.ok) throw new Error(`VAPI phone number list error: ${await res.text()}`);
      const data = await res.json();
      return Array.isArray(data) ? data : data?.results || [];
    }

    if (this.provider === 'BLAND_AI') {
      const res = await fetch('https://api.bland.ai/v1/inbound', {
        headers: {
          authorization: this.apiKey,
        },
      });
      if (!res.ok) throw new Error(`Bland AI phone number list error: ${await res.text()}`);
      const data = await res.json();
      // Bland AI returns { inbound_numbers: [...] }
      const numbers = data.inbound_numbers || [];
      return numbers.map((n: any) => ({
        id: n.phone_number,
        number: n.phone_number,
        phoneNumber: n.phone_number,
        provider: 'BLAND_AI',
        assistantId: n.agent_id || n.pathway_id || null,
        raw: n,
      }));
    }

    return [];
  }

  /** Unified Buy Phone Number (primarily Bland AI) */
  async buyPhoneNumber(areaCode: string, countryCode: string): Promise<any> {
    if (this.provider === 'BLAND_AI') {
      const res = await fetch('https://api.bland.ai/numbers/purchase', {
        method: 'POST',
        headers: {
          authorization: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          area_code: areaCode || '415',
          country_code: countryCode || 'US',
        }),
      });
      if (!res.ok) throw new Error(`Bland AI buy phone number error: ${await res.text()}`);
      return res.json();
    }

    throw new Error('Number purchasing is currently only supported via Bland AI');
  }

  /** Unified Link Phone Number to Agent */
  async linkPhoneNumberToAgent(phoneNumberIdOrNumber: string, agentIdOrPrefixId: string): Promise<any> {
    // Extract real agent ID if prefix exists
    let remoteAgentId = agentIdOrPrefixId;
    if (agentIdOrPrefixId && agentIdOrPrefixId.includes(':')) {
      remoteAgentId = agentIdOrPrefixId.split(':').slice(1).join(':');
    }

    if (this.provider === 'VAPI') {
      const res = await fetch(`https://api.vapi.ai/phone-number/${phoneNumberIdOrNumber}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assistantId: remoteAgentId }),
      });
      if (!res.ok) throw new Error(`VAPI link error: ${await res.text()}`);
      return res.json();
    }

    if (this.provider === 'BLAND_AI') {
      const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/bland`
        : undefined;

      const res = await fetch(`https://api.bland.ai/v1/inbound/${phoneNumberIdOrNumber}`, {
        method: 'POST',
        headers: {
          authorization: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: remoteAgentId,
          webhook: webhookUrl,
        }),
      });
      if (!res.ok) throw new Error(`Bland AI link error: ${await res.text()}`);
      return res.json();
    }

    throw new Error('Unsupported provider for linking phone numbers');
  }

  /** Unified connection test */
  async testConnection(): Promise<{ valid: boolean; message: string }> {
    try {
      if (this.provider === 'VAPI') {
        const res = await fetch('https://api.vapi.ai/assistant?limit=1', {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });
        return { valid: res.ok, message: res.ok ? 'Connection successful! ✅' : `VAPI test failed: ${res.status}` };
      }
      if (this.provider === 'RETELL') {
        const res = await fetch('https://api.retellai.com/list-agents', {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });
        return { valid: res.ok, message: res.ok ? 'Connection successful! ✅' : `Retell test failed: ${res.status}` };
      }
      if (this.provider === 'BLAND_AI') {
        const res = await fetch('https://api.bland.ai/v1/agents', {
          headers: { authorization: this.apiKey },
        });
        return { valid: res.ok, message: res.ok ? 'Connection successful! ✅' : `Bland AI test failed: ${res.status}` };
      }
      if (this.provider === 'TELNYX') {
        const res = await fetch('https://api.telnyx.com/v2/balance', {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });
        return { valid: res.ok, message: res.ok ? 'Connection successful! ✅' : `Telnyx test failed: ${res.status}` };
      }
      return { valid: false, message: 'Invalid telephony provider' };
    } catch (err: any) {
      return { valid: false, message: err.message || 'Connection failed' };
    }
  }
}

/** Get TelephonyClient for Admin */
export async function getTelephonyClientForAdmin(adminId: string): Promise<TelephonyClient> {
  const { data: admin, error } = await supabase
    .from('users')
    .select('telephony_provider, vapi_api_key, retell_api_key, bland_api_key, telnyx_api_key, is_active')
    .eq('id', adminId)
    .single();

  if (error || !admin) {
    throw new Error('Admin not found');
  }

  const provider = (admin.telephony_provider || 'VAPI') as 'VAPI' | 'RETELL' | 'BLAND_AI' | 'TELNYX';
  let encryptedKey = '';

  if (provider === 'VAPI') encryptedKey = admin.vapi_api_key;
  if (provider === 'RETELL') encryptedKey = admin.retell_api_key;
  if (provider === 'BLAND_AI') encryptedKey = admin.bland_api_key;
  if (provider === 'TELNYX') encryptedKey = admin.telnyx_api_key;

  if (!encryptedKey) {
    throw new Error(`API key is not configured for provider ${provider}. Please configure it in settings.`);
  }

  let apiKey: string;
  try {
    apiKey = decrypt(encryptedKey);
  } catch {
    apiKey = encryptedKey; // fallback for plaintext key
  }

  return new TelephonyClient(provider, apiKey);
}

/** Get TelephonyClient for a specific Agent based on prefix in vapiAgentId */
export async function getTelephonyClientForAgent(
  adminId: string,
  vapiAgentId: string
): Promise<{ client: TelephonyClient; remoteId: string; provider: 'VAPI' | 'RETELL' | 'BLAND_AI' | 'TELNYX' }> {
  const { data: admin, error } = await supabase
    .from('users')
    .select('telephony_provider, vapi_api_key, retell_api_key, bland_api_key, telnyx_api_key, is_active')
    .eq('id', adminId)
    .single();

  if (error || !admin) {
    throw new Error('Admin not found');
  }

  let provider: 'VAPI' | 'RETELL' | 'BLAND_AI' | 'TELNYX' = (admin.telephony_provider || 'VAPI') as 'VAPI' | 'RETELL' | 'BLAND_AI' | 'TELNYX';
  let remoteId = vapiAgentId;

  if (vapiAgentId && vapiAgentId.includes(':')) {
    const parts = vapiAgentId.split(':');
    const p = parts[0].toUpperCase();
    if (p === 'VAPI' || p === 'RETELL' || p === 'BLAND_AI' || p === 'TELNYX') {
      provider = p as any;
      remoteId = parts.slice(1).join(':');
    }
  }

  let encryptedKey = '';
  if (provider === 'VAPI') encryptedKey = admin.vapi_api_key;
  if (provider === 'RETELL') encryptedKey = admin.retell_api_key;
  if (provider === 'BLAND_AI') encryptedKey = admin.bland_api_key;
  if (provider === 'TELNYX') encryptedKey = admin.telnyx_api_key;

  if (!encryptedKey) {
    throw new Error(`API key is not configured for provider ${provider}. Please configure it in settings.`);
  }

  let apiKey: string;
  try {
    apiKey = decrypt(encryptedKey);
  } catch {
    apiKey = encryptedKey; // fallback for plaintext key
  }

  return {
    client: new TelephonyClient(provider, apiKey),
    remoteId,
    provider
  };
}

