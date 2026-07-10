/**
 * Exporters — geram arquivos texto para download/cópia manual.
 * Formatos suportados: txt, json, srt, markdown.
 */

import type { FacelessScript } from '../faceless/faceless.dto.js';

export function exportScript(script: any, format: 'txt' | 'json' | 'srt' | 'markdown'): string {
  switch (format) {
    case 'json':
      return JSON.stringify(script, null, 2);
    case 'srt':
      return script.captions ?? '';
    case 'markdown':
      return toMarkdown(script);
    case 'txt':
    default:
      return toTxt(script);
  }
}

function toTxt(s: any): string {
  const lines: string[] = [];
  lines.push(`# ${s.title ?? ''}`);
  lines.push('');
  lines.push(`## Hook`);
  lines.push(s.hook ?? '');
  lines.push('');
  lines.push(`## Narração`);
  lines.push(s.narration ?? '');
  lines.push('');
  lines.push(`## Cenas`);
  for (const scene of s.scenes ?? []) {
    lines.push(`[${scene.order}] ${scene.name} (${scene.durationSec}s)`);
    lines.push(`  Visual: ${scene.visual}`);
    lines.push(`  Voz:   ${scene.voiceover}`);
  }
  lines.push('');
  lines.push(`## CTA`);
  lines.push(s.cta ?? '');
  lines.push('');
  lines.push(`## Hashtags`);
  lines.push((s.hashtags ?? []).map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' '));
  lines.push('');
  lines.push(`## Palavras-chave`);
  lines.push((s.keywords ?? []).join(', '));
  lines.push('');
  lines.push(`## Sugestão de Thumbnail`);
  lines.push(s.thumbnailSuggestion ?? '');
  return lines.join('\n');
}

function toMarkdown(s: any): string {
  const lines: string[] = [];
  lines.push(`# ${s.title ?? ''}`);
  lines.push('');
  lines.push(`> **Hook:** ${s.hook ?? ''}`);
  lines.push('');
  lines.push(`## 🎙️ Narração`);
  lines.push(s.narration ?? '');
  lines.push('');
  lines.push(`## 🎬 Cenas`);
  for (const scene of s.scenes ?? []) {
    lines.push(`### ${scene.order}. ${scene.name} — ${scene.durationSec}s`);
    lines.push(`- **Visual:** ${scene.visual}`);
    lines.push(`- **Voz:** ${scene.voiceover}`);
  }
  lines.push('');
  lines.push(`## 📣 CTA`);
  lines.push(s.cta ?? '');
  lines.push('');
  lines.push(`## 🏷️ Hashtags`);
  lines.push((s.hashtags ?? []).map((h: string) => `\`${h.startsWith('#') ? h : '#' + h}\``).join(' '));
  lines.push('');
  lines.push(`## 🔑 Palavras-chave`);
  lines.push((s.keywords ?? []).map((k: string) => `\`${k}\``).join(' '));
  lines.push('');
  lines.push(`## 🖼️ Thumbnail`);
  lines.push(s.thumbnailSuggestion ?? '');
  lines.push('');
  lines.push(`---`);
  lines.push(`*Duração estimada: ${s.estimatedDurationSec ?? '?'}s • Idioma: ${s.language ?? 'pt-BR'}*`);
  return lines.join('\n');
}
