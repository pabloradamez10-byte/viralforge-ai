import axios, {
  type AxiosError,
} from 'axios';

import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export type AiProvider =
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'ollama';

export interface ChatMessage {
  role:
    | 'system'
    | 'user'
    | 'assistant';

  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

export interface ChatUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface ChatResult {
  content: string;
  model: string;
  provider: AiProvider;
  usage?: ChatUsage;
}

interface ProviderAttempt {
  provider: AiProvider;
  execute: () => Promise<ChatResult>;
}

interface OpenAiCompatibleResponse {
  model?: string;

  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;

  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface GeminiResponse {
  modelVersion?: string;

  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };

    finishReason?: string;
  }>;

  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };

  promptFeedback?: {
    blockReason?: string;
  };
}

interface AnthropicResponse {
  model?: string;

  content?: Array<{
    type?: string;
    text?: string;
  }>;

  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

class AiService {
  /**
   * Executa a chamada usando o provedor principal.
   *
   * Em caso de falha, tenta automaticamente os demais
   * provedores configurados antes de permitir que o
   * generator.ts utilize o fallback determinístico.
   */
  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): Promise<ChatResult> {
    const normalizedMessages =
      this.normalizeMessages(messages);

    if (
      normalizedMessages.length === 0
    ) {
      throw new Error(
        'Nenhuma mensagem foi enviada ao serviço de IA.',
      );
    }

    const attempts =
      this.buildProviderAttempts(
        normalizedMessages,
        options,
      );

    if (
      attempts.length === 0
    ) {
      throw new Error(
        'Nenhum provedor de IA está configurado.',
      );
    }

    const failures:
      string[] = [];

    for (
      const attempt of attempts
    ) {
      try {
        logger.info(
          {
            provider:
              attempt.provider,
          },
          'Tentando gerar conteúdo com IA',
        );

        const result =
          await attempt.execute();

        if (
          !result.content.trim()
        ) {
          throw new Error(
            'O provedor retornou uma resposta vazia.',
          );
        }

        logger.info(
          {
            provider:
              result.provider,

            model:
              result.model,

            usage:
              result.usage,
          },
          'Conteúdo gerado com IA',
        );

        return result;
      } catch (error: unknown) {
        const message =
          this.getErrorMessage(
            error,
          );

        failures.push(
          `${attempt.provider}: ${message}`,
        );

        logger.warn(
          {
            provider:
              attempt.provider,

            error:
              message,
          },
          'Provedor de IA falhou; tentando o próximo',
        );
      }
    }

    throw new Error(
      [
        'Todos os provedores de IA configurados falharam.',
        ...failures,
      ].join('\n'),
    );
  }

  /**
   * Gera e interpreta uma resposta JSON.
   */
  async safeJson<T>(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): Promise<T> {
    const jsonMessages =
      this.ensureJsonInstruction(
        messages,
      );

    const result =
      await this.chat(
        jsonMessages,
        {
          ...options,
          json: true,

          /*
           * Temperatura menor aumenta a previsibilidade
           * da estrutura JSON.
           */
          temperature:
            Math.min(
              options.temperature ??
                0.2,
              0.4,
            ),
        },
      );

    const cleaned =
      this.cleanJsonContent(
        result.content,
      );

    try {
      return JSON.parse(
        cleaned,
      ) as T;
    } catch {
      logger.warn(
        {
          provider:
            result.provider,

          model:
            result.model,

          content:
            cleaned.slice(
              0,
              1_000,
            ),
        },
        'IA retornou JSON inválido; tentando extrair objeto',
      );

      const extracted =
        this.extractJsonObject(
          cleaned,
        );

      if (!extracted) {
        throw new Error(
          `O provedor ${result.provider} não retornou um JSON válido.`,
        );
      }

      try {
        return JSON.parse(
          extracted,
        ) as T;
      } catch {
        throw new Error(
          `O provedor ${result.provider} retornou um JSON que não pôde ser interpretado.`,
        );
      }
    }
  }

