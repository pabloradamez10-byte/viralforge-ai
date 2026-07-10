/**
 * Fallback determinístico para gerar roteiros faceless sem LLM.
 * Garante que o sistema sempre produza um roteiro ORIGINAL e funcional.
 *
 * O conteúdo é SEMPRE novo — usa apenas o título como semente semântica.
 */

import type { FacelessScript, GenerateFacelessDto } from './faceless.dto.js';

export function generateFallbackFaceless(dto: GenerateFacelessDto): FacelessScript {
  const topic = extractTopic(dto.sourceTitle);
  const angle = pickAngle(dto.tone);
  const duration = durationMap(dto.targetDuration);

  const hook = buildHook(topic, dto.tone);
  const scenes = buildScenes(topic, angle, duration.totalSec);
  const narration = scenes.map((s) => s.voiceover).join(' ');
  const captions = buildCaptions(scenes);
  const hashtags = buildHashtags(dto.niche ?? topic, dto.tone);
  const cta = buildCta(dto.tone);
  const keywords = buildKeywords(topic);
  const thumbnailSuggestion = buildThumbnail(topic, angle);

  return {
    title: `O que ninguém te contou sobre ${topic}`,
    hook,
    narration,
    scenes,
    captions,
    hashtags,
    cta,
    keywords,
    thumbnailSuggestion,
    estimatedDurationSec: duration.totalSec,
    language: dto.language,
  };
}

function extractTopic(title: string): string {
  // remove palavras irrelevantes, mantém o núcleo semântico
  const stop = new Set([
    'a', 'o', 'as', 'os', 'de', 'da', 'do', 'em', 'para', 'com', 'e', 'é', 'no', 'na', 'um', 'uma',
    'how', 'to', 'the', 'why', 'what', 'i', 'you', 'your', 'is', 'are', 'on', 'in', 'of',
  ]);
  const words = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w));
  const topic = words.slice(0, 4).join(' ').trim();
  return topic || 'este tema';
}

function pickAngle(tone: GenerateFacelessDto['tone']): string {
  return (
    {
      curioso: 'curiosidade',
      educativo: 'aprendizado',
      polêmico: 'controvérsia',
      storytelling: 'história',
      humor: 'humor',
    }[tone] ?? 'curiosidade'
  );
}

function durationMap(d: GenerateFacelessDto['targetDuration']) {
  if (d === 'short') return { totalSec: 45, perScene: 6 };
  if (d === 'medium') return { totalSec: 180, perScene: 12 };
  return { totalSec: 540, perScene: 22 };
}

