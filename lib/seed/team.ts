import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getAdminClient } from '@/lib/db/client';

type Role = 'manager' | 'approver';

const TEAM: Array<{ email: string; password: string; role: Role }> = [
  { email: 'rina@yopmail.com',  password: 'Savoir#2026', role: 'approver' },
  { email: 'win@yopmail.com',   password: 'Savoir#2026', role: 'approver' },
  { email: 'refa@yopmail.com',  password: 'Savoir#2026', role: 'manager' },
  { email: 'reza@yopmail.com',  password: 'Savoir#2026', role: 'manager' },
  { email: 'yahya@yopmail.com', password: 'Savoir#2026', role: 'manager' },
];

async function main() {
  const sb = getAdminClient();
  let created = 0;
  let skipped = 0;
  for (const u of TEAM) {
    const { count } = await sb
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('email', u.email);
    if ((count ?? 0) > 0) {
      console.log(`[seed:team] ${u.email} already exists — skip`);
      skipped += 1;
      continue;
    }
    const hash = await bcrypt.hash(u.password, 10);
    const { error } = await sb
      .from('users')
      .insert({ email: u.email, password_hash: hash, role: u.role });
    if (error) {
      throw new Error(`Insert ${u.email} failed: ${error.message}`);
    }
    console.log(`[seed:team] Created ${u.email} (${u.role})`);
    created += 1;
  }
  console.log(`[seed:team] Done. created=${created} skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
