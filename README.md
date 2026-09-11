# 율이의 판타지 영단어 퀘스트

영단어 퀴즈에 **판타지 RPG 캐릭터, 코인, 콤보, 상점, 현실 보상, 랭킹**을 결합한 가족용 영어 학습 게임입니다.

단순히 문제를 맞히는 것에서 끝나지 않고, 캐릭터를 만들고 스테이지에 반복 도전하면서 코인을 모아 아이템을 구매하거나 실제 보상을 신청할 수 있도록 구성했습니다.

- 플레이: https://heojoon.github.io/english-word-card-game/
- Repository: https://github.com/heojoon/english-word-card-game
- Frontend: GitHub Pages 정적 웹앱
- Android 테스트 APK: https://github.com/heojoon/english-word-card-game/releases/tag/android-v1.0.0-beta.1
- Backend / DB: Supabase

### Android 하이브리드 앱

동일한 웹게임을 Capacitor 8 기반 네이티브 Android 앱으로 빌드할 수 있습니다. 앱 ID는 `com.wordoria.crystalquest`이며 Android 7(API 24) 이상을 지원합니다.

```bash
npm install
npm run android:sync
npm run android:open
```

디버그 APK 또는 Play Store용 App Bundle 빌드:

```bash
npm run android:debug
npm run android:bundle
```

로컬 Android 빌드에는 JDK 21, Android Studio와 Android SDK 36이 필요합니다. `main`에 Android 관련 변경을 푸시하면 GitHub Actions의 **Android build** 워크플로가 디버그 APK를 14일간 아티팩트로 제공합니다.

현재 공개 테스트용 APK:

- Release: https://github.com/heojoon/english-word-card-game/releases/tag/android-v1.0.0-beta.1
- Direct APK: https://github.com/heojoon/english-word-card-game/releases/download/android-v1.0.0-beta.1/wordoria-crystal-quest-debug.apk
- Local artifact: `build-artifacts/wordoria-crystal-quest-debug.apk`
- SHA-256: `136d3644522cc92ec42d7dc4666e360a87dc9fc8ae492c49ec42fb7f28f8d37c`

이 APK는 debug signing으로 만든 직접 설치/테스트용 빌드입니다. Play Store 배포에는 release keystore, 서명 설정, AAB 생성, Play Console 등록이 별도로 필요합니다.

네이티브 앱에서는 다음 동작이 추가됩니다.

- Android 물리 뒤로가기: 모달 닫기 → 전투 일시정지 → 홈 이동 → 앱 종료
- 앱이 백그라운드로 이동할 때 전투 타이머 자동 일시정지
- 정답, 오답, 보물 획득 시 네이티브 햅틱 피드백
- 세로 화면 고정과 노치/시스템 바 안전 영역 대응
- Crystal Quest 전용 런처 아이콘과 스플래시 화면
- 앱 내부 `localhost`와 개발용 로컬 DB를 구분해 운영 Supabase HTTPS 사용

### Crystal Quest 정식 화면

메인 `/` 화면은 승인된 Crystal Quest 시안을 실제 게임 데이터와 연결한 버전입니다.

- 홈 / 장비 / 던전 / 전투 / 결과 / 상점의 모바일 우선 화면 전환
- Supabase 플레이어, 캐릭터, 코인, 인벤토리, 보상 신청, 기록 연동
- Stage 1~6 실제 단어 전체를 사용하는 양방향 4지선다 전투
- 직업 특성, 슬롯별 장비, 클리어 보물상자, 발음, 일시정지, 키보드 입력
- 로컬 DB 없이 UI를 체험할 때는 `/?demo=1` 사용

### 독립 플레이 시안

`playable-preview.html`은 승인된 1번 홈 화면을 실제 클릭 흐름으로 확장한 독립 HTML 시안입니다. 정적 서버에서 `/playable-preview.html`을 열면 됩니다.

- 홈 / 장비 / 던전 / 상점 전환, 직업별 남녀 8종 선택
- 더미 구매, 크리스털 잔액, 장착 외형, 현실 보상 신청
- 3개 던전과 각각 3개 스테이지, 공통 5문제 체험 전투, 일시정지, 발음, 정답/오답/시간 초과, 보물상자와 기록
- 상태는 `wordoria-playable-preview-v1` 키로 브라우저에 저장됩니다. 기존 게임 및 원격 DB 데이터와 연결하지 않습니다.
- 우측 상단 지갑에서 시안용 크리스털 충전, 페이지 아래에서 초기화 가능

