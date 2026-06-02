/**
 * lib/notifications.ts
 * Lead notification dispatcher.
 * Checks admin notification_settings and sends via configured channels.
 * Email uses fetch to a local API route (can be wired to Resend/SendGrid later).
 */
import { supabase } from './supabase';

export interface LeadNotificationPayload {
  customerName: string;
  phone: string;
  email?: string;
  campaignName?: string;
  intentScore: number;
  timestamp: string;
}

/**
 * Send lead notifications to admin via their configured channels.
 */
export async function sendLeadNotification(
  adminId: string,
  lead: LeadNotificationPayload
): Promise<void> {
  // Fetch admin notification settings
  const { data: admin } = await supabase
    .from('users')
    .select('name, email, notification_settings')
    .eq('id', adminId)
    .single();

  if (!admin) return;

  const settings = admin.notification_settings as {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
    email_address?: string;
    phone_number?: string;
  } | null;

  if (!settings) return;

  const notifEmail = settings.email_address || admin.email;
  const message = buildMessage(lead, admin.name);

  // Email notification (via internal API route / Resend)
  if (settings.email && notifEmail) {
    await sendEmailNotification(notifEmail, admin.name, lead, message).catch(console.error);
  }

  // SMS notification (stub — plug in MSG91 / Twilio here)
  if (settings.sms && settings.phone_number) {
    console.log(`[SMS] To ${settings.phone_number}: ${message}`);
    // TODO: integrate MSG91 or Twilio SMS here
  }

  // WhatsApp notification (stub — plug in WhatsApp Business API here)
  if (settings.whatsapp && settings.phone_number) {
    console.log(`[WhatsApp] To ${settings.phone_number}: ${message}`);
    // TODO: integrate WhatsApp Business API here
  }
}

function buildMessage(lead: LeadNotificationPayload, adminName: string): string {
  return (
    `🎯 New Lead Captured!\n` +
    `Name: ${lead.customerName}\n` +
    `Phone: ${lead.phone}\n` +
    (lead.email ? `Email: ${lead.email}\n` : '') +
    (lead.campaignName ? `Campaign: ${lead.campaignName}\n` : '') +
    `Intent Score: ${Math.round(lead.intentScore * 100)}%\n` +
    `Time: ${new Date(lead.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
  );
}

async function sendEmailNotification(
  toEmail: string,
  adminName: string,
  lead: LeadNotificationPayload,
  plainText: string
): Promise<void> {
  // Try Resend API if configured
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log(`[Email stub] Would send to ${toEmail}:\n${plainText}`);
    return;
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Vaxo Calling AI <noreply@vaxo.ai>',
      to: [toEmail],
      subject: `🎯 New Lead: ${lead.customerName} (${lead.phone})`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #6366f1;">🎯 New Lead Captured!</h2>
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="padding:8px 0; color:#666;">Name</td><td style="font-weight:bold;">${lead.customerName}</td></tr>
            <tr><td style="padding:8px 0; color:#666;">Phone</td><td style="font-weight:bold;">${lead.phone}</td></tr>
            ${lead.email ? `<tr><td style="padding:8px 0; color:#666;">Email</td><td>${lead.email}</td></tr>` : ''}
            ${lead.campaignName ? `<tr><td style="padding:8px 0; color:#666;">Campaign</td><td>${lead.campaignName}</td></tr>` : ''}
            <tr><td style="padding:8px 0; color:#666;">Intent Score</td><td style="color:#22c55e; font-weight:bold;">${Math.round(lead.intentScore * 100)}%</td></tr>
            <tr><td style="padding:8px 0; color:#666;">Time</td><td>${new Date(lead.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>
          </table>
          <p style="color:#999; font-size:12px; margin-top:24px;">Vaxo Calling AI — Lead Management</p>
        </div>
      `,
    }),
  });
}
