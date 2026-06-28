import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, insertResetToken, logActivity } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  // Rate limit: max 5 requests per 15 minutes per IP to prevent abuse/enumeration spam.
  const ip = getClientIp(req);
  if (!await checkRateLimit(`forgot_password_${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { username } = await req.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ ok: true });
    }

    const user = await getUserByUsername(username.trim());

    if (user) {
      const id = crypto.randomUUID();
      const token = crypto.randomUUID();

      await insertResetToken(id, user.username, token);

      const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/admin/reset-password?token=${token}`;

      await logActivity({
        id: crypto.randomUUID(),
        restaurant_id: null,
        action: 'password_reset_requested',
        description: `Solicitud de restablecimiento de contraseña para: ${user.username}`,
        user_name: user.username,
        metadata: {
          username: user.username,
          token,
          reset_url: resetUrl,
          expires_in: '1 hora',
        },
      });
    }

    // Always return success to avoid user enumeration
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('forgot-password error', err);
    return NextResponse.json({ ok: true });
  }
}
