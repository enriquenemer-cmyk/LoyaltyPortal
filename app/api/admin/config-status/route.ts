import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Check which env vars are present (never expose values, only boolean)
  const check = (key: string) => !!process.env[key];

  return NextResponse.json({
    whatsapp: {
      access_token: check('WHATSAPP_ACCESS_TOKEN'),
      phone_number_id: check('WHATSAPP_PHONE_NUMBER_ID'),
      verify_token: check('WHATSAPP_VERIFY_TOKEN'),
    },
    google: {
      place_id: check('NEXT_PUBLIC_GOOGLE_PLACE_ID'),
    },
    stripe: {
      secret_key: check('STRIPE_SECRET_KEY'),
      webhook_secret: check('STRIPE_WEBHOOK_SECRET'),
      vip_price_id: check('STRIPE_VIP_PRICE_ID'),
    },
    email: {
      resend_api_key: check('RESEND_API_KEY'),
      admin_email: check('ADMIN_EMAIL'),
      resend_from: check('RESEND_FROM'),
    },
    push: {
      vapid_public: check('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
      vapid_private: check('VAPID_PRIVATE_KEY'),
    },
    app: {
      app_url: check('NEXT_PUBLIC_APP_URL'),
      cron_secret: check('CRON_SECRET'),
      db_url: check('DATABASE_URL') || check('POSTGRES_URL'),
    },
  });
}