장비는 SVG/CSS 레이어, 전투는 간단한 이동·피격 연출을 사용하는 인터랙션 시안입니다. 실제 애니메이션 리소스와 운영 게임 로직을 대체하지 않습니다.

---

## 1. 게임 기획

### 핵심 목표

1. 영단어 문제 풀이를 짧고 반복 가능한 게임으로 만든다.
2. 한 문제라도 틀리면 종료되는 서바이벌 방식으로 집중도를 높인다.
3. 캐릭터 성장과 코인 보상을 통해 반복 학습 동기를 만든다.
4. 획득한 코인은 아바타 아이템 또는 가족이 정한 현실 보상으로 사용할 수 있게 한다.
5. 스테이지를 여러 번 도전할 수 있게 하고 클리어 타임과 기록 경쟁 요소를 제공한다.

기본 플레이어는 `율이`, `아빠`, `손님`이며, 시작 화면의 **유저 추가** 버튼으로 가족 구성원을 더 등록할 수 있습니다.

추가한 유저 이름은 현재 브라우저에 저장됩니다. 해당 유저로 캐릭터를 만들면 기존 `game_characters.player` 구조를 통해 Supabase에도 연결되며, 다른 기기에서는 저장된 캐릭터를 기준으로 유저 목록을 다시 불러옵니다.

---

## 2. 현재 구현된 게임 규칙

### 문제 진행

- 각 스테이지의 단어 순서는 플레이할 때마다 무작위로 섞입니다.
- 각 문제는 다음 두 방식 중 하나로 무작위 출제됩니다.
  - **영어 → 한글 뜻**
  - **한글 뜻 → 영어**
- 객관식 4지선다입니다.
- 오답 보기는 가능한 한 품사와 철자/길이가 비슷한 단어를 우선 배치합니다.
- 한글 뜻에는 `[명]`, `[동]`, `[형]`, `[부]`, `[숙어]` 등의 품사가 함께 표시됩니다.

### 서바이벌 규칙

- 문제당 제한 시간은 **5초**입니다.
- 한 문제라도 틀리면 즉시 `GAME OVER`입니다.
- 제한 시간 안에 답하지 못해도 즉시 `GAME OVER`입니다.
- 실패한 스테이지도 횟수 제한 없이 다시 도전할 수 있습니다.
- 스테이지를 클리어하려면 모든 문제를 맞혀야 합니다.

### 영어 발음

브라우저의 Web Speech API를 사용합니다.

- 영어 문제가 표시될 때 `🔊` 버튼으로 발음을 들을 수 있습니다.
- **영어 → 한글** 문제에서 정답을 맞혀도 해당 영어 단어가 자동 발음됩니다.
- **한글 → 영어** 문제에서 정답 영어를 선택해도 자동 발음됩니다.
- 기본 발음 언어는 `en-US`입니다.

---

## 3. 코인 시스템

현재 코인 지급 규칙은 아래와 같습니다.

| 조건 | 지급 코인 |
| --- | ---: |
| 정답 1문제 | +1 |
| 5문제 연속 정답마다 | +1 |
| 스테이지 완전 클리어 | +10 |

콤보 보너스는 `5, 10, 15, 20, 25 ...`번째 연속 정답에서 각각 1코인씩 추가됩니다.

계산식은 다음과 같습니다.

```text
획득 코인 = 정답 수 + floor(정답 수 / 5) + 클리어 보너스
```

클리어 보너스는 스테이지를 완전히 클리어했을 때만 10코인이 추가됩니다.

예시:

```text
7문제 정답 후 실패
= 정답 7 + 5콤보 1
= 8코인

30문제 스테이지 클리어
= 정답 30 + 콤보 6 + 클리어 10
= 46코인
```

GAME OVER가 되어도 종료 전까지 맞힌 문제의 **정답 코인 + 콤보 코인**은 지급됩니다.

클리어 타임의 개인 최고기록 및 스테이지 최고기록은 계속 저장/랭킹에 활용하지만, 현재는 최고기록 자체에 별도 코인을 지급하지 않습니다.

---

## 4. 캐릭터 시스템

게임 시작 전에 플레이어별 캐릭터를 만들고 선택합니다.

현재 직업은 4종입니다.

| Class | 표시명 | 남성 이미지 | 여성 이미지 |
| --- | --- | --- | --- |
| `warrior` | 전사 | `assets/avatars/warrior.webp` | `assets/avatars/variants/warrior-female.webp` |
| `mage` | 마법사 | `assets/avatars/mage.webp` | `assets/avatars/variants/mage-female.webp` |
| `pugilist` | 권투사 | `assets/avatars/variants/pugilist-male.webp` | `assets/avatars/pugilist.webp` |
| `ranger` | 궁수 | `assets/avatars/variants/ranger-male.webp` | `assets/avatars/ranger.webp` |

