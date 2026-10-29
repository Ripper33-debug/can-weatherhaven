/* Quote / contact endpoint. Runs on Vercel (serverless). Provider is chosen by env vars:
   RESEND_API_KEY + CONTACT_TO  → emails the request (Resend)
   HUBSPOT_PORTAL_ID + HUBSPOT_FORM_GUID → submits to a HubSpot form
   neither → logs the request and returns ok (so the site works before accounts exist) */
export const prerender = false;
import type { APIRoute } from 'astro';

const RATE = new Map<string, number[]>();
const limited = (ip: string) => { const now = Date.now(), w = (RATE.get(ip) || []).filter(t => now - t < 60_000); w.push(now); RATE.set(ip, w); return w.length > 5; };
const clean = (v: unknown, max = 2000) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const env = import.meta.env;
  const ct = request.headers.get('content-type') || '';
  let body: Record<string, unknown> = {};
  try { body = ct.includes('application/json') ? await request.json() : Object.fromEntries((await request.formData()).entries()); } catch { return json({ ok: false, error: 'bad request' }, 400); }
  if (clean(body.website)) return json({ ok: true });            // honeypot: bots fill the hidden field
  const ip = clientAddress || request.headers.get('x-forwarded-for') || 'unknown';
  if (limited(ip)) return json({ ok: false, error: 'Too many requests. Try again in a minute.' }, 429);
  const d = { name: clean(body.name, 120), org: clean(body.org, 160), email: clean(body.email, 200), phone: clean(body.phone, 60), sector: clean(body.sector, 40), region: clean(body.region, 60), product: clean(body.product, 40), message: clean(body.message, 4000), page: clean(body.page, 300) };
  if (!d.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return json({ ok: false, error: 'Name and a valid email are required.' }, 422);
  const summary = `Quote request from ${d.name}${d.org ? ` (${d.org})` : ''}\nEmail: ${d.email}\nPhone: ${d.phone || '—'}\nSector: ${d.sector || '—'} · Region: ${d.region || '—'} · System: ${d.product || '—'}\nPage: ${d.page || '—'}\n\n${d.message || '(no message)'}`;
  try {
    if (env.RESEND_API_KEY && env.CONTACT_TO) {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.CONTACT_FROM || 'Weatherhaven website <website@weatherhaven.com>', to: env.CONTACT_TO.split(','), reply_to: d.email, subject: `Website quote request — ${d.name}${d.product ? ` — ${d.product}` : ''}`, text: summary }) });
      if (!r.ok) throw new Error('resend ' + r.status);
    } else if (env.HUBSPOT_PORTAL_ID && env.HUBSPOT_FORM_GUID) {
      const fields = Object.entries(d).filter(([, v]) => v).map(([name, value]) => ({ name, value }));
      const r = await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${env.HUBSPOT_PORTAL_ID}/${env.HUBSPOT_FORM_GUID}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields, context: { pageUri: d.page, ipAddress: ip } }) });
      if (!r.ok) throw new Error('hubspot ' + r.status);
    } else {
      console.log('[quote] no provider configured; request logged only:\n' + summary);
    }
  } catch (e) { console.error('[quote] delivery failed', e); return json({ ok: false, error: 'We could not send that just now. Please call us or try again shortly.' }, 502); }
  return json({ ok: true });
};
export const GET: APIRoute = () => json({ ok: false, error: 'POST only' }, 405);
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