  /**
   * Monta a fila de provedores.
   *
   * O AI_PROVIDER configurado no Railway é tentado primeiro.
   * Depois são tentados os demais provedores com chave válida.
   */
  private buildProviderAttempts(
    messages: ChatMessage[],
    options: ChatOptions,
  ): ProviderAttempt[] {
    const preferred =
      env.AI_PROVIDER as AiProvider;

    const defaultOrder:
      AiProvider[] = [
        'gemini',
        'groq',
        'openrouter',
        'openai',
        'anthropic',
      ];

    const orderedProviders =
      this.uniqueProviders([
        preferred,
        ...defaultOrder,
      ]);

    /*
     * Ollama é tentado apenas quando escolhido explicitamente.
     * Isso evita tentar localhost no Railway sem um servidor Ollama.
     */
    if (
      preferred === 'ollama'
    ) {
      orderedProviders.push(
        'ollama',
      );
    }

    const attempts:
      ProviderAttempt[] = [];

    for (
      const provider of
      orderedProviders
    ) {
      if (
        !this.isProviderConfigured(
          provider,
        )
      ) {
        continue;
      }

      attempts.push({
        provider,

        execute: () =>
          this.executeProvider(
            provider,
            messages,
            options,
          ),
      });
    }

    return attempts;
  }

  private executeProvider(
    provider: AiProvider,
    messages: ChatMessage[],
    options: ChatOptions,
  ): Promise<ChatResult> {
    switch (provider) {
      case 'gemini':
        return this.gemini(
          messages,
          options,
        );

      case 'groq':
        return this.groq(
          messages,
          options,
        );

      case 'openrouter':
        return this.openRouter(
          messages,
          options,
        );

      case 'openai':
        return this.openAi(
          messages,
          options,
        );

      case 'anthropic':
        return this.anthropic(
          messages,
          options,
        );

      case 'ollama':
        return this.ollama(
          messages,
          options,
        );

      default:
        throw new Error(
          `Provedor de IA desconhecido: ${String(provider)}`,
        );
    }
  }

