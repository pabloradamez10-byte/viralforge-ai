import { useEffect, useMemo, useRef, useState } from 'react';
import { Captions, Download, Film, Mic2, Scissors, Sparkles, Upload, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type JobStatus = 'PENDING' | 'ANALYZING' | 'TRANSCRIBING' | 'SELECTING' | 'GENERATING_AUDIO' | 'CUTTING' | 'COMPLETED' | 'FAILED';
type AudioMode = 'original' | 'rewrite' | 'custom';

type Voice = 'alloy' | 'ash' | 'coral' | 'echo' | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer';

interface SmartClipItem {
  id: string;
  order: number;
  startSec: number;
  durationSec: number;
  filename: string;
  downloadUrl: string;
  title: string;
  score: number;
  transcript: string;
  script?: string;
  audioMode: AudioMode;
}

interface SmartClipJob {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  originalFilename: string;
  sourceDurationSec?: number;
  transcript?: string;
  clips: SmartClipItem[];
  error?: string;
}

const voices: Array<{ value: Voice; label: string }> = [
  { value: 'onyx', label: 'Antônio · masculino' },
  { value: 'nova', label: 'Francisca · feminino' },
  { value: 'ash', label: 'Antônio · direto' },
  { value: 'coral', label: 'Francisca · natural' },
];

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

export default function SmartClips() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [clipCount, setClipCount] = useState(3);
  const [durationSec, setDurationSec] = useState(30);
  const [audioMode, setAudioMode] = useState<AudioMode>('original');
  const [voice, setVoice] = useState<Voice>('onyx');
  const [customScript, setCustomScript] = useState('');
  const [captions, setCaptions] = useState(true);
  const [removeSilence, setRemoveSilence] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<SmartClipJob | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  const generatedClips = job?.clips ?? [];

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (!job || ['COMPLETED', 'FAILED'].includes(job.status)) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await api.get<{ data: SmartClipJob }>(`/smart-clips/${job.id}`);
        setJob(response.data.data);
      } catch {
        window.clearInterval(timer);
        toast.error('Não foi possível acompanhar o processamento.');
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status]);

  async function uploadVideo() {
    if (!file) {
      toast.error('Escolha um vídeo primeiro.');
      return;
    }
    if (file.size > 300 * 1024 * 1024) {
      toast.error('O limite atual é 300 MB.');
      return;
    }
    if (audioMode === 'custom' && !customScript.trim()) {
      toast.error('Cole o seu roteiro antes de gerar.');
      return;
    }

    setUploading(true);
    setJob(null);
    try {
      const params = new URLSearchParams({
        clips: String(clipCount),
        durationSec: String(durationSec),
        audioMode,
        voice,
        captions: String(captions),
        removeSilence: String(removeSilence),
      });
      const response = await api.post<{ data: SmartClipJob }>(
        `/smart-clips/upload?${params.toString()}`,
        file,
        {
          timeout: 10 * 60_000,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-File-Name': encodeURIComponent(file.name),
            ...(audioMode === 'custom' ? { 'X-Custom-Script': encodeBase64(customScript) } : {}),
          },
        },
      );
      setJob(response.data.data);
      toast.success('Upload concluído. A edição inteligente começou.');
    } catch (error) {
      console.error(error);
      toast.error('Falha ao enviar o vídeo.');
    } finally {
      setUploading(false);
    }
  }

  async function downloadClip(clip: SmartClipItem) {
    try {
      const response = await api.get(clip.downloadUrl.replace('/api/v1', ''), {
        responseType: 'blob', timeout: 5 * 60_000,
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = clip.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Falha ao baixar o corte.');
    }
  }

  const busy = uploading || (!!job && !['COMPLETED', 'FAILED'].includes(job.status));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-violet-600/20 border border-violet-500/30 grid place-items-center">
          <Scissors className="text-violet-300" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Smart Clips</h1>
          <p className="text-sm text-slate-400">Transcreve, encontra os melhores momentos, cria roteiro, voz e legendas.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-5">
          <button type="button" onClick={() => inputRef.current?.click()} className="w-full min-h-48 rounded-xl border-2 border-dashed border-slate-700 hover:border-violet-500 bg-slate-950/60 transition grid place-items-center p-6">
            <div className="text-center space-y-3">
              <Upload className="mx-auto text-violet-300" size={34} />
              <div className="font-semibold">Clique para escolher o vídeo</div>
              <div className="text-xs text-slate-500">MP4, MOV, M4V ou WEBM · até 300 MB</div>
              {file && <div className="text-sm text-emerald-300">{file.name}</div>}
            </div>
          </button>
          <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/x-m4v,video/webm" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          {previewUrl && <video src={previewUrl} controls className="w-full max-h-80 rounded-xl bg-black" />}

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Quantidade de cortes</span>
              <select value={clipCount} onChange={(event) => setClipCount(Number(event.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                {[1, 3, 5, 8, 10].map((value) => <option key={value} value={value}>{value} cortes</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Duração aproximada</span>
              <select value={durationSec} onChange={(event) => setDurationSec(Number(event.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                {[15, 30, 45, 60].map((value) => <option key={value} value={value}>{value} segundos</option>)}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-sm text-slate-300">Áudio e roteiro</span>
            <div className="grid sm:grid-cols-3 gap-2">
              {([
                ['original', 'Voz original', Volume2],
                ['rewrite', 'IA reescreve + voz', Sparkles],
                ['custom', 'Meu roteiro + voz', Mic2],
              ] as const).map(([value, label, Icon]) => (
                <button key={value} type="button" onClick={() => setAudioMode(value)} className={`rounded-lg border px-3 py-3 text-sm flex items-center justify-center gap-2 transition ${audioMode === value ? 'border-violet-500 bg-violet-500/15 text-violet-200' : 'border-slate-700 bg-slate-950 text-slate-400'}`}>
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          </div>

          {audioMode !== 'original' && (
            <label className="space-y-2 block">
              <span className="text-sm text-slate-300">Voz sintética</span>
              <select value={voice} onChange={(event) => setVoice(event.target.value as Voice)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                {voices.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          )}

          {audioMode === 'custom' && (
            <label className="space-y-2 block">
              <span className="text-sm text-slate-300">Seu roteiro</span>
              <textarea value={customScript} onChange={(event) => setCustomScript(event.target.value)} rows={8} placeholder="Cole o roteiro. Para usar um texto diferente em cada corte, separe os blocos com uma linha contendo ---" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm" />
            </label>
          )}

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-3">
              <input type="checkbox" checked={captions} onChange={(event) => setCaptions(event.target.checked)} />
              <Captions size={17} className="text-violet-300" /> Legendas automáticas
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-3">
              <input type="checkbox" checked={removeSilence} onChange={(event) => setRemoveSilence(event.target.checked)} />
              <Volume2 size={17} className="text-violet-300" /> Reduzir silêncios
            </label>
          </div>

          <button type="button" disabled={!file || busy} onClick={uploadVideo} className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 font-semibold transition">
            {uploading ? 'Enviando vídeo...' : busy ? 'Processando...' : 'Gerar Smart Clips completos'}
          </button>
        </section>

        <aside className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Film size={18} /> Pipeline completo</h2>
          <div className="space-y-3 text-sm text-slate-400">
            <div>1. Transcrição com timestamps.</div>
            <div>2. IA escolhe os melhores momentos.</div>
            <div>3. Crop vertical e redução de silêncios.</div>
            <div>4. Áudio original, roteiro reescrito ou roteiro próprio.</div>
            <div>5. Nova voz e legendas sincronizadas.</div>
          </div>

          {job && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex justify-between gap-3 text-sm"><span>{job.message}</span><span className="text-violet-300">{job.progress}%</span></div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-violet-500 transition-all" style={{ width: `${job.progress}%` }} /></div>
              {job.error && <div className="text-sm text-red-300 break-words">{job.error}</div>}
              {job.sourceDurationSec && <div className="text-xs text-slate-500">Vídeo original: {Math.round(job.sourceDurationSec)} segundos</div>}
              {job.transcript && <details className="text-xs text-slate-400"><summary className="cursor-pointer text-slate-300">Ver transcrição</summary><p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">{job.transcript}</p></details>}
            </div>
          )}
        </aside>
      </div>

      {generatedClips.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Cortes gerados</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {generatedClips.map((clip) => (
              <div key={clip.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div><div className="font-semibold">{clip.title || `Corte ${clip.order}`}</div><div className="text-xs text-slate-500">Corte {clip.order} · início {clip.startSec}s · {clip.durationSec}s</div></div>
                  <span className="shrink-0 rounded-full bg-emerald-500/15 text-emerald-300 px-2 py-1 text-xs">{clip.score}/100</span>
                </div>
                {clip.transcript && <details className="text-xs text-slate-400"><summary className="cursor-pointer">Fala original</summary><p className="mt-2">{clip.transcript}</p></details>}
                {clip.script && <details className="text-xs text-slate-400"><summary className="cursor-pointer">Roteiro usado</summary><p className="mt-2">{clip.script}</p></details>}
                <button type="button" onClick={() => downloadClip(clip)} className="w-full flex items-center justify-center gap-2 rounded-lg border border-violet-500/40 text-violet-200 hover:bg-violet-500/10 px-3 py-2">
                  <Download size={16} /> Baixar MP4
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
