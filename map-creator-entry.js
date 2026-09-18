import { createClient } from '@supabase/supabase-js';

const params = new URLSearchParams(location.search);
const localHost = ['localhost', '127.0.0.1'].includes(location.hostname);
const nativeApp = document.documentElement.classList.contains('native-app') || Boolean(window.Capacitor?.isNativePlatform?.());
const useLocalDb = params.get('db') === 'local' || (params.get('db') !== 'remote' && localHost && !nativeApp);
const supabaseUrl = useLocalDb ? 'http://127.0.0.1:54321' : 'https://uobagmggryhsqlpxhfob.supabase.co';
const supabaseKey = useLocalDb
  ? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
  : 'sb_publishable_NnzXTAh_47i7g5ndSzkxEQ_gy7X-lAz';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const accountLabel = () => state.profile?.login_id
  || state.profile?.display_name
  || state.user?.user_metadata?.login_id
  || state.user?.user_metadata?.display_name
  || '현재 사용자';

const state = {
  ready: false,
  busy: false,
  session: null,
  user: null,
  profile: null,
  worlds: [],
  maps: [],
  worldId: '',
  mapId: '',
  mapStatus: 'draft',
  mapTitle: '',
  mapDescription: '',
  visibility: 'private',
  accessIds: '',
  total: 30,
  ratioA: 40,
  ratioB: 30,
  file: null,
  previewUrl: '',
  source: null,
  words: [],
  deletedWordIds: new Set(),
  processMessage: '',
};

