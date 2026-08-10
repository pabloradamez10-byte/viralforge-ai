import { FormEvent, useState } from 'react';
import { ExternalLink, Loader2, Pencil, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  AffiliateProduct,
  AffiliateProductInput,
  useAffiliateProducts,
  useCreateAffiliateProduct,
  useDeleteAffiliateProduct,
  useUpdateAffiliateProduct,
} from '@/features/affiliate-products';

const emptyForm: AffiliateProductInput = {
  platform: 'SHOPEE', title: '', productUrl: '', affiliateUrl: '', imageUrl: '', category: '',
  price: undefined, commissionRate: undefined, salesCount: 0, rating: undefined, benefits: '', active: true,
};

function apiError(error: any) {
  return error?.message || 'Não foi possível concluir a operação.';
}

export default function Affiliates() {
  const products = useAffiliateProducts();
  const create = useCreateAffiliateProduct();
  const update = useUpdateAffiliateProduct();
  const remove = useDeleteAffiliateProduct();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<AffiliateProductInput>(emptyForm);

  const filtered = (products.data ?? []).filter((product) =>
    `${product.title} ${product.category ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );

  function openCreate() {
    setEditingId(undefined); setForm(emptyForm); setFormOpen(true);
  }

  function openEdit(product: AffiliateProduct) {
    setEditingId(product.id);
    setForm({
      platform: product.platform, title: product.title, productUrl: product.productUrl,
      affiliateUrl: product.affiliateUrl ?? '', imageUrl: product.imageUrl ?? '', category: product.category ?? '',
      price: product.price ? Number(product.price) : undefined,
      commissionRate: product.commissionRate ? Number(product.commissionRate) : undefined,
      salesCount: product.salesCount, rating: product.rating, benefits: product.benefits ?? '', active: product.active,
    });
    setFormOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (editingId) await update.mutateAsync({ id: editingId, input: form });
      else await create.mutateAsync(form);
      toast.success(editingId ? 'Produto atualizado.' : 'Produto adicionado à biblioteca.');
      setFormOpen(false); setEditingId(undefined); setForm(emptyForm);
    } catch (error) { toast.error(apiError(error)); }
  }

  async function deleteProduct(product: AffiliateProduct) {
    if (!window.confirm(`Excluir “${product.title}” da biblioteca?`)) return;
    try { await remove.mutateAsync(product.id); toast.success('Produto excluído.'); }
    catch (error) { toast.error(apiError(error)); }
  }

  const busy = create.isPending || update.isPending;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <section className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-600/20 via-slate-900 to-slate-950 p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><div className="inline-flex items-center gap-2 text-xs text-violet-200"><ShoppingBag size={14} /> ViralForge Afiliados</div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold">Biblioteca de produtos</h1>
            <p className="mt-2 text-sm text-slate-400">Salve produtos da Shopee para comparar e criar suas primeiras campanhas.</p></div>
          <Button size="lg" onClick={openCreate}><Plus size={17} /> Novo produto</Button>
        </div>
      </section>

      {formOpen && (
        <form onSubmit={submit} className="rounded-2xl border border-violet-500/30 bg-slate-900/80 p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-semibold">{editingId ? 'Editar produto' : 'Adicionar produto da Shopee'}</h2>
            <button type="button" onClick={() => setFormOpen(false)} className="p-2 text-slate-400 hover:text-white"><X size={19} /></button></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome do produto *"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Air Fryer 5 litros" /></Field>
            <Field label="Categoria"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex.: Casa e cozinha" /></Field>
            <Field label="Link normal da Shopee *"><Input required type="url" value={form.productUrl} onChange={(e) => setForm({ ...form, productUrl: e.target.value })} placeholder="https://shopee.com.br/..." /></Field>
            <Field label="Link de afiliado (opcional)"><Input type="url" value={form.affiliateUrl} onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })} placeholder="Preencha após sua aprovação" /></Field>
            <Field label="Link da imagem"><Input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." /></Field>
            <Field label="Preço (R$)"><Input type="number" min="0" step="0.01" value={form.price ?? ''} onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : undefined })} /></Field>
            <Field label="Comissão (%)"><Input type="number" min="0" max="100" step="0.01" value={form.commissionRate ?? ''} onChange={(e) => setForm({ ...form, commissionRate: e.target.value ? Number(e.target.value) : undefined })} /></Field>
            <Field label="Quantidade vendida"><Input type="number" min="0" step="1" value={form.salesCount} onChange={(e) => setForm({ ...form, salesCount: Number(e.target.value) || 0 })} /></Field>
            <Field label="Avaliação (0–5)"><Input type="number" min="0" max="5" step="0.1" value={form.rating ?? ''} onChange={(e) => setForm({ ...form, rating: e.target.value ? Number(e.target.value) : undefined })} /></Field>
            <label className="sm:col-span-2 space-y-1.5 block"><span className="text-xs text-slate-400">Benefícios e observações</span>
              <textarea rows={3} maxLength={1000} value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" placeholder="Principais benefícios, público e argumentos de venda" /></label>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}{editingId ? 'Salvar alterações' : 'Adicionar produto'}</Button></div>
        </form>
      )}

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Seus produtos</h2><p className="text-xs text-slate-500">{products.data?.length ?? 0} produto(s) cadastrado(s)</p></div>
          <div className="relative sm:w-72"><Search size={15} className="absolute left-3 top-3 text-slate-500" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Buscar produto..." /></div>
        </div>

        {products.isLoading ? <div className="py-14 grid place-items-center text-slate-400"><Loader2 className="animate-spin" /></div>
          : products.isError ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">Não foi possível carregar a biblioteca.</div>
          : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 py-12 px-5 text-center"><ShoppingBag className="mx-auto text-slate-600" size={32} /><h3 className="mt-3 font-semibold">{search ? 'Nenhum produto encontrado' : 'Sua biblioteca está vazia'}</h3><p className="mt-1 text-sm text-slate-500">{search ? 'Tente outro termo.' : 'Adicione o primeiro produto para começarmos.'}</p>{!search && <Button className="mt-4" onClick={openCreate}><Plus size={16} /> Adicionar produto</Button>}</div>
          : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
              <div className="aspect-[16/9] bg-slate-950 grid place-items-center overflow-hidden">{product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" /> : <ShoppingBag size={34} className="text-slate-700" />}</div>
              <div className="p-4 space-y-3"><div><span className="text-[10px] font-semibold text-orange-300 bg-orange-500/10 rounded px-2 py-1">SHOPEE</span><h3 className="mt-2 font-semibold leading-snug line-clamp-2">{product.title}</h3><p className="text-xs text-slate-500">{product.category || 'Sem categoria'}</p></div>
                <div className="grid grid-cols-3 gap-2 text-center"><Metric label="Preço" value={product.price ? Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'} /><Metric label="Comissão" value={product.commissionRate ? `${Number(product.commissionRate)}%` : '—'} /><Metric label="Vendidos" value={String(product.salesCount)} /></div>
                <div className="flex gap-2"><a href={product.affiliateUrl || product.productUrl} target="_blank" rel="noreferrer" className="h-9 flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-800"><ExternalLink size={14} /> Abrir</a>
                  <button onClick={() => openEdit(product)} className="h-9 w-9 grid place-items-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800" aria-label="Editar"><Pencil size={14} /></button>
                  <button onClick={() => deleteProduct(product)} disabled={remove.isPending} className="h-9 w-9 grid place-items-center rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10" aria-label="Excluir"><Trash2 size={14} /></button></div>
              </div>
            </article>))}</div>}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-1.5 block"><span className="text-xs text-slate-400">{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-950/70 px-2 py-2"><div className="text-[10px] text-slate-500">{label}</div><div className="mt-0.5 text-xs font-semibold text-slate-200 truncate">{value}</div></div>; }
