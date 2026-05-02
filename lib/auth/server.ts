import { getServerSession } from 'next-auth';
import { authOptions, type UserRole } from '@/lib/auth/nextauth';
import { ApiError } from '@/lib/errors';

export type AdminSession = {
  id: string;
  email: string;
  role: UserRole;
};

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError('INVALID_AUTH', 401, 'Login admin diperlukan');
  }
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    role: session.user.role ?? 'manager',
  };
}

export async function requireApprover(): Promise<AdminSession> {
  const admin = await requireAdmin();
  if (admin.role !== 'approver') {
    throw new ApiError(
      'INVALID_AUTH',
      403,
      'Hanya approver yang diizinkan untuk aksi ini',
    );
  }
  return admin;
}