  /**
   * Google Gemini.
   */
  private async gemini(
    messages: ChatMessage[],
    options: ChatOptions,
  ): Promise<ChatResult> {
    const apiKey =
      env.GEMINI_API_KEY.trim();

    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY não configurada.',
      );
    }

    const systemInstruction =
      messages
        .filter(
          (
            message: ChatMessage,
          ): boolean =>
            message.role ===
            'system',
        )
        .map(
          (
            message: ChatMessage,
          ): string =>
            message.content,
        )
        .join('\n\n');

    const contents =
      messages
        .filter(
          (
            message: ChatMessage,
          ): boolean =>
            message.role !==
            'system',
        )
        .map(
          (
            message: ChatMessage,
          ) => ({
            role:
              message.role ===
              'assistant'
                ? 'model'
                : 'user',

            parts: [
              {
                text:
                  message.content,
              },
            ],
          }),
        );

    const body:
      Record<string, unknown> = {
        contents,

        generationConfig: {
          temperature:
            options.temperature ??
            0.4,

          maxOutputTokens:
            options.maxTokens ??
            4_096,

          ...(options.json
            ? {
                responseMimeType:
                  'application/json',
              }
            : {}),
        },
      };

    if (
      systemInstruction
    ) {
      body.systemInstruction = {
        parts: [
          {
            text:
              systemInstruction,
          },
        ],
      };
    }

    const encodedModel =
      encodeURIComponent(
        env.GEMINI_MODEL,
      );

    const { data } =
      await axios.post<GeminiResponse>(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent`,

        body,

        {
          params: {
            key:
              apiKey,
          },

          headers: {
            'Content-Type':
              'application/json',
          },

          timeout:
            90_000,
        },
      );

    const blockedReason =
      data.promptFeedback
        ?.blockReason;

    if (blockedReason) {
      throw new Error(
        `Gemini bloqueou a solicitação: ${blockedReason}.`,
      );
    }

    const content =
      data.candidates?.[0]
        ?.content?.parts
        ?.map(
          (
            part,
          ): string =>
            typeof part.text ===
            'string'
              ? part.text
              : '',
        )
        .join('')
        .trim() ?? '';

    if (!content) {
      const finishReason =
        data.candidates?.[0]
          ?.finishReason;

      throw new Error(
        finishReason
          ? `Gemini não retornou texto. Motivo: ${finishReason}.`
          : 'Gemini não retornou texto.',
      );
    }

    const prompt =
      this.safeNumber(
        data.usageMetadata
          ?.promptTokenCount,
      );

    const completion =
      this.safeNumber(
        data.usageMetadata
          ?.candidatesTokenCount,
      );

    return {
      content,

      model:
        data.modelVersion ??
        env.GEMINI_MODEL,

      provider:
        'gemini',

      usage: {
        prompt,
        completion,

        total:
          this.safeNumber(
            data.usageMetadata
              ?.totalTokenCount,
          ) ||
          prompt +
            completion,
      },
    };
  }

  /**
   * Groq — endpoint compatível com Chat Completions.
   */
  private async groq(
    messages: ChatMessage[],
    options: ChatOptions,
  ): Promise<ChatResult> {
    const apiKey =
      env.GROQ_API_KEY.trim();

    if (!apiKey) {
      throw new Error(
        'GROQ_API_KEY não configurada.',
      );
    }

    const body:
      Record<string, unknown> = {
        model:
          env.GROQ_MODEL,

        messages,

        temperature:
          options.temperature ??
          0.4,

        max_tokens:
          options.maxTokens ??
          4_096,
      };

    if (
      options.json
    ) {
      body.response_format = {
        type:
          'json_object',
      };
    }

    const { data } =
      await axios.post<OpenAiCompatibleResponse>(
        'https://api.groq.com/openai/v1/chat/completions',

        body,

        {
          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            'Content-Type':
              'application/json',
          },

          timeout:
            90_000,
        },
      );

    return this.parseOpenAiCompatibleResult(
      data,
      'groq',
      env.GROQ_MODEL,
    );
  }

  /**
   * OpenRouter.
   */
  private async openRouter(
    messages: ChatMessage[],
    options: ChatOptions,
  ): Promise<ChatResult> {
    const apiKey =
      env.OPENROUTER_API_KEY.trim();

    if (!apiKey) {
      throw new Error(
        'OPENROUTER_API_KEY não configurada.',
      );
    }

    const body:
      Record<string, unknown> = {
        model:
          env.OPENROUTER_MODEL,

        messages,

        temperature:
          options.temperature ??
          0.4,

        max_tokens:
          options.maxTokens ??
          4_096,
      };

    /*
     * Alguns modelos gratuitos podem não suportar
     * response_format. A instrução textual já exige JSON,
     * então evitamos limitar o roteador gratuito.
     */
    const { data } =
      await axios.post<OpenAiCompatibleResponse>(
        'https://openrouter.ai/api/v1/chat/completions',

        body,

        {
          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            'Content-Type':
              'application/json',

            'HTTP-Referer':
              env.OPENROUTER_SITE_URL,

            'X-Title':
              env.OPENROUTER_APP_NAME,
          },

          timeout:
            120_000,
        },
      );

    return this.parseOpenAiCompatibleResult(
      data,
      'openrouter',
      env.OPENROUTER_MODEL,
    );
  }

  /**
   * OpenAI.
   */
  private async openAi(
    messages: ChatMessage[],
    options: ChatOptions,
  ): Promise<ChatResult> {
    const apiKey =
      env.OPENAI_API_KEY.trim();

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY não configurada.',
      );
    }

    const body:
      Record<string, unknown> = {
        model:
          env.OPENAI_MODEL,

        messages,

        temperature:
          options.temperature ??
          0.4,

        max_tokens:
          options.maxTokens ??
          4_096,
      };

    if (
      options.json
    ) {
      body.response_format = {
        type:
          'json_object',
      };
    }

    const { data } =
      await axios.post<OpenAiCompatibleResponse>(
        'https://api.openai.com/v1/chat/completions',

        body,

        {
          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            'Content-Type':
              'application/json',
          },

          timeout:
            90_000,
        },
      );

    return this.parseOpenAiCompatibleResult(
      data,
      'openai',
      env.OPENAI_MODEL,
    );
  }

  /**
   * Anthropic.
   */
  private async anthropic(
    messages: ChatMessage[],
    options: ChatOptions,
  ): Promise<ChatResult> {
    const apiKey =
      env.ANTHROPIC_API_KEY.trim();

    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY não configurada.',
      );
    }

    const system =
      messages
        .filter(
          (
            message: ChatMessage,
          ): boolean =>
            message.role ===
            'system',
        )
        .map(
          (
            message: ChatMessage,
          ): string =>
            message.content,
        )
        .join('\n\n');

    const userMessages =
      messages
        .filter(
          (
            message: ChatMessage,
          ): boolean =>
            message.role !==
            'system',
        )
        .map(
          (
            message: ChatMessage,
          ) => ({
            role:
              message.role,

            content:
              message.content,
          }),
        );

    const { data } =
      await axios.post<AnthropicResponse>(
        'https://api.anthropic.com/v1/messages',

        {
          model:
            env.ANTHROPIC_MODEL,

          system:
            system ||
            undefined,

          max_tokens:
            options.maxTokens ??
            4_096,

          temperature:
            options.temperature ??
            0.4,

          messages:
            userMessages,
        },

        {
          headers: {
            'x-api-key':
              apiKey,

            'anthropic-version':
              '2023-06-01',

            'Content-Type':
              'application/json',
          },

          timeout:
            90_000,
        },
      );

    const content =
      data.content
        ?.filter(
          (
            block,
          ): boolean =>
            block.type ===
              'text' &&
            typeof block.text ===
              'string',
        )
        .map(
          (
            block,
          ): string =>
            block.text ??
            '',
        )
        .join('')
        .trim() ?? '';

    const prompt =
      this.safeNumber(
        data.usage
          ?.input_tokens,
      );

    const completion =
      this.safeNumber(
        data.usage
          ?.output_tokens,
      );

    return {
      content,

      model:
        data.model ??
        env.ANTHROPIC_MODEL,

      provider:
        'anthropic',

      usage: {
        prompt,
        completion,
        total:
          prompt +
          completion,
      },
    };
  }

  /**
   * Ollama local.
   */
  private async ollama(
    messages: ChatMessage[],
    options: ChatOptions,
  ): Promise<ChatResult> {
    const { data } =
      await axios.post(
        `${env.OLLAMA_BASE_URL}/api/chat`,

        {
          model:
            env.OLLAMA_MODEL,

          messages,

          stream:
            false,

          format:
            options.json
              ? 'json'
              : undefined,

          options: {
            temperature:
              options.temperature ??
              0.4,

            num_predict:
              options.maxTokens ??
              4_096,
          },
        },

        {
          timeout:
            120_000,
        },
      );

    return {
      content:
        typeof data?.message
          ?.content ===
        'string'
          ? data.message.content
          : '',

      model:
        data?.model ??
        env.OLLAMA_MODEL,

      provider:
        'ollama',
    };
  }

  private parseOpenAiCompatibleResult(
    data: OpenAiCompatibleResponse,
    provider: AiProvider,
    fallbackModel: string,
  ): ChatResult {
    const content =
      data.choices?.[0]
        ?.message?.content ??
      '';

    const prompt =
      this.safeNumber(
        data.usage
          ?.prompt_tokens,
      );

    const completion =
      this.safeNumber(
        data.usage
          ?.completion_tokens,
      );

    return {
      content,

      model:
        data.model ??
        fallbackModel,

      provider,

      usage: {
        prompt,
        completion,

        total:
          this.safeNumber(
            data.usage
              ?.total_tokens,
          ) ||
          prompt +
            completion,
      },
    };
  }

  private isProviderConfigured(
    provider: AiProvider,
  ): boolean {
    switch (provider) {
      case 'gemini':
        return Boolean(
          env.GEMINI_API_KEY.trim(),
        );

      case 'groq':
        return Boolean(
          env.GROQ_API_KEY.trim(),
        );

      case 'openrouter':
        return Boolean(
          env.OPENROUTER_API_KEY.trim(),
        );

      case 'openai':
        return Boolean(
          env.OPENAI_API_KEY.trim(),
        );

      case 'anthropic':
        return Boolean(
          env.ANTHROPIC_API_KEY.trim(),
        );

      case 'ollama':
        return (
          env.AI_PROVIDER ===
          'ollama'
        );

      default:
        return false;
    }
  }

  private normalizeMessages(
    messages: ChatMessage[],
  ): ChatMessage[] {
    return messages
      .filter(
        (
          message: ChatMessage,
        ): boolean =>
          Boolean(
            message &&
              typeof message.content ===
                'string' &&
              message.content.trim(),
          ),
      )
      .map(
        (
          message: ChatMessage,
        ): ChatMessage => ({
          role:
            message.role,

          content:
            message.content.trim(),
        }),
      );
  }

  private ensureJsonInstruction(
    messages: ChatMessage[],
  ): ChatMessage[] {
    const instruction =
      [
        'Responda exclusivamente com um objeto JSON válido.',
        'Não use blocos Markdown.',
        'Não escreva explicações antes ou depois do JSON.',
        'Use aspas duplas em nomes de campos e textos.',
      ].join(' ');

    const hasSystemMessage =
      messages.some(
        (
          message: ChatMessage,
        ): boolean =>
          message.role ===
          'system',
      );

    if (
      hasSystemMessage
    ) {
      return messages.map(
        (
          message: ChatMessage,
        ): ChatMessage =>
          message.role ===
          'system'
            ? {
                ...message,

                content:
                  `${message.content}\n\n${instruction}`,
              }
            : message,
      );
    }

    return [
      {
        role:
          'system',

        content:
          instruction,
      },

      ...messages,
    ];
  }

  private cleanJsonContent(
    content: string,
  ): string {
    return content
      .trim()
      .replace(
        /^```(?:json)?\s*/i,
        '',
      )
      .replace(
        /\s*```$/,
        '',
      )
      .trim();
  }

  /**
   * Extrai o primeiro objeto JSON equilibrando chaves.
   * É mais seguro que uma expressão regular gulosa.
   */
  private extractJsonObject(
    content: string,
  ): string | null {
    const start =
      content.indexOf('{');

    if (start < 0) {
      return null;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (
      let index = start;
      index < content.length;
      index += 1
    ) {
      const character =
        content[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (
        character === '\\' &&
        inString
      ) {
        escaped = true;
        continue;
      }

      if (
        character === '"'
      ) {
        inString =
          !inString;

        continue;
      }

      if (inString) {
        continue;
      }

      if (
        character === '{'
      ) {
        depth += 1;
      } else if (
        character === '}'
      ) {
        depth -= 1;

        if (depth === 0) {
          return content.slice(
            start,
            index + 1,
          );
        }
      }
    }

    return null;
  }

  private uniqueProviders(
    providers: AiProvider[],
  ): AiProvider[] {
    return Array.from(
      new Set<AiProvider>(
        providers,
      ),
    );
  }

  private safeNumber(
    value: unknown,
  ): number {
    const numeric =
      Number(value ?? 0);

    return Number.isFinite(
      numeric,
    )
      ? Math.max(
          numeric,
          0,
        )
      : 0;
  }

  private getErrorMessage(
    error: unknown,
  ): string {
    if (
      axios.isAxiosError(
        error,
      )
    ) {
      return this.getAxiosErrorMessage(
        error,
      );
    }

    if (
      error instanceof Error
    ) {
      return error.message;
    }

    return String(error);
  }

  private getAxiosErrorMessage(
    error: AxiosError,
  ): string {
    const responseData:
      any =
      error.response?.data;

    const providerMessage =
      responseData?.error
        ?.message ??
      responseData?.message ??
      responseData?.error ??
      error.message;

    const status =
      error.response?.status;

    if (status) {
      return `HTTP ${status}: ${String(
        providerMessage,
      ).slice(0, 1_000)}`;
    }

    return String(
      providerMessage,
    ).slice(0, 1_000);
  }
}

export const aiService =
  new AiService();
