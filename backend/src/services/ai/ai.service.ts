import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

export interface ChatResult {
  content: string;
  model: string;
  usage?: { prompt: number; completion: number; total: number };
}

class AiService {
  private provider = env.AI_PROVIDER;

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    if (this.provider === 'openai') return this.openai(messages, options);
    if (this.provider === 'anthropic') return this.anthropic(messages, options);
    return this.ollama(messages, options);
  }

  private async openai(messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
    if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
    const body: Record<string, unknown> = {
      model: env.OPENAI_MODEL,
      messages,
      temperature: opts.temperature ?? 0.4,
    };
    if (opts.maxTokens) body.max_tokens = opts.maxTokens;
    if (opts.json) body.response_format = { type: 'json_object' };
    const { data } = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      body,
      { headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` } },
    );
    const choice = data.choices?.[0];
    return {
      content: choice?.message?.content ?? '',
      model: data.model,
      usage: data.usage && {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      },
    };
  }

  private async anthropic(messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
    if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');
    const system = messages.find((m) => m.role === 'system')?.content;
    const userMessages = messages.filter((m) => m.role !== 'system');
    const { data } = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: env.ANTHROPIC_MODEL,
        system,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.4,
        messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
      },
      {
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      },
    );
    const text = data.content?.[0]?.text ?? '';
    return { content: text, model: data.model };
  }

  private async ollama(messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
    const { data } = await axios.post(`${env.OLLAMA_BASE_URL}/api/chat`, {
      model: env.OLLAMA_MODEL,
      messages,
      stream: false,
      options: { temperature: opts.temperature ?? 0.4 },
    });
    return { content: data.message?.content ?? '', model: data.model ?? env.OLLAMA_MODEL };
  }

  async safeJson<T>(messages: ChatMessage[], opts: ChatOptions = {}): Promise<T> {
    const result = await this.chat(messages, { ...opts, json: true, temperature: 0.2 });
    try {
      return JSON.parse(result.content) as T;
    } catch (err) {
      logger.warn({ content: result.content.slice(0, 500) }, 'AI returned non-JSON, attempting extract');
      const match = result.content.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as T;
      throw new Error('AI did not return valid JSON');
    }
  }
}

export const aiService = new AiService();
