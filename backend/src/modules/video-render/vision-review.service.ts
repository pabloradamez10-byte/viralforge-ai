import { spawn } from 'node:child_process';
import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';
import { env } from '../../config/env.js';

export interface VisionSceneReviewInput {
  sceneOrder: number;
  sceneName?: string;
  visual?: string;
  voiceover?: string;
  searchKeywords?: string[];
  videoFile: string;
  outputDirectory: string;
}

export interface VisionSceneReview {
  enabled: boolean;
  relevant: boolean;
  score: number;
  detectedContent: string;
  reasons: string[];
  recommendedSearchQuery?: string;
}

class VisionReviewService {
  isEnabled(): boolean {
    return Boolean(env.GEMINI_API_KEY?.trim());
  }

  async reviewScene(input: VisionSceneReviewInput): Promise<VisionSceneReview> {
    if (!this.isEnabled()) {
      return { enabled: false, relevant: true, score: 100, detectedContent: 'disabled', reasons: ['vision-disabled'] };
    }

    const frame = await this.extractFrame(input.videoFile, input.outputDirectory, input.sceneOrder);
    const image = await readFile(frame);
    const model = encodeURIComponent(env.GEMINI_MODEL);
    const prompt = `Review this stock-video frame for a faceless short. Scene: ${input.sceneOrder}. Narration: ${this.clean(input.voiceover)}. Intended visual: ${this.clean(input.visual)}. Keywords: ${(input.searchKeywords ?? []).join(', ')}. Be strict: vague similarity is not enough. Return JSON only with relevant(boolean), score(0-100), detectedContent(string), reasons(string[]), recommendedSearchQuery(specific English stock-video query when score < 68).`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: image.toString('base64') } }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 600, responseMimeType: 'application/json' },
      },
      { params: { key: env.GEMINI_API_KEY.trim() }, timeout: 90_000 },
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('').trim();
    if (!text) throw new Error('Gemini Vision returned an empty response.');
    const parsed = this.parseJson(text);
    const score = Math.min(Math.max(Number(parsed.score) || 0, 0), 100);

    return {
      enabled: true,
      relevant: Boolean(parsed.relevant) && score >= 68,
      score,
      detectedContent: this.clean(parsed.detectedContent) || 'not described',
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map((item: unknown) => this.clean(item)).filter(Boolean).slice(0, 6) : [],
      recommendedSearchQuery: this.clean(parsed.recommendedSearchQuery),
    };
  }

  private async extractFrame(videoFile: string, directory: string, order: number): Promise<string> {
    await stat(videoFile);
    await mkdir(directory, { recursive: true });
    const output = path.join(directory, `vision-${String(order).padStart(3, '0')}.jpg`);
    await new Promise<void>((resolve, reject) => {
      const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '1', '-i', videoFile, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '3', output]);
      let stderr = '';
      child.stderr.on('data', (chunk) => { stderr += String(chunk); });
      child.on('error', reject);
      child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Frame extraction failed: ${stderr.slice(-500)}`)));
    });
    await stat(output);
    return output;
  }

  private parseJson(value: string): any {
    const cleaned = value.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    try { return JSON.parse(cleaned); } catch {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
      throw new Error('Gemini Vision returned invalid JSON.');
    }
  }

  private clean(value: unknown): string {
    return typeof value === 'string' ? value.replace(/[\u0000-\u001F]/g, ' ').replace(/\s+/g, ' ').trim() : '';
  }
}

export const visionReviewService = new VisionReviewService();