캐릭터 생성 시 다음을 선택합니다.

- 캐릭터 이름
- 직업
- 외형 (남성/여성)
- 오라 색상

오라 색상은 현재 보라, 빨강, 파랑, 초록, 금색을 지원합니다.

각 직업은 남성/여성 기본 외형을 하나씩 제공합니다. 생성 화면에서 선택한 외형은 캐릭터 카드와 문제 풀이 화면의 미니 아바타까지 동일하게 유지됩니다.

캐릭터별로 다음 정보가 독립적으로 관리됩니다.

- 이름
- 플레이어
- 직업
- 외형 (`avatar_variant`)
- 오라 색상
- 보유 코인
- 장착 아이템
- 플레이 기록
- 스테이지별 클리어 타임

---

## 5. 상점 / 보상 시스템

코인으로 두 종류의 상품을 사용할 수 있습니다.

### 아바타 아이템

현재 구현 예시:

- 황금 왕관
- 불꽃 망토
- 별빛 오라
- 천사 날개

구매한 아바타 아이템은 인벤토리에 저장되고 캐릭터에 장착할 수 있습니다.

현재 일부 아이템은 아이콘 형태로 캐릭터에 표시되며, 향후 실제 캐릭터 이미지 위에 장비가 시각적으로 합성되는 방식으로 확장할 예정입니다.

### 현실 보상

현재 구현 예시:

- 간식 1개
- 원하는 음료 1잔
- 소원권 1회

현실 보상은 구매 즉시 지급되는 방식이 아닙니다.

```text
코인 사용 → 교환 신청 → 보호자 승인 대기 → 실제 지급
```

`reward_redemptions` 테이블에 신청 내역과 상태를 저장합니다.

상태 예시:

- `pending` : 승인 대기
- `approved` : 승인
- `fulfilled` : 지급 완료
- `cancelled` : 취소

---

## 6. 스테이지 구성

현재 Stage 1 ~ Stage 6까지 구현되어 있습니다.

| Stage | 구성 | 문제 수 |
| --- | --- | ---: |
| Stage 1 | Day 11 · 12 | 60 |
| Stage 2 | 영단어 세트 | 50 |
| Stage 3 | Day 01 + Unit 01 | 51 |
| Stage 4 | Day 14 + Unit Words | 54 |
| Stage 5 | Day 15 + Unit 02 | 55 |
| Stage 6 | Day 15 | 30 |

단어 데이터 형식은 다음과 같습니다.

```js
['declare', '동', '선언하다, 표명하다']
```

기본 스테이지 데이터는 `stages.js`, Stage 6 데이터는 `stage6.js`에 분리되어 있습니다.

새 스테이지 추가 시 동일한 구조로 `window.QUIZ_STAGES`에 등록하면 게임과 랭킹 UI가 자동으로 스테이지를 인식합니다.

---

## 7. 클리어 타임 / 랭킹

각 문제에 답하는 실제 소요 시간을 누적하여 클리어 타임을 계산합니다.

정답 후 다음 문제로 넘어가는 연출 대기시간은 클리어 타임 계산에서 제외합니다.

현재 다음 데이터를 제공합니다.

- 선택한 Stage의 캐릭터별 최고 기록
- 클리어 타임 비교
- 캐릭터별 보유 코인 랭킹
- 플레이어별 Stage 최고 기록
- 최근 플레이 기록
- 게임별 획득 코인

스테이지는 무제한 재도전할 수 있으므로 이전 기록보다 빠른 클리어 타임을 계속 노릴 수 있습니다.

---

## 8. 기술 구성

### Frontend

프레임워크 없이 정적 HTML/CSS/JavaScript로 구성되어 있습니다.

```text
Browser
 ├─ index.html
 ├─ stages.js / stage6.js
 ├─ crystal-game.js
 ├─ mobile/native-entry.js
 ├─ native-bridge.js
 ├─ playable-preview.css / crystal-game.css
 └─ assets/avatars/*.webp
```

주요 브라우저 기능:

- Web Speech API
- `SpeechSynthesisUtterance`
- `performance.now()` 기반 제한시간/클리어타임 계산
- `localStorage`에는 선택한 캐릭터 ID 등 일부 UI 상태만 저장

핵심 게임/캐릭터/코인 데이터는 Supabase에 저장됩니다.

### Android Native Shell

Capacitor 8로 동일한 `dist/` 웹 번들을 Android WebView에 싣습니다.

