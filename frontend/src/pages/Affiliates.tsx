import { BarChart3, CalendarDays, Film, ShoppingBag } from 'lucide-react';

const steps = [
  { icon: ShoppingBag, title: 'Escolher produtos', text: 'Selecione os produtos afiliados com maior potencial.' },
  { icon: Film, title: 'Criar campanha', text: 'Gere variações de vídeos, roteiros, narrações e chamadas.' },
  { icon: CalendarDays, title: 'Organizar 9 dias', text: 'Distribua seis vídeos diários em um calendário simples.' },
  { icon: BarChart3, title: 'Aprender com vendas', text: 'Compare cliques e conversões para melhorar o próximo ciclo.' },
];

export default function Affiliates() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-600/20 via-slate-900 to-slate-950 p-5 sm:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
            <ShoppingBag size={14} /> Novo módulo
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">ViralForge Afiliados</h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-300">
            Encontre oportunidades, transforme produtos em campanhas de vídeo e acompanhe quais conteúdos realmente geram vendas.
          </p>
          <div className="mt-5 inline-flex rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-400">
            Estrutura inicial pronta · conexão com a primeira plataforma será a próxima fase
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-100">Como funcionará</h2>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/15 text-violet-300"><Icon size={19} /></div>
                <span className="text-xs font-semibold text-slate-600">0{index + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold text-slate-100">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
