import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth';
import { ApiError } from '@/lib/errors';

export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError('INVALID_AUTH', 401, 'Login admin diperlukan');
  }
  return { id: session.user.id, email: session.user.email ?? '' };
}