```text
Capacitor Android
 ├─ capacitor.config.json
 ├─ mobile/native-entry.js
 ├─ native-bridge.js
 └─ android/
```

`mobile/native-entry.js`는 네이티브 환경에서만 로드되는 브리지 코드입니다. 앱 상태 변경, Android 뒤로가기, 햅틱 피드백을 처리하고 웹 브라우저에서는 기존 정적 게임처럼 동작합니다.

### Backend

별도의 애플리케이션 서버 없이 Supabase의 PostgreSQL + REST/RPC를 사용합니다.

```text
GitHub Pages
     ↓
Supabase REST API / RPC
     ↓
PostgreSQL
```

브라우저에는 Supabase **publishable key**만 사용하며 service-role/secret key는 포함하지 않습니다.

---

## 9. 주요 파일

```text
.
├── index.html
├── crystal-game.js
├── crystal-game.css
├── mobile/
│   └── native-entry.js
├── android/
│   ├── app/
│   └── gradlew
├── capacitor.config.json
├── package.json
├── playable-preview.css
├── stages.js
├── stage6.js
├── assets/
│   └── avatars/
│       ├── warrior.webp
│       ├── mage.webp
│       ├── pugilist.webp
│       └── ranger.webp
├── .nojekyll
└── README.md
```

### `index.html`

- 메인 UI
- 캐릭터 생성 모달
- 상점 모달
- 문제 / 결과 / 랭킹 화면
- 모바일 반응형 CSS

### `crystal-game.js`

- 게임 진행 로직
- 5초 타이머
- 서바이벌 판정
- 발음
- 콤보 / 코인 UI
- Supabase REST/RPC 연동
- 캐릭터 관리
- 상점 / 장착
- 최근 기록 / 랭킹
- 직업 특성 / 보물상자
- 슬롯별 장비 외형

### `stages.js`, `stage6.js`

- 영단어 데이터
- Stage 메타데이터

### `avatar-art.js`

- 전사 / 마법사 / 권투사 / 궁수 이미지 적용
- 캐릭터 생성 화면 이미지
- 캐릭터 카드 이미지
- 게임 화면 미니 아바타 이미지

### `mobile/native-entry.js`

- Capacitor App/Haptics 플러그인 연결
- Android 물리 뒤로가기 처리
- 앱 백그라운드 진입 시 전투 일시정지
- 정답, 오답, 보상 이벤트 햅틱 피드백

### `capacitor.config.json`, `android/`

- Android 앱 ID와 앱 이름 설정
- `dist/` 웹 번들을 네이티브 앱 자산으로 동기화
- Android 런처 아이콘, 스플래시, 화면 방향, WebView 설정

---

## 10. Supabase 데이터 모델

현재 핵심 테이블은 다음과 같습니다.

### `game_characters`

캐릭터와 현재 코인 잔액을 관리합니다.

주요 컬럼:

```text
id
player
name
class
accent
coins
equipped_item_id
created_at
```

### `game_scores`

매 게임 결과를 저장합니다.

```text
id
player
stage
correct
total
cleared
character_id
duration_ms
coins_earned
created_at
```

### `coin_ledger`

코인 변동 내역을 장부 방식으로 저장합니다.

현재 주요 적립 사유:

```text
question_reward
combo_bonus
stage_clear_bonus
```

구매/교환 시 차감 내역도 저장됩니다.

### `shop_items`

상점 상품 정보를 저장합니다.

```text
id
code
name
category
price
icon
description
repeatable
active
```

### `character_inventory`

캐릭터가 구매한 아바타 아이템을 저장합니다.

### `reward_redemptions`

현실 보상의 교환 신청과 처리 상태를 저장합니다.

---

## 11. Supabase RPC

### `award_game_result`

게임 종료 시 서버에서 결과와 코인을 한 번에 처리합니다.

서버에서 직접 계산하므로 브라우저가 최종 코인 금액을 임의로 전달하지 않습니다.

처리 내용:

1. 캐릭터 확인
2. 정답 수 / 클리어 여부 검증
3. 정답 코인 계산
4. 5단위 콤보 보너스 계산
5. 클리어 +10 계산
6. `game_scores` 저장
7. `game_characters.coins` 증가
8. `coin_ledger` 기록
9. 최고 클리어타임 여부 계산

### `purchase_shop_item`

- 코인 잔액 검증
- 아이템 구매 또는 현실 보상 교환 신청
- 코인 차감
- 인벤토리 / 교환신청 / 코인장부 기록

### `equip_avatar_item`

보유한 아바타 아이템을 현재 캐릭터에 장착합니다.

---

## 12. 데이터 보안