function buildHook(topic: string, tone: GenerateFacelessDto['tone']): string {
  const hooks: Record<string, string[]> = {
    curioso: [
      `Você provavelmente nunca reparou nisso sobre ${topic}.`,
      `A maioria das pessoas erra feio quando o assunto é ${topic}.`,
      `Em 30 segundos eu te mostro algo que vai mudar como você vê ${topic}.`,
    ],
    educativo: [
      `Se você quer entender ${topic} de verdade, presta atenção nessa explicação rápida.`,
      `Vou te ensinar o essencial sobre ${topic} em poucos minutos.`,
    ],
    polêmico: [
      `Ninguém quer admitir isso sobre ${topic}, mas a verdade é essa.`,
      `Eu vou falar o que ninguém tem coragem de falar sobre ${topic}.`,
    ],
    storytelling: [
      `Tudo começou com um detalhe que ninguém notou. Hoje eu vou te contar a história de ${topic}.`,
      `Era uma vez um erro simples envolvendo ${topic}. O resultado? Você vai se surpreender.`,
    ],
    humor: [
      `Imagina você no meio de uma conversa sobre ${topic} e todo mundo te olhando torto. Assista até o final.`,
      `Se ${topic} fosse uma pessoa, com certeza seria aquela que aparece no momento errado.`,
    ],
  };
  const arr = hooks[tone] ?? hooks.curioso!;
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function buildScenes(topic: string, angle: string, totalSec: number): FacelessScript['scenes'] {
  const perScene = totalSec <= 60 ? 6 : totalSec <= 200 ? 12 : 22;
  const sceneCount = Math.max(4, Math.min(8, Math.round(totalSec / perScene)));

  const templates: Record<string, string[]> = {
    curiosidade: [
      'Tela com texto em destaque + imagens relacionadas ao tema',
      'Corte rápido para estatística ou dado curioso',
      'Comparação visual lado a lado',
      'Padrão visual chamativo para reforçar a ideia',
      'Tela com pergunta provocativa',
      'Cena final com call to action',
    ],
    aprendizado: [
      'Slide com o conceito principal',
      'Animação simples explicando o ponto-chave',
      'Exemplo visual prático',
      'Resumo dos aprendizados',
    ],
    controvérsia: [
      'Citação polêmica em destaque',
      'Cenário do "antes" e "depois"',
      'Argumento contra + argumento a favor',
      'Conclusão que surpreende',
    ],
    história: [
      'Cena de abertura estilo cinema',
      'Marcos visuais da narrativa',
      'Ponto de virada da história',
      'Desfecho',
    ],
    humor: [
      'Meme inicial para quebrar o gelo',
      'Sequência rápida de situações engraçadas',
      'Plot twist cômico',
      'Punchline final',
    ],
  };
  const visuals = templates[angle] ?? templates.curiosidade!;
  const scenes: FacelessScript['scenes'] = [];
  for (let i = 0; i < sceneCount; i++) {
    const visual = visuals[i % visuals.length]!;
    const voiceover = makeVoiceoverForScene(topic, i, sceneCount, angle);
    scenes.push({
      order: i + 1,
      name: `Cena ${i + 1}`,
      visual,
      voiceover,
      durationSec: Math.round(totalSec / sceneCount),
    });
  }
  return scenes;
}

function makeVoiceoverForScene(topic: string, idx: number, total: number, angle: string): string {
  if (idx === 0) return `Você já parou pra pensar em ${topic}?`;
  if (idx === total - 1) return `Se isso fez sentido, fica até o final e me segue pra mais.`;
  const middle = [
    `O ponto é que ${topic} tem um detalhe que muita gente ignora.`,
    `A maioria erra porque confunde causa com consequência em ${topic}.`,
    `Existe um padrão por trás de ${topic} que quase ninguém comenta.`,
    `Quando você entende isso, ${topic} deixa de ser confuso.`,
  ];
  if (angle === 'humor') {
    return `E o pior: quanto mais você tenta explicar ${topic}, mais a cara do pessoal fecha.`;
  }
  return middle[idx % middle.length]!;
}

function buildCaptions(scenes: FacelessScript['scenes']): string {
  // SRT-like simples: 1\n00:00:00,000 --> 00:00:05,000\ntexto\n\n
  const blocks: string[] = [];
  let cursor = 0;
  scenes.forEach((s, i) => {
    const start = formatSrt(cursor);
    cursor += s.durationSec;
    const end = formatSrt(cursor);
    blocks.push(`${i + 1}\n${start} --> ${end}\n${s.voiceover}\n`);
  });
  return blocks.join('\n');
}

function formatSrt(sec: number): string {
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  const ms = '000';
  return `${h}:${m}:${s},${ms}`;
}

function buildHashtags(niche: string, tone: GenerateFacelessDto['tone']): string[] {
  const base = ['#viralforge', '#conteudo', '#aprenda', '#dicas'];
  const t = niche.toLowerCase().replace(/\s+/g, '');
  const out = new Set<string>(base);
  out.add(`#${t}`);
  if (tone === 'humor') out.add('#humor');
  if (tone === 'educativo') out.add('#educação');
  if (tone === 'polêmico') out.add('#opinião');
  out.add('#shorts');
  out.add('#reels');
  return Array.from(out).slice(0, 10);
}

function buildCta(tone: GenerateFacelessDto['tone']): string {
  const ctas: Record<string, string> = {
    curioso: 'Se você quer ver o próximo vídeo antes de todo mundo, já deixa o follow e ativa o sino.',
    educativo: 'Salva esse vídeo pra assistir de novo e compartilha com alguém que precisa ver.',
    polêmico: 'Comenta aqui o que você acha. Eu leio tudo.',
    storytelling: 'Inscreva-se pra não perder a próxima história.',
    humor: 'Marca aqui aquele amigo que precisa rir disso.',
  };
  return ctas[tone] ?? ctas.curioso!;
}

function buildKeywords(topic: string): string[] {
  return [
    topic,
    `${topic} dicas`,
    `${topic} tutorial`,
    `${topic} o que é`,
    `${topic} como funciona`,
    `${topic} 2025`,
  ];
}

function buildThumbnail(topic: string, _angle: string): string {
  return `Rosto de fundo desfocado + texto grande em destaque "${topic.toUpperCase()}" + seta amarela apontando para o lado +表情 emoji relacionado`;
}