let toastTimer = null;
function toast(message) {
  const element = $('creator-toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 2800);
}

function allocation() {
  const total = Math.max(1, Math.min(500, Number(state.total) || 1));
  const aRatio = Math.max(0, Math.min(100, Number(state.ratioA) || 0));
  const bRatio = Math.max(0, Math.min(100 - aRatio, Number(state.ratioB) || 0));
  const cRatio = 100 - aRatio - bRatio;
  let b = bRatio === 0 ? 0 : Math.round((total * bRatio / 100) / 5) * 5;
  b = Math.max(0, Math.min(Math.floor(total / 5) * 5, b));
  let a = aRatio === 0 ? 0 : Math.round(total * aRatio / 100);
  a = Math.max(0, Math.min(total - b, a));
  let c = total - a - b;
  if (cRatio === 0 && c > 0) {
    a += c;
    c = 0;
  }
  return { total, aRatio, bRatio, cRatio, a, b, c };
}

function refreshAllocationDisplay() {
  const value = allocation();
  const values = {
    'ratio-a-label': `${value.aRatio}%`,
    'ratio-b-label': `${value.bRatio}%`,
    'ratio-c-label': `${value.cRatio}%`,
    'count-a': `${value.a}문제`,
    'count-b': `${value.b}문제`,
    'count-c': `${value.c}문제`,
  };
  Object.entries(values).forEach(([id, text]) => { const element = $(id); if (element) element.textContent = text; });
  [['gauge-a', value.aRatio], ['gauge-b', value.bRatio], ['gauge-c', value.cRatio]].forEach(([id, width]) => {
    const element = $(id);
    if (element) element.style.width = `${width}%`;
  });
  [['ratio-a', value.aRatio], ['ratio-b', value.bRatio], ['ratio-c', value.cRatio]].forEach(([id, ratio]) => {
    const element = $(id);
    if (element) element.value = String(ratio);
  });
  const gauge = document.querySelector('.ratio-gauge');
  if (gauge) gauge.setAttribute('aria-label', `문제 유형 비율 A ${value.aRatio}%, B ${value.bRatio}%, C ${value.cRatio}%`);
}

function setRatio(changed, nextValue) {
  const value = allocation();
  const ratios = { a: value.aRatio, b: value.bRatio, c: value.cRatio };
  const next = Math.max(0, Math.min(100, Math.round(nextValue)));
  const others = Object.keys(ratios).filter(key => key !== changed);
  const previousOtherTotal = ratios[others[0]] + ratios[others[1]];
  const remaining = 100 - next;
  const first = previousOtherTotal
    ? Math.round(remaining * ratios[others[0]] / previousOtherTotal)
    : Math.round(remaining / 2);
  ratios[changed] = next;
  ratios[others[0]] = first;
  ratios[others[1]] = remaining - first;
  state.ratioA = ratios.a;
  state.ratioB = ratios.b;
}

function refreshActionAvailability() {
  const available = Boolean(state.worldId && state.mapTitle.trim() && !state.busy);
  const saveButton = $('save-draft-button');
  const analyzeButton = $('analyze-button');
  if (saveButton) saveButton.disabled = !available;
  if (analyzeButton) analyzeButton.disabled = !available || (!state.file && !state.source);
}

function currentStep() {
  if (state.mapStatus === 'published') return 4;
  if (state.words.length) return 3;
  if (state.file || state.source) return 2;
  return 1;
}

function stepRail() {
  const current = currentStep();
  return `<div class="step-rail" aria-label="맵 생성 진행 단계">
    ${['월드·맵', '사진 분석', '검수·설정', '공개'].map((label, index) => {
      const step = index + 1;
      const className = step < current ? 'done' : step === current ? 'active' : '';
      return `<span class="${className}">${step < current ? '✓' : step}<br>${label}</span>`;
    }).join('')}
  </div>`;
}

function renderBlocked() {
  return `<section class="blocked-card">
    <div class="login-crystal" style="margin-inline:auto" aria-hidden="true">◇</div>
    <div class="eyebrow" style="color:var(--violet)">ACCESS SEALED</div>
    <h1>제작 권한이 필요해요</h1>
    <p>${esc(accountLabel())} 계정은 현재 <b>${esc(state.profile?.role || 'student')}</b> 역할입니다.<br>관리자에게 Teacher 권한을 요청해 주세요.</p>
    <a class="primary" href="index.html">게임으로 돌아가기</a>
  </section>`;
}

function worldCard() {
  const options = state.worlds.map(world => `<option value="${world.id}" ${state.worldId === world.id ? 'selected' : ''}>${esc(world.name)} · ${esc(world.world_code)}</option>`).join('');
  const mapOptions = state.maps.map(map => `<option value="${map.id}" ${state.mapId === map.id ? 'selected' : ''}>${esc(map.title)} · ${map.status}</option>`).join('');
  return `<section class="forge-card">
    <div class="card-head"><div><div class="eyebrow" style="color:var(--violet)">WORLD & MAP</div><h2>모험의 이름을 정해요</h2></div><span class="step-no">01</span></div>
    ${state.worlds.length ? `<div class="field"><label for="world-select">내 월드</label><select id="world-select"><option value="">월드를 선택해 주세요</option>${options}</select></div>` : '<p class="status-note">아직 만든 월드가 없습니다. 첫 월드를 만들어 주세요.</p>'}
    <form id="world-form" class="field">
      <label for="world-name">새 월드 이름</label>
      <div class="inline-form"><input id="world-name" name="worldName" type="text" maxlength="60" placeholder="예: 별빛 중등 영단어"><button class="compact-action" type="submit">월드 생성</button></div>
    </form>
    ${state.worldId ? `<div class="field"><label for="map-select">이 월드의 맵</label><div class="inline-form"><select id="map-select"><option value="">새 맵 만들기</option>${mapOptions}</select><button class="compact-action" type="button" data-action="new-map">새 맵</button></div></div>` : ''}
    <div class="field"><label for="map-title">맵 이름</label><input id="map-title" data-state="mapTitle" type="text" maxlength="80" value="${esc(state.mapTitle)}" placeholder="예: Unit 2 · 동사의 수정길"></div>
    <div class="field"><label for="map-description">맵 설명</label><textarea id="map-description" data-state="mapDescription" maxlength="240" placeholder="학생들이 배우게 될 내용을 적어 주세요.">${esc(state.mapDescription)}</textarea></div>
    <button id="save-draft-button" class="secondary" style="width:100%;margin-top:12px" data-action="save-draft" ${!state.worldId || !state.mapTitle || state.busy ? 'disabled' : ''}>맵 초안 저장</button>
  </section>`;
}

function uploadCard() {
  return `<section class="forge-card">
    <div class="card-head"><div><div class="eyebrow" style="color:var(--violet)">AI WORD SCAN</div><h2>단어장 사진을 올려요</h2></div><span class="step-no">02</span></div>
    <div class="upload-zone">
      <div>
        ${state.previewUrl ? `<img class="source-preview" src="${esc(state.previewUrl)}" alt="선택한 단어장 사진 미리보기">` : '<span class="upload-symbol" aria-hidden="true">⌁</span>'}
        <b>${state.file ? esc(state.file.name) : state.source ? '업로드된 사진을 다시 분석할 수 있어요' : '사진을 가져올 방법을 선택하세요'}</b>
        <small>영어 단어와 한글 뜻이 행 단위로 보이는 사진<br>JPEG · PNG · WebP, 최대 6MB</small>
      </div>
      <div class="upload-actions" aria-label="단어장 사진 가져오기">
        <label class="upload-choice"><input id="source-camera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"><span>카메라 촬영</span></label>
        <label class="upload-choice"><input id="source-gallery" type="file" accept="image/jpeg,image/png,image/webp"><span>사진첩 선택</span></label>
        <label class="upload-choice"><input id="source-file" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"><span>파일 선택</span></label>
      </div>
    </div>
    <button id="analyze-button" class="primary" data-action="analyze" ${(!state.file && !state.source) || !state.worldId || !state.mapTitle || state.busy ? 'disabled' : ''}>${state.source && !state.file ? 'AI 분석 다시 시도' : '업로드하고 AI 분석 시작'} →</button>
    ${state.busy ? '<div class="processing"><i></i><b>사진에서 단어와 뜻을 찾고 있어요…</b></div>' : ''}
    ${state.processMessage ? `<p class="status-note ${state.processMessage.startsWith('오류:') ? 'error' : ''}">${esc(state.processMessage)}</p>` : ''}
  </section>`;
}

function ratioCard() {
  const value = allocation();
  return `<section class="forge-card">
    <div class="card-head"><div><div class="eyebrow" style="color:var(--violet)">QUEST MIX</div><h2>문제 조합을 설정해요</h2></div><span class="step-no">03</span></div>
    <div class="field"><label for="total-count">총문제 수</label><input id="total-count" data-state="total" type="number" min="1" max="500" value="${value.total}"></div>
    <div class="ratio-grid">
      <label class="ratio-control"><span>A · 4지선다</span><input id="ratio-a" type="range" min="0" max="100" value="${value.aRatio}"><b id="ratio-a-label">${value.aRatio}%</b></label>
      <label class="ratio-control"><span>B · 연결</span><input id="ratio-b" type="range" min="0" max="100" value="${value.bRatio}"><b id="ratio-b-label">${value.bRatio}%</b></label>
      <label class="ratio-control"><span>C · 빈칸</span><input id="ratio-c" type="range" min="0" max="100" value="${value.cRatio}"><b id="ratio-c-label">${value.cRatio}%</b></label>
    </div>
    <div class="ratio-gauge" aria-label="문제 유형 비율 A ${value.aRatio}%, B ${value.bRatio}%, C ${value.cRatio}%"><i id="gauge-a" class="type-a" style="width:${value.aRatio}%"></i><i id="gauge-b" class="type-b" style="width:${value.bRatio}%"></i><i id="gauge-c" class="type-c" style="width:${value.cRatio}%"></i></div>
    <div class="allocation"><span>TYPE A<b id="count-a">${value.a}문제</b></span><span>TYPE B<b id="count-b">${value.b}문제</b></span><span>TYPE C<b id="count-c">${value.c}문제</b></span></div>
    <p class="hint">연결형은 한 화면의 5쌍을 5문제로 계산해 5개 단위로 자동 보정합니다.</p>
  </section>`;
}

function wordsCard() {
  if (!state.words.length) return '';
  const reviewCount = state.words.filter(word => word.needs_review || word.review_status !== 'approved').length;
  return `<section class="forge-card">
    <div class="card-head"><div><div class="eyebrow" style="color:var(--violet)">REVIEW CRYSTALS</div><h2>AI가 찾은 단어를 확인해요</h2></div><span class="step-no">04</span></div>
    <div class="review-summary"><span>총 <b>${state.words.length}개</b></span><span>확인 필요 <b>${reviewCount}개</b></span></div>
    <div class="word-list">${state.words.map((word, index) => `<div class="word-row ${word.needs_review ? 'review' : ''}">
      <span class="row-no">${index + 1}</span>
      <input data-word-index="${index}" data-word-field="english" aria-label="${index + 1}번 영어" value="${esc(word.english)}" placeholder="English">
      <input data-word-index="${index}" data-word-field="korean" aria-label="${index + 1}번 한글 뜻" value="${esc(word.korean)}" placeholder="한글 뜻">
      <button class="remove-word" data-action="remove-word" data-index="${index}" aria-label="${index + 1}번 단어 삭제">×</button>
      ${word.issues?.length ? `<small class="issue-line">확인: ${esc(word.issues.join(' · '))}</small>` : ''}
    </div>`).join('')}</div>
    <button class="secondary" style="width:100%;margin-top:11px" data-action="add-word">＋ 단어 직접 추가</button>
  </section>`;
}

function publishCard() {
  if (!state.words.length) return '';
  return `<section class="forge-card">
    <div class="card-head"><div><div class="eyebrow" style="color:var(--violet)">OPEN THE GATE</div><h2>누가 플레이할 수 있나요?</h2></div><span class="step-no">05</span></div>
    <div class="visibility-options">
      <label><input type="radio" name="visibility" value="public" ${state.visibility === 'public' ? 'checked' : ''}><span>Public · 모두</span></label>
      <label><input type="radio" name="visibility" value="private" ${state.visibility === 'private' ? 'checked' : ''}><span>Private · 지정</span></label>
    </div>
    ${state.visibility === 'private' ? `<div class="field"><label for="access-ids">접근 허용 사용자 ID</label><textarea id="access-ids" data-state="accessIds" placeholder="UUID를 쉼표 또는 줄바꿈으로 구분">${esc(state.accessIds)}</textarea></div>` : ''}
    <p class="hint">AI 결과는 자동 공개되지 않습니다. 아래 버튼을 눌러야 학생들이 플레이할 수 있어요.</p>
    <div class="publish-actions">
      <button class="secondary" data-action="save-review" ${state.busy ? 'disabled' : ''}>검수 저장</button>
      <button class="primary" data-action="publish" ${state.busy ? 'disabled' : ''}>${state.mapStatus === 'published' ? '변경사항 다시 공개' : '맵 공개하기'} →</button>
    </div>
  </section>`;
}

function renderCreator() {
  return `<section class="creator-hero">
    <div class="eyebrow">CRYSTAL CREATOR WORKSHOP</div>
    <h1>사진 한 장으로<br>새로운 단어 모험을</h1>
    <p>AI가 영어와 한글 뜻을 찾으면, 선생님이 마지막으로 확인해 퀘스트 맵을 완성합니다.</p>
    <div class="identity-row"><span class="role-chip">${esc(state.profile.role)}</span><button class="link-button" data-action="logout">${esc(accountLabel())} · 로그아웃</button></div>
  </section>
  ${stepRail()}
  ${worldCard()}
  ${state.worldId ? uploadCard() : ''}
  ${state.worldId ? ratioCard() : ''}
  ${wordsCard()}
  ${publishCard()}`;
}

function render() {
  const root = $('creator-app');
  if (!state.ready) {
    root.innerHTML = '<div class="loading-card"><i></i><b>월드 공방을 여는 중…</b></div>';
  } else if (!state.profile || !['admin', 'teacher'].includes(state.profile.role)) {
    root.innerHTML = renderBlocked();
  } else {
    root.innerHTML = renderCreator();
  }
}

function returnToEntry() {
  const entryUrl = new URL('index.html', location.href);
  const creatorUrl = new URL('map-creator.html', location.href);
  if (params.has('db')) {
    entryUrl.searchParams.set('db', params.get('db'));
    creatorUrl.searchParams.set('db', params.get('db'));
  }
  entryUrl.searchParams.set('next', `${creatorUrl.pathname}${creatorUrl.search}`);
  location.replace(entryUrl.href);
}

function resetMap() {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  Object.assign(state, {
    mapId: '', mapStatus: 'draft', mapTitle: '', mapDescription: '', visibility: 'private', accessIds: '',
    total: 30, ratioA: 40, ratioB: 30, file: null, previewUrl: '', source: null, words: [],
    deletedWordIds: new Set(), processMessage: '',
  });
}

async function loadMaps() {
  state.maps = [];
  if (!state.worldId) return;
  const { data, error } = await supabase.from('maps')
    .select('id,title,description,visibility,status,total_question_count,type_a_ratio,type_b_ratio,type_c_ratio')
    .eq('world_id', state.worldId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  state.maps = data || [];
}

async function loadWorlds() {
  const { data, error } = await supabase.from('worlds').select('id,name,description,world_code').order('created_at');
  if (error) throw error;
  state.worlds = data || [];
  if (!state.worldId && state.worlds.length) state.worldId = state.worlds[0].id;
  await loadMaps();
}

async function loadMap(mapId) {
  resetMap();
  state.mapId = mapId;
  const map = state.maps.find(item => item.id === mapId);
  if (!map) return;
  Object.assign(state, {
    mapTitle: map.title,
    mapDescription: map.description,
    visibility: map.visibility,
    mapStatus: map.status,
    total: map.total_question_count,
    ratioA: map.type_a_ratio,
    ratioB: map.type_b_ratio,
  });
  const [{ data: words, error: wordsError }, { data: grants, error: grantsError }, { data: sources }] = await Promise.all([
    supabase.from('map_words').select('id,row_order,english,korean,needs_review,issues,review_status,source_image_id').eq('map_id', mapId).order('row_order'),
    supabase.from('map_access_grants').select('user_id').eq('map_id', mapId),
    supabase.from('map_source_images').select('id,bucket_id,object_path,mime_type,file_size,status').eq('map_id', mapId).order('created_at', { ascending: false }).limit(1),
  ]);
  if (wordsError) throw wordsError;
  if (grantsError) throw grantsError;
  state.words = words || [];
  state.accessIds = (grants || []).map(item => item.user_id).join('\n');
  state.source = sources?.[0] || null;
}

async function loadCreator() {
  state.ready = false;
  render();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    returnToEntry();
    return;
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    returnToEntry();
    return;
  }
  state.session = sessionData.session;
  state.user = userData.user;
  if (state.user) {
    const { data: profile, error } = await supabase.from('profiles').select('display_name,login_id,role').eq('user_id', state.user.id).maybeSingle();
    if (error) console.error(error);
    state.profile = profile;
    if (profile && ['admin', 'teacher'].includes(profile.role)) {
      try { await loadWorlds(); } catch (error) { state.processMessage = `오류: ${error.message}`; }
    }
  }
  state.ready = true;
  render();
}

async function persistMap(status = state.mapStatus === 'published' ? 'review' : 'draft') {
  if (!state.worldId) throw new Error('먼저 월드를 선택해 주세요.');
  if (!state.mapTitle.trim()) throw new Error('맵 이름을 입력해 주세요.');
  const value = allocation();
  const payload = {
    title: state.mapTitle.trim(),
    description: state.mapDescription.trim(),
    visibility: state.visibility,
    status,
    total_question_count: value.total,
    type_a_ratio: value.aRatio,
    type_b_ratio: value.bRatio,
    type_c_ratio: value.cRatio,
    updated_at: new Date().toISOString(),
  };
  if (state.mapId) {
    const { data, error } = await supabase.from('maps').update(payload).eq('id', state.mapId).select().single();
    if (error) throw error;
    state.mapStatus = data.status;
  } else {
    const { data, error } = await supabase.from('maps').insert({
      ...payload,
      world_id: state.worldId,
      owner_user_id: state.user.id,
    }).select().single();
    if (error) throw error;
    state.mapId = data.id;
    state.mapStatus = data.status;
    await loadMaps();
  }
  return state.mapId;
}

async function prepareImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('JPEG, PNG, WebP 사진만 올릴 수 있습니다.');
  if (file.size <= 4 * 1024 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .86));
  if (!blob) throw new Error('사진 크기를 줄이지 못했습니다.');
  if (blob.size > 6 * 1024 * 1024) throw new Error('사진을 6MB 이하로 줄여 다시 시도해 주세요.');
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'vocabulary'}.jpg`, { type: 'image/jpeg' });
}

async function uploadAndAnalyze() {
  state.busy = true;
  state.processMessage = '';
  render();
  try {
    const mapId = await persistMap('processing');
    if (state.file) {
      const file = await prepareImage(state.file);
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${state.user.id}/${mapId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('word-source-images').upload(path, file, {
        contentType: file.type,
        cacheControl: '0',
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: source, error: sourceError } = await supabase.from('map_source_images').insert({
        map_id: mapId,
        owner_user_id: state.user.id,
        object_path: path,
        mime_type: file.type,
        file_size: file.size,
      }).select().single();
      if (sourceError) {
        await supabase.storage.from('word-source-images').remove([path]);
        throw sourceError;
      }
      state.source = source;
      state.file = null;
    }
    if (!state.source) throw new Error('분석할 사진이 없습니다.');

    const { data, error } = await supabase.functions.invoke('process-map-ocr', {
      body: { mapId, sourceImageId: state.source.id },
    });
    if (error) {
      let detail = error.message;
      if (error.context instanceof Response) {
        try { detail = (await error.context.json()).error || detail; } catch {}
      }
      throw new Error(detail);
    }
    if (!data?.words?.length) throw new Error(data?.error || 'AI가 단어 쌍을 찾지 못했습니다.');
    state.words = data.words;
    state.mapStatus = 'review';
    state.processMessage = `${state.words.length}개의 단어 쌍을 찾았습니다. 노란 행을 특히 확인해 주세요.`;
    toast('AI 분석이 완료되었습니다');
  } catch (error) {
    state.processMessage = `오류: ${error.message}`;
    toast('사진 분석을 완료하지 못했습니다');
  } finally {
    state.busy = false;
    render();
  }
}

async function saveWords() {
  if (!state.mapId || !state.words.length) throw new Error('저장할 단어가 없습니다.');
  const cleaned = state.words.map((word, index) => ({
    ...word,
    row_order: index + 1,
    english: String(word.english || '').trim().replace(/\s+/g, ' '),
    korean: String(word.korean || '').trim().replace(/\s+/g, ' '),
  }));
  if (cleaned.some(word => !word.english || !word.korean)) throw new Error('영어와 한글 뜻이 비어 있는 행을 확인해 주세요.');

  if (state.deletedWordIds.size) {
    const { error } = await supabase.from('map_words').delete().in('id', [...state.deletedWordIds]);
    if (error) throw error;
    state.deletedWordIds.clear();
  }
  const existing = cleaned.filter(word => word.id);
  const added = cleaned.filter(word => !word.id);
  await Promise.all(existing.map(word => supabase.from('map_words').update({
    row_order: word.row_order,
    english: word.english,
    korean: word.korean,
    needs_review: false,
    issues: [],
    review_status: 'approved',
    updated_at: new Date().toISOString(),
  }).eq('id', word.id).then(({ error }) => { if (error) throw error; })));
  if (added.length) {
    const { error } = await supabase.from('map_words').insert(added.map(word => ({
      map_id: state.mapId,
      source_image_id: state.source?.id || null,
      owner_user_id: state.user.id,
      row_order: word.row_order,
      english: word.english,
      korean: word.korean,
      needs_review: false,
      issues: [],
      review_status: 'approved',
    })));
    if (error) throw error;
  }
  const { data, error } = await supabase.from('map_words')
    .select('id,row_order,english,korean,needs_review,issues,review_status,source_image_id')
    .eq('map_id', state.mapId)
    .order('row_order');
  if (error) throw error;
  state.words = data || [];
}

function accessUserIds() {
  const values = [...new Set(state.accessIds.split(/[\s,]+/).map(value => value.trim()).filter(Boolean))];
  const invalid = values.find(value => !uuidPattern.test(value));
  if (invalid) throw new Error(`사용자 ID 형식을 확인해 주세요: ${invalid}`);
  return values;
}

function validatePublish() {
  const value = allocation();
  const uniqueWords = new Set(state.words.map(word => word.english.trim().toLocaleLowerCase('en-US'))).size;
  if (value.a > 0 && uniqueWords < 4) throw new Error('Type A 4지선다를 위해 서로 다른 단어가 최소 4개 필요합니다.');
  if (value.b > 0 && uniqueWords < 5) throw new Error('Type B 연결형을 위해 서로 다른 단어가 최소 5개 필요합니다.');
  const ids = state.visibility === 'private' ? accessUserIds() : [];
  if (state.visibility === 'private' && !ids.length) throw new Error('Private 맵에 접근할 사용자 ID를 한 명 이상 입력해 주세요.');
  return { value, ids };
}

async function publishMap() {
  state.busy = true;
  render();
  try {
    await saveWords();
    const { value, ids } = validatePublish();
    const { error: mapError } = await supabase.from('maps').update({
      title: state.mapTitle.trim(),
      description: state.mapDescription.trim(),
      visibility: state.visibility,
      status: 'published',
      total_question_count: value.total,
      type_a_ratio: value.aRatio,
      type_b_ratio: value.bRatio,
      type_c_ratio: value.cRatio,
      updated_at: new Date().toISOString(),
    }).eq('id', state.mapId);
    if (mapError) throw mapError;

    const { error: deleteGrantError } = await supabase.from('map_access_grants').delete().eq('map_id', state.mapId);
    if (deleteGrantError) throw deleteGrantError;
    if (ids.length) {
      const { error: grantError } = await supabase.from('map_access_grants').insert(ids.map(userId => ({
        map_id: state.mapId,
        user_id: userId,
        owner_user_id: state.user.id,
        granted_by: state.user.id,
      })));
      if (grantError) throw grantError;
    }

    let purgeWarning = '';
    if (state.source?.object_path && state.source.status !== 'purged') {
      const { error: purgeError } = await supabase.storage.from('word-source-images').remove([state.source.object_path]);
      if (purgeError) {
        purgeWarning = ' 원본 사진 자동 삭제는 실패해 만료 정리가 필요합니다.';
      } else {
        await supabase.from('map_source_images').update({ status: 'purged', updated_at: new Date().toISOString() }).eq('id', state.source.id);
        state.source.status = 'purged';
      }
    }
    state.mapStatus = 'published';
    state.processMessage = `맵이 ${state.visibility === 'public' ? 'Public' : 'Private'}로 공개되었습니다.${purgeWarning}`;
    await loadMaps();
    toast('새 단어 모험이 공개되었습니다');
  } catch (error) {
    state.processMessage = `오류: ${error.message}`;
    toast('공개 조건을 확인해 주세요');
  } finally {
    state.busy = false;
    render();
  }
}

document.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  if (form.id === 'world-form') {
    const name = String(new FormData(form).get('worldName') || '').trim();
    if (!name) return toast('월드 이름을 입력해 주세요');
    state.busy = true;
    const { data, error } = await supabase.from('worlds').insert({ owner_user_id: state.user.id, name }).select().single();
    state.busy = false;
    if (error) return toast(`월드 생성 실패: ${error.message}`);
    state.worldId = data.id;
    resetMap();
    await loadWorlds();
    state.worldId = data.id;
    await loadMaps();
    render();
    toast('새 월드가 열렸습니다');
  }
});

document.addEventListener('change', async event => {
  const target = event.target;
  if (target.id === 'world-select') {
    state.worldId = target.value;
    resetMap();
    await loadMaps();
    render();
  } else if (target.id === 'map-select') {
    const id = target.value;
    if (!id) resetMap(); else await loadMap(id);
    render();
  } else if (['source-camera', 'source-gallery', 'source-file'].includes(target.id)) {
    const file = target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast('JPEG, PNG, WebP 사진만 선택해 주세요');
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.file = file;
    state.previewUrl = URL.createObjectURL(file);
    state.source = null;
    state.processMessage = '';
    render();
  } else if (target.name === 'visibility') {
    state.visibility = target.value;
    render();
  }
});

document.addEventListener('input', event => {
  const target = event.target;
  if (target.dataset.state) {
    const key = target.dataset.state;
    state[key] = key === 'total' ? Math.max(1, Math.min(500, Number(target.value) || 1)) : target.value;
    if (key === 'total') refreshAllocationDisplay();
    refreshActionAvailability();
  } else if (['ratio-a', 'ratio-b', 'ratio-c'].includes(target.id)) {
    setRatio(target.id.slice(-1), Number(target.value));
    refreshAllocationDisplay();
  } else if (target.dataset.wordIndex !== undefined) {
    const word = state.words[Number(target.dataset.wordIndex)];
    if (word) word[target.dataset.wordField] = target.value;
  }
});

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'logout') {
    await supabase.auth.signOut();
    returnToEntry();
  } else if (action === 'new-map') {
    resetMap();
    render();
  } else if (action === 'save-draft') {
    state.busy = true;
    try { await persistMap('draft'); toast('맵 초안을 저장했습니다'); } catch (error) { toast(`저장 실패: ${error.message}`); }
    state.busy = false;
    render();
  } else if (action === 'analyze') {
    await uploadAndAnalyze();
  } else if (action === 'remove-word') {
    const index = Number(button.dataset.index);
    const [removed] = state.words.splice(index, 1);
    if (removed?.id) state.deletedWordIds.add(removed.id);
    render();
  } else if (action === 'add-word') {
    state.words.push({ english: '', korean: '', needs_review: true, issues: ['직접 추가한 항목'], review_status: 'pending' });
    render();
  } else if (action === 'save-review') {
    state.busy = true;
    try { await saveWords(); await persistMap('review'); toast('검수 내용을 저장했습니다'); } catch (error) { state.processMessage = `오류: ${error.message}`; toast('검수 내용을 저장하지 못했습니다'); }
    state.busy = false;
    render();
  } else if (action === 'publish') {
    await publishMap();
  }
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (state.ready && session?.access_token !== state.session?.access_token) loadCreator();
});

loadCreator();