현재 핵심 Supabase 테이블에는 RLS(Row Level Security)가 활성화되어 있습니다.

브라우저에는 공개 사용을 전제로 하는 publishable key만 포함되어 있습니다.

다만 현재 버전은 가족용 프로토타입 성격으로 기본 유저와 직접 추가한 닉네임을 선택하는 구조이며 별도 사용자 로그인 인증은 없습니다.

외부 공개 서비스로 확장할 경우 다음 작업이 필요합니다.

- Supabase Auth 적용
- 사용자별 캐릭터 소유권 연결
- RLS 정책을 `auth.uid()` 기준으로 강화
- 현실 보상 승인용 보호자/관리자 화면 분리
- 관리자 전용 상품 등록/수정 권한 구성

---

## 13. 로컬 개발 및 배포

### 로컬 개발

Supabase CLI와 Docker를 실행한 상태에서 다음 순서로 시작합니다.

```bash
supabase start
supabase db reset --local
python3 -m http.server 3000
```

브라우저에서 `http://127.0.0.1:3000`을 열면 앱이 로컬 Supabase(`127.0.0.1:54321`)를 자동으로 사용합니다. `?db=remote`를 붙이면 localhost에서도 원격 DB를 명시적으로 사용할 수 있습니다.

로컬 DB는 `supabase/migrations/`의 스키마와 `supabase/seed.sql`의 비민감 상점 데이터로 재구성됩니다. 운영 캐릭터와 플레이 기록은 로컬로 복사하지 않습니다.

### DB 배포

```bash
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
```

모든 DB 변경은 먼저 migration으로 만들고 `supabase db reset --local`로 검증한 뒤 배포합니다.

### 프런트엔드 배포

현재 GitHub Pages로 배포합니다.

```text
main branch push
    ↓
GitHub Pages
    ↓
https://heojoon.github.io/english-word-card-game/
```

정적 파일이기 때문에 별도의 빌드 과정 없이 실행할 수 있습니다.

캐시가 남는 경우 쿼리스트링 버전을 붙여 테스트할 수 있습니다.

```text
https://heojoon.github.io/english-word-card-game/?v=YYYYMMDD-N
```

### Android 테스트 배포

Android 테스트 배포는 GitHub Actions와 GitHub Releases를 사용합니다.

```text
main branch push
    ↓
Android build workflow
    ↓
debug APK artifact
    ↓
GitHub prerelease
```

현재 테스트 릴리즈는 `android-v1.0.0-beta.1`입니다.

```text
https://github.com/heojoon/english-word-card-game/releases/tag/android-v1.0.0-beta.1
```

Play Store 운영 배포로 전환할 때는 debug APK가 아니라 release signing이 적용된 AAB를 기준 산출물로 사용합니다.

---

## 14. 향후 개발 방향

현재 기획을 기준으로 다음 기능을 확장할 수 있습니다.

- 캐릭터 레벨 / 경험치 시스템
- 직업별 스킬 및 연출
- 코인 획득 애니메이션
- 5 / 10 / 20 / 30 콤보별 시각 효과 강화
- 검, 갑옷, 지팡이, 망토 등을 실제 캐릭터 외형에 합성
- 희귀도(Common / Rare / Epic / Legendary) 아이템
- 일일 퀘스트 / 주간 퀘스트
- 연속 학습 보너스
- 보스 스테이지
- 오답 복습 전용 던전
- 보호자용 현실 선물 승인 화면
- Supabase Auth 기반 개인 계정
- 스테이지 관리용 관리자 화면
- 사진에서 단어를 추출해 신규 Stage를 추가하는 관리 흐름
- Android release signing / Play Store AAB 배포
- 푸시 알림과 앱 업데이트 안내

---

## 현재 버전 요약

이 프로젝트는 초기의 단순 영단어 카드 게임에서 현재 다음 구조의 **판타지 학습 RPG**로 확장되었습니다.

```text
캐릭터 생성
   ↓
직업 선택
   ↓
Stage 선택
   ↓
5초 서바이벌 영단어 퀴즈
   ↓
정답 / 콤보 코인 획득
   ↓
Stage Clear 보너스
   ↓
Supabase 기록 저장
   ↓
랭킹 / 최고 기록 경쟁
   ↓
상점에서 아바타 또는 현실 보상 구매
   ↓
Android APK로 직접 설치 테스트
   ↓
반복 도전
```

학습 자체는 빠르고 단순하게 유지하면서, 반복 학습의 동기를 RPG 성장과 보상 시스템으로 만드는 것이 현재 프로젝트의 핵심 방향입니다.
