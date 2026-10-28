import { createHmac } from 'node:crypto';
import { collaboratorAuth } from '@/collaborator-auth';

export async function collaboratorIdentityHeaders() {
  const session = await collaboratorAuth();
  const id = session?.user?.id;
  const email = session?.user?.email?.trim().toLowerCase();
  const secret = process.env.BACKEND_SERVICE_TOKEN;
  if (!id || !email || !secret) return null;
  const encoded = Buffer.from(id).toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return { authorization: `Bearer ${encoded}.${signature}`, 'x-user-id': id, 'x-user-email': email };
}
