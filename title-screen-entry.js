import { createClient } from '@supabase/supabase-js';

const params = new URLSearchParams(location.search);
const localHost = ['localhost', '127.0.0.1'].includes(location.hostname);
const nativeApp = document.documentElement.classList.contains('native-app') || Boolean(window.Capacitor?.isNativePlatform?.());
const useLocalDb = params.get('db') === 'local' || (params.get('db') !== 'remote' && localHost && !nativeApp);
const supabaseUrl = useLocalDb ? 'http://127.0.0.1:54321' : 'https://uobagmggryhsqlpxhfob.supabase.co';
const publishableKey = useLocalDb
  ? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
  : 'sb_publishable_NnzXTAh_47i7g5ndSzkxEQ_gy7X-lAz';
const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const LOGIN_ID_PATTERN = /^[가-힣a-z0-9][가-힣a-z0-9._-]{1,19}$/;
const INTERNAL_AUTH_DOMAIN = 'id.wordoria.example.com';

const config = window.WORDORIA_APP_CONFIG?.titleScreen || {};
const entry = document.getElementById('entry-screen');
const form = document.getElementById('entry-form');
const email = document.getElementById('entry-email');
const password = document.getElementById('entry-password');
const confirmWrap = document.getElementById('entry-confirm-wrap');
const confirmPassword = document.getElementById('entry-confirm-password');
const submit = document.getElementById('entry-submit');
const switchMode = document.getElementById('entry-switch-mode');
const guest = document.getElementById('entry-guest');
const status = document.getElementById('entry-status');
const heading = document.getElementById('entry-form-title');
const background = document.getElementById('entry-background');
const release = document.getElementById('entry-release');
let mode = 'login';
let busy = true;

window.WORDORIA_AUTH_CLIENT = supabase;

if (config.backgroundImage) background.src = config.backgroundImage;
release.textContent = config.release || 'WEB BUILD';

function setStatus(message = '', type = '') {
  status.textContent = message;
  status.dataset.type = type;
}

function setBusy(nextBusy) {
  busy = nextBusy;
  entry.setAttribute('aria-busy', String(nextBusy));
  [email, password, confirmPassword, submit, switchMode, guest].forEach(control => {
    control.disabled = nextBusy;
  });
  submit.textContent = nextBusy ? '확인 중…' : mode === 'login' ? '로그인' : '계정 만들기';
}

function setMode(nextMode) {
  mode = nextMode;
  const signingUp = mode === 'signup';
  heading.textContent = signingUp ? '새 모험가 계정' : '모험을 시작하세요';
  confirmWrap.hidden = !signingUp;
  confirmPassword.required = signingUp;
  switchMode.textContent = signingUp ? '로그인으로 돌아가기' : '회원가입';
  submit.textContent = signingUp ? '계정 만들기' : '로그인';
  password.autocomplete = signingUp ? 'new-password' : 'current-password';
  setStatus(signingUp ? '2~20자의 아이디를 만들면 바로 로그인돼요.' : '');
}

function friendlyError(error) {
  const message = String(error?.message || '요청을 처리하지 못했습니다.');
  if (/invalid login credentials/i.test(message)) return '아이디 또는 비밀번호를 확인해 주세요.';
  if (/email not confirmed/i.test(message)) return '현재 로그인할 수 없는 계정입니다.';
  if (/user already registered|already been registered/i.test(message)) return '이미 사용 중인 아이디입니다.';
  if (/password/i.test(message) && /least|weak|short/i.test(message)) return '비밀번호는 8자 이상으로 만들어 주세요.';
  if (/rate limit/i.test(message)) return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  return message;
}

function normalizeLoginId(value) {
  return value.trim().normalize('NFKC').toLocaleLowerCase('ko-KR');
}

function isLegacyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function loginIdToAuthEmail(loginId) {
  const bytes = new TextEncoder().encode(`wordoria-login-id:v1:${loginId}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hash}@${INTERNAL_AUTH_DOMAIN}`;
}

async function resolveAuthEmail(loginId, allowLegacyEmail) {
  if (allowLegacyEmail && isLegacyEmail(loginId)) return loginId.toLocaleLowerCase('en-US');
  return loginIdToAuthEmail(loginId);
}

function enterGame(kind, session = null) {
  window.WORDORIA_SESSION = session;
  window.WORDORIA_GUEST = kind === 'guest';
  document.dispatchEvent(new CustomEvent('wordoria:entry', { detail: { kind, session } }));
  entry.classList.add('is-leaving');
  window.setTimeout(() => {
    entry.hidden = true;
    document.body.classList.remove('entry-active');
    document.getElementById('screen')?.focus({ preventScroll: true });
  }, 220);
}

async function handleSubmit(event) {
  event.preventDefault();
  if (busy) return;
  const enteredLoginId = email.value.trim();
  const loginId = normalizeLoginId(enteredLoginId);
  const passwordValue = password.value;
  if (!loginId || !passwordValue) {
    setStatus('아이디와 비밀번호를 입력해 주세요.', 'error');
    return;
  }
  if (mode === 'signup' && !LOGIN_ID_PATTERN.test(loginId)) {
    setStatus('아이디는 문자 또는 숫자로 시작하는 2~20자로 만들어 주세요.', 'error');
    return;
  }
  if (mode === 'signup' && passwordValue.length < 8) {
    setStatus('비밀번호는 8자 이상으로 만들어 주세요.', 'error');
    return;
  }
  if (mode === 'signup' && passwordValue !== confirmPassword.value) {
    setStatus('비밀번호 확인이 일치하지 않습니다.', 'error');
    return;
  }

  setBusy(true);
  setStatus(mode === 'login' ? '모험가 기록을 확인하고 있어요…' : '새 계정을 만들고 있어요…');
  let authEmail;
  try {
    authEmail = await resolveAuthEmail(loginId, mode === 'login');
  } catch (error) {
    setStatus('이 브라우저에서는 안전한 로그인을 사용할 수 없습니다.', 'error');
    setBusy(false);
    return;
  }
  if (mode === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: passwordValue });
    if (error) {
      setStatus(friendlyError(error), 'error');
      setBusy(false);
      return;
    }
    sessionStorage.removeItem('wordoriaGuest');
    enterGame('account', data.session);
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email: authEmail,
    password: passwordValue,
    options: { data: { login_id: loginId, display_name: enteredLoginId } }
  });
  if (error) {
    setStatus(friendlyError(error), 'error');
    setBusy(false);
    return;
  }
  let session = data.session;
  if (!session) {
    const signInResult = await supabase.auth.signInWithPassword({ email: authEmail, password: passwordValue });
    if (signInResult.error || !signInResult.data.session) {
      setStatus(friendlyError(signInResult.error), 'error');
      setBusy(false);
      return;
    }
    session = signInResult.data.session;
  }
  if (session) {
    sessionStorage.removeItem('wordoriaGuest');
    enterGame('account', session);
    return;
  }
}

form.addEventListener('submit', handleSubmit);
switchMode.addEventListener('click', () => {
  if (!busy) setMode(mode === 'login' ? 'signup' : 'login');
});
guest.addEventListener('click', () => {
  if (busy) return;
  sessionStorage.setItem('wordoriaGuest', '1');
  enterGame('guest');
});

supabase.auth.onAuthStateChange((_event, session) => {
  window.WORDORIA_SESSION = session;
});

async function initialize() {
  const { data, error } = await supabase.auth.getSession();
  if (!error && data.session) {
    enterGame('account', data.session);
    return;
  }
  if (sessionStorage.getItem('wordoriaGuest') === '1') {
    enterGame('guest');
    return;
  }
  setBusy(false);
  email.focus({ preventScroll: true });
}

initialize().catch(error => {
  setStatus(friendlyError(error), 'error');
  setBusy(false);
});
