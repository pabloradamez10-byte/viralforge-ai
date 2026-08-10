import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, ShieldCheck, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

type AccessStatus = 'PENDING' | 'APPROVED' | 'BLOCKED';
type Profile = {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  access_status: AccessStatus;
  created_at: string;
};

const statusLabel: Record<AccessStatus, string> = {
  PENDING: 'Aguardando aprovação',
  APPROVED: 'Aprovado',
  BLOCKED: 'Bloqueado',
};

export default function Users() {
  const client = useQueryClient();
  const profiles = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,name,role,access_status,created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, access_status }: { id: string; access_status: AccessStatus }) => {
      const { error } = await supabase.from('profiles').update({ access_status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      client.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(variables.access_status === 'APPROVED' ? 'Acesso aprovado.' : 'Acesso bloqueado.');
    },
    onError: (error: Error) => toast.error(error.message || 'Não foi possível alterar o acesso.'),
  });

  const users = (profiles.data ?? []).filter((profile) => profile.role !== 'ADMIN');

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <section className="rounded-2xl border border-brand-500/25 bg-gradient-to-br from-brand-600/20 via-slate-900 to-slate-950 p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-brand-300" />
          <div>
            <h1 className="text-2xl font-bold">Controle de usuários</h1>
            <p className="mt-1 text-sm text-slate-400">Somente pessoas aprovadas por você conseguem acessar o ViralForge.</p>
          </div>
        </div>
      </section>

      {profiles.isLoading ? (
        <div className="py-14 grid place-items-center"><Loader2 className="animate-spin text-brand-300" /></div>
      ) : profiles.isError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">Não foi possível carregar os usuários.</div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-400">
          <UserRound className="mx-auto mb-3 text-slate-600" />Nenhuma solicitação de acesso ainda.
        </div>
      ) : (
        <div className="space-y-3">{users.map((profile) => (
          <article key={profile.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-semibold truncate">{profile.name || 'Sem nome'}</div>
              <div className="text-sm text-slate-400 truncate">{profile.email}</div>
              <div className="mt-1 text-xs text-slate-500">{statusLabel[profile.access_status]}</div>
            </div>
            <div className="flex gap-2">
              <Button disabled={changeStatus.isPending || profile.access_status === 'APPROVED'} onClick={() => changeStatus.mutate({ id: profile.id, access_status: 'APPROVED' })}>
                <Check size={16} /> Aprovar
              </Button>
              <Button variant="secondary" disabled={changeStatus.isPending || profile.access_status === 'BLOCKED'} onClick={() => changeStatus.mutate({ id: profile.id, access_status: 'BLOCKED' })}>
                <X size={16} /> Bloquear
              </Button>
            </div>
          </article>
        ))}</div>
      )}
    </div>
  );
}
