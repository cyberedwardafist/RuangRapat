import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { authenticateKey } from '@/lib/api';

// GET /api/v1/tools -> status alat/project yang diatur admin
export async function GET(request: Request) {
  const auth = await authenticateKey(request, 'tools');
  if (auth.error) return auth.error;
  const admin = createAdminClient();
  const { data } = await admin.from('tools').select('id, name, category, status').order('name');
  return NextResponse.json({ tools: data ?? [] });
}
