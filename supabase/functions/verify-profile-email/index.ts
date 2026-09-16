import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
});

const ADMIN_EMAIL = 'heojoon48@gmail.com';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase('en-US') : '';
}

function validEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function makeCode() {
  const bytes = new Uint8Array(6);
  let code = '';
  do {
    crypto.getRandomValues(bytes);
    code = Array.from(bytes, (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('');
  } while (!/[A-Z]/.test(code) || !/[0-9]/.test(code));
  return code;
}

async function codeMac(code: string, userId: string, email: string, pepper: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${userId}:${email}:${code}`),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function verificationEmail(code: string) {
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f3f1ff;font-family:Arial,'Noto Sans KR',sans-serif;color:#24214c"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border:1px solid #ddd8f3;border-radius:24px"><tr><td style="padding:32px"><div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#5751d8">WORDORIA · CRYSTAL QUEST</div><h1 style="margin:14px 0 8px;font-size:25px">이메일 인증 코드</h1><p style="margin:0 0 24px;color:#74718a;line-height:1.7">프로필 화면에 아래 6자리 코드를 입력해 주세요.</p><div style="padding:20px;border-radius:16px;background:#eeeaff;text-align:center;font-size:32px;font-weight:900;letter-spacing:8px;color:#5751d8">${code}</div><p style="margin:20px 0 0;color:#74718a;font-size:12px;line-height:1.7">코드는 10분 동안 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시해 주세요.</p></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST 요청만 지원합니다.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) return json({ error: '함수 환경 변수가 설정되지 않았습니다.' }, 500);

  const authorization = req.headers.get('Authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: '로그인이 필요합니다.' }, 401);
  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: '유효하지 않은 로그인 세션입니다.' }, 401);
  const user = userData.user;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: '요청 형식이 올바르지 않습니다.' }, 400); }
  const action = typeof body.action === 'string' ? body.action : '';

  if (action === 'send') {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('WORDORIA_EMAIL_FROM');
    if (!resendKey || !from) return json({ error: '메일 발송 서비스가 아직 설정되지 않았습니다.' }, 503);
    const email = normalizeEmail(body.email);
    if (!validEmail(email)) return json({ error: '올바른 이메일 주소를 입력해 주세요.' }, 400);

    const now = Date.now();
    const { data: previous } = await admin.from('email_verification_challenges').select('*').eq('user_id', user.id).maybeSingle();
    if (previous && new Date(previous.resend_available_at).getTime() > now) {
      const retryAfter = Math.ceil((new Date(previous.resend_available_at).getTime() - now) / 1000);
      return json({ error: `${retryAfter}초 후 다시 요청할 수 있습니다.`, retryAfter }, 429);
    }
    const inWindow = previous && now - new Date(previous.send_window_started_at).getTime() < SEND_WINDOW_MS;
    const sendCount = inWindow ? Number(previous.send_count || 0) + 1 : 1;
    if (sendCount > 5) return json({ error: '한 시간 동안 요청할 수 있는 인증 메일 수를 초과했습니다.' }, 429);

    const code = makeCode();
    const mac = await codeMac(code, user.id, email, serviceRoleKey);
    const nowIso = new Date(now).toISOString();
    const { error: challengeError } = await admin.from('email_verification_challenges').upsert({
      user_id: user.id,
      email,
      code_mac: mac,
      attempts: 0,
      expires_at: new Date(now + CODE_TTL_MS).toISOString(),
      resend_available_at: new Date(now + RESEND_COOLDOWN_MS).toISOString(),
      send_window_started_at: inWindow ? previous.send_window_started_at : nowIso,
      send_count: sendCount,
      updated_at: nowIso,
    });
    if (challengeError) return json({ error: '인증 요청을 만들지 못했습니다.' }, 500);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [email], subject: '[Wordoria] 이메일 인증 코드', html: verificationEmail(code) }),
    });
    if (!emailResponse.ok) {
      console.error('Resend delivery failed', emailResponse.status);
      await admin.from('email_verification_challenges').delete().eq('user_id', user.id).eq('code_mac', mac);
      return json({ error: '인증 메일을 발송하지 못했습니다.' }, 502);
    }
    return json({ ok: true, email, expiresIn: CODE_TTL_MS / 1000, resendAfter: RESEND_COOLDOWN_MS / 1000 });
  }

  if (action === 'verify') {
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!/^[A-Z0-9]{6}$/.test(code)) return json({ error: '6자리 인증코드를 입력해 주세요.' }, 400);
    const { data: challenge } = await admin.from('email_verification_challenges').select('*').eq('user_id', user.id).maybeSingle();
    if (!challenge) return json({ error: '먼저 인증 메일을 요청해 주세요.' }, 400);
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await admin.from('email_verification_challenges').delete().eq('user_id', user.id);
      return json({ error: '인증코드가 만료되었습니다. 새 코드를 요청해 주세요.' }, 410);
    }
    if (Number(challenge.attempts) >= 5) return json({ error: '인증 시도 횟수를 초과했습니다. 새 코드를 요청해 주세요.' }, 429);
    const mac = await codeMac(code, user.id, challenge.email, serviceRoleKey);
    if (mac !== challenge.code_mac) {
      const attempts = Number(challenge.attempts) + 1;
      if (attempts >= 5) await admin.from('email_verification_challenges').delete().eq('user_id', user.id);
      else await admin.from('email_verification_challenges').update({ attempts, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      return json({ error: attempts >= 5 ? '인증 시도 횟수를 초과했습니다. 새 코드를 요청해 주세요.' : '인증코드가 일치하지 않습니다.', attemptsRemaining: Math.max(0, 5 - attempts) }, 400);
    }

    const { data: claimed } = await admin.from('email_verification_challenges').delete().eq('user_id', user.id).eq('code_mac', mac).select('email').maybeSingle();
    if (!claimed) return json({ error: '이미 사용되었거나 유효하지 않은 인증코드입니다.' }, 409);
    const { data: profile } = await admin.from('profiles').select('email_reward_granted_at,email_reward_crystals,crystal_balance').eq('user_id', user.id).single();
    const firstReward = !profile?.email_reward_granted_at;
    const verifiedAt = new Date().toISOString();
    const role = claimed.email === ADMIN_EMAIL ? 'admin' : 'student';
    const updates: Record<string, unknown> = {
      contact_email: claimed.email,
      contact_email_active: true,
      contact_email_verified_at: verifiedAt,
      role,
      updated_at: verifiedAt,
    };
    if (firstReward) {
      updates.email_reward_granted_at = verifiedAt;
      updates.email_reward_crystals = Number(profile?.email_reward_crystals || 0) + 200;
      updates.crystal_balance = Number(profile?.crystal_balance || 0) + 200;
    }
    const { error: updateError } = await admin.from('profiles').update(updates).eq('user_id', user.id);
    if (updateError) {
      return json({ error: updateError.code === '23505' ? '이미 다른 계정에 연동된 이메일입니다.' : '이메일 인증 상태를 저장하지 못했습니다.' }, 409);
    }
    return json({ ok: true, email: claimed.email, role, reward: firstReward ? 200 : 0, verifiedAt });
  }

  if (action === 'select-role') {
    const role = body.role === 'teacher' ? 'teacher' : body.role === 'student' ? 'student' : '';
    if (!role) return json({ error: '학생 또는 선생님 권한을 선택해 주세요.' }, 400);
    const { data: profile } = await admin.from('profiles').select('contact_email,contact_email_active,contact_email_verified_at,role').eq('user_id', user.id).single();
    if (!profile?.contact_email_active || !profile.contact_email_verified_at) return json({ error: '이메일 인증을 먼저 완료해 주세요.' }, 403);
    if (normalizeEmail(profile.contact_email) === ADMIN_EMAIL || profile.role === 'admin') return json({ error: '관리자 계정의 권한은 변경할 수 없습니다.' }, 403);
    const { error } = await admin.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('user_id', user.id);
    if (error) return json({ error: '계정 권한을 변경하지 못했습니다.' }, 500);
    return json({ ok: true, role });
  }

  if (action === 'unlink') {
    const { data: profile } = await admin.from('profiles').select('contact_email,role').eq('user_id', user.id).single();
    const keepAdmin = normalizeEmail(profile?.contact_email) === ADMIN_EMAIL && profile?.role === 'admin';
    const { error } = await admin.from('profiles').update({
      contact_email_active: false,
      role: keepAdmin ? 'admin' : 'student',
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);
    await admin.from('email_verification_challenges').delete().eq('user_id', user.id);
    if (error) return json({ error: '이메일 연동을 해제하지 못했습니다.' }, 500);
    return json({ ok: true, role: keepAdmin ? 'admin' : 'student' });
  }

  return json({ error: '지원하지 않는 요청입니다.' }, 400);
});
