import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getAdminClient } from '@/lib/db/client';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set');
  }

  const sb = getAdminClient();
  const { count } = await sb.from('users').select('*', { count: 'exact', head: true });

  if ((count ?? 0) > 0) {
    console.log('[seed:admin] Users table not empty — skipping seed');
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const { error } = await sb.from('users').insert({ email, password_hash: hash });
  if (error) throw new Error(`Insert failed: ${error.message}`);

  console.log(`[seed:admin] Created admin user: ${email}`);
}

main().catch(e => { console.error(e); process.exit(1); });
