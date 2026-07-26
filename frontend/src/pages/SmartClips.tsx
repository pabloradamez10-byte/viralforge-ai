import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Film, Scissors, Upload, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type JobStatus = 'PENDING' | 'ANALYZING' | 'CUTTING' | 'COMPLETED' | 'FAILED';

interface SmartClipItem {
  id: string;
  order: number;
  startSec: number;
  durationSec: number;
  filename: string;
  downloadUrl: string;
}

interface SmartClipJob {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  originalFilename: string;
  sourceDurationSec?: number;
  clips: SmartClipItem[];
  error?: string;
}

export default function SmartClips() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [clipCount, setClipCount] = useState(3);
  const [durationSec, setDurationSec] = useState(30);
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<SmartClipJob | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  const generatedClips = job?.clips ?? [];

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
      toast.error('Nesta primeira versão, o limite é 300 MB.');
      return;
    }

    setUploading(true);
    setJob(null);
    try {
      const response = await api.post<{ data: SmartClipJob }>(
        `/smart-clips/upload?clips=${clipCount}&durationSec=${durationSec}`,
        file,
        {
          timeout: 10 * 60_000,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-File-Name': encodeURIComponent(file.name),
          },
        },
      );
      setJob(response.data.data);
      toast.success('Upload concluído. Criando os cortes...');
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
        responseType: 'blob',
        timeout: 5 * 60_000,
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-600/20 border border-violet-500/30 grid place-items-center">
            <Scissors className="text-violet-300" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Smart Clips</h1>
            <p className="text-sm text-slate-400">Envie um vídeo longo e receba cortes verticais prontos para testar.</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full min-h-52 rounded-xl border-2 border-dashed border-slate-700 hover:border-violet-500 bg-slate-950/60 transition grid place-items-center p-6"
          >
            <div className="text-center space-y-3">
              <Upload className="mx-auto text-violet-300" size={34} />
              <div className="font-semibold">Clique para escolher o vídeo</div>
              <div className="text-xs text-slate-500">MP4, MOV, M4V ou WEBM · até 300 MB</div>
              {file && <div className="text-sm text-emerald-300">{file.name}</div>}
            </div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-m4v,video/webm"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />

          {previewUrl && (
            <video src={previewUrl} controls className="w-full max-h-80 rounded-xl bg-black" />
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Quantidade de cortes</span>
              <select
                value={clipCount}
                onChange={(event) => setClipCount(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              >
                {[1, 3, 5, 8, 10].map((value) => <option key={value} value={value}>{value} cortes</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Duração aproximada</span>
              <select
                value={durationSec}
                onChange={(event) => setDurationSec(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              >
                {[15, 30, 45, 60].map((value) => <option key={value} value={value}>{value} segundos</option>)}
              </select>
            </label>
          </div>

          <button
            type="button"
            disabled={!file || uploading || (!!job && !['COMPLETED', 'FAILED'].includes(job.status))}
            onClick={uploadVideo}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 font-semibold transition"
          >
            {uploading ? 'Enviando vídeo...' : 'Gerar cortes de teste'}
          </button>
        </section>

        <aside className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Film size={18} /> Primeira versão</h2>
          <div className="space-y-3 text-sm text-slate-400">
            <div className="flex gap-3"><span className="text-violet-300">1.</span><span>Recebe e valida o seu vídeo.</span></div>
            <div className="flex gap-3"><span className="text-violet-300">2.</span><span>Lê a duração e cria cortes distribuídos pelo conteúdo.</span></div>
            <div className="flex gap-3"><span className="text-violet-300">3.</span><span>Converte cada trecho para o formato vertical 9:16.</span></div>
            <div className="flex gap-3"><Volume2 className="shrink-0 text-violet-300" size={17} /><span>Mantém o áudio original nesta etapa. Transcrição, roteiro e nova voz entram na próxima.</span></div>
          </div>

          {job && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex justify-between text-sm">
                <span>{job.message}</span>
                <span className="text-violet-300">{job.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-violet-500 transition-all" style={{ width: `${job.progress}%` }} />
              </div>
              {job.error && <div className="text-sm text-red-300">{job.error}</div>}
              {job.sourceDurationSec && (
                <div className="text-xs text-slate-500">Vídeo original: {Math.round(job.sourceDurationSec)} segundos</div>
              )}
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
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Corte {clip.order}</span>
                  <span className="text-xs text-slate-500">{clip.durationSec}s</span>
                </div>
                <div className="text-xs text-slate-400">Início em {clip.startSec}s</div>
                <button
                  type="button"
                  onClick={() => downloadClip(clip)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-violet-500/40 text-violet-200 hover:bg-violet-500/10 px-3 py-2"
                >
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
