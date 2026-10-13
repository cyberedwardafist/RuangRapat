import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: 'anggota' | 'host' | 'admin';
  status: 'aktif' | 'menunggu' | 'diblokir';
};

// Mengembalikan profil pengguna yang sedang masuk, atau null
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, email, role, status')
    .eq('id', data.user.id)
    .maybeSingle();
  return (profile as Profile) ?? null;
}

export async function requireAdmin(): Promise<Profile | null> {
  const p = await getProfile();
  if (!p || p.role !== 'admin' || p.status !== 'aktif') return null;
  return p;
}

export async function logAudit(actor: Profile | null, action: string, tone: 'ok' | 'warn' | 'info' = 'info') {
  const admin = createAdminClient();
  await admin.from('audit_log').insert({
    actor_id: actor?.id ?? null,
    actor_name: actor?.full_name || 'Sistem',
    action,
    tone,
  });
}
