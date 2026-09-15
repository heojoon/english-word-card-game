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
  setStatus(signingUp ? '이메일 확인 후 같은 계정으로 로그인할 수 있어요.' : '');
}

function friendlyError(error) {
  const message = String(error?.message || '요청을 처리하지 못했습니다.');
  if (/invalid login credentials/i.test(message)) return '이메일 또는 비밀번호를 확인해 주세요.';
  if (/email not confirmed/i.test(message)) return '이메일 인증을 먼저 완료해 주세요.';
  if (/user already registered/i.test(message)) return '이미 가입된 이메일입니다.';
  if (/password/i.test(message) && /least|weak|short/i.test(message)) return '비밀번호는 8자 이상으로 만들어 주세요.';
  if (/rate limit/i.test(message)) return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  return message;
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
  const emailValue = email.value.trim();
  const passwordValue = password.value;
  if (!emailValue || !passwordValue) {
    setStatus('이메일과 비밀번호를 입력해 주세요.', 'error');
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
  if (mode === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailValue, password: passwordValue });
    if (error) {
      setStatus(friendlyError(error), 'error');
      setBusy(false);
      return;
    }
    sessionStorage.removeItem('wordoriaGuest');
    enterGame('account', data.session);
    return;
  }

  const { data, error } = await supabase.auth.signUp({ email: emailValue, password: passwordValue });
  if (error) {
    setStatus(friendlyError(error), 'error');
    setBusy(false);
    return;
  }
  if (data.session) {
    sessionStorage.removeItem('wordoriaGuest');
    enterGame('account', data.session);
    return;
  }
  setMode('login');
  password.value = '';
  confirmPassword.value = '';
  setStatus('가입 확인 메일을 보냈습니다. 인증 후 로그인해 주세요.', 'success');
  setBusy(false);
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
