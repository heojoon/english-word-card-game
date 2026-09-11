# 판타지 영단어 RPG 게임 기획서

> 문서 버전: v0.3
> 상태: Phase 1 구현 반영 / Phase 2 설계 기준
> 프로젝트: `heojoon/english-word-card-game`
> 확정 아트 방향: **01 · 크리스털 퀘스트** (`ART_DIRECTION.md`)

## 1. 프로젝트 개요

### 1.1 프로젝트 목적

현재의 영단어 객관식 퀴즈 프로토타입을 **상용 버전의 판타지 RPG형 단어 학습 게임**으로 확장한다.

핵심 컨셉은 단순한 `문제 풀이 → 점수 표시`가 아니라 다음 구조다.

> **Study = Battle**  
> 영단어 문제를 맞히는 행위 자체가 캐릭터의 공격이며, 정답이 곧 전투 진행과 성장으로 연결된다.

사용자는 자신만의 계정을 만들고, 캐릭터를 생성한 뒤 던전에 진입하여 영단어 문제를 풀면서 몬스터를 쓰러뜨린다. 정답을 맞힐수록 경험치와 코인을 얻고, 스테이지를 클리어하면 보물상자를 열어 추가 보상을 얻는다. 획득한 코인으로 캐릭터를 꾸미거나, 향후 보호자가 등록한 현실 보상을 교환할 수 있다.

### 1.2 장르

- 영어 단어 학습
- 객관식 퀴즈
- 횡스크롤 판타지 RPG
- 캐릭터 성장
- 아이템 수집
- 코인 경제
- 랭킹/기록 경쟁

### 1.3 플랫폼

1차:

- Web
- PWA
- GitHub Pages 또는 상용 CDN/Hosting
- 모바일 세로 화면 우선

2차:

- Android
- iOS
- 태블릿
- 데스크톱 웹

### 1.4 타깃 사용자

주요 타깃:

- 초등 고학년
- 중학생
- 영어 단어 암기가 필요한 학생
- 반복 학습 동기를 게임으로 강화하고 싶은 사용자

보조 타깃:

- 자녀 학습을 관리하는 부모
- 학교/학원 단위 운영자

---

## 2. 비주얼 컨셉

### 2.1 전체 디자인 방향

게임의 확정 비주얼 방향은 **01 · 크리스털 퀘스트**다. 밝고 세련된 캐주얼 판타지를 기반으로 학습 정보는 선명하게, 성장과 보상은 크리스털처럼 반짝이게 표현한다.

핵심 디자인 언어:

- 보라, 민트, 골드 중심의 밝은 팔레트
- 둥근 패널, 유리 크리스털, 소프트 광원
- 모바일에서 즉시 읽히는 캐릭터와 아이템 실루엣
- 정답, 콤보, 레벨업, 보물상자에 집중된 짧고 선명한 보상 연출
- 캐릭터 장비가 실제 외형에 반영되는 수집 경험
- 상단 전투와 하단 학습 영역의 명확한 시각적 위계

고전 판타지 RPG의 모험과 전투 감성은 게임 구조에 유지하되, 도트/레트로 아케이드 UI를 주된 스타일로 사용하지 않는다. 제작 세부 규칙, 색상 토큰, 캐릭터·상점·아이템·상태창 기준은 `ART_DIRECTION.md`를 단일 기준으로 사용한다.

상용화 시에는 기존 게임 IP의 캐릭터, UI, 몬스터, 배경을 그대로 복제하지 않고 **독자적 캐릭터/세계관/아트**를 사용한다. 승인된 브라우저 레퍼런스는 `art-direction.html?concept=crystal`에서 확인한다.

### 2.2 화면 구성 방향

게임 플레이 화면 기준:

- 상단 약 1/3: RPG 전투 화면
- 하단 약 2/3: 영단어 문제 영역

예시:

```text
┌──────────────────────────────┐
│ LV.12 블리자드        🪙 530 │
│                              │
│  🧙 → → →                👹  │
│   [2D 크리스털 전투 연출]     │
│                              │
│ ███████████░░░░  18 / 30    │
├──────────────────────────────┤
│                              │
│          survive             │
│                              │
│   ① 살아남다                 │
│   ② 조사하다                 │
│   ③ 지우다                   │
│   ④ 반복하다                 │
│                              │
│          ⏱ 3.8               │
└──────────────────────────────┘
```

정답 시:

```text
🧙 ✨──────▶ 👹💥

정답!
+1 Coin
8 COMBO
```

---

## 3. 사용자 계정 시스템

### 3.1 사용자 생성 흐름

현재 Phase 1 프로토타입은 기본 플레이어 `율이`, `아빠`, `손님`을 제공하고, 시작 화면에서 닉네임 기반 유저를 추가할 수 있다.

현재 흐름:

```text
기본 유저 선택 또는 유저 추가
→ 유저 이름 입력
→ 입력 검증 및 중복 확인
→ 새 유저 자동 선택
→ 캐릭터 생성
→ 스테이지 선택
```

현재 유저 이름 규칙:

- 1~12자
- 한글, 영문, 숫자, 공백, `_`, `-` 허용
- 앞뒤 공백 금지
- 대소문자를 구분하지 않는 중복 이름 금지
- 추가한 이름과 마지막 선택 유저는 브라우저 `localStorage`에 저장
- 캐릭터를 생성한 유저는 `game_characters.player`를 통해 다른 기기에서도 목록에 복원

이 Phase 1 유저는 편의를 위한 로컬 프로필이며 인증 계정이 아니다. 누구나 다른 유저를 선택할 수 있으므로 소유권이나 개인정보 경계로 사용하지 않는다.

Phase 2에서는 닉네임 선택 방식을 실제 계정 시스템으로 변경한다.

목표 흐름:

```text
회원 생성
→ 사용자 ID 또는 닉네임 입력
→ 개인 비밀번호 생성
→ 비밀번호 확인
→ 계정 생성
→ 로그인
→ 캐릭터 생성 또는 선택
```

### 3.2 인증 정책

현재 프로토타입:

- 인증 없음
- publishable key를 사용하는 가족용 공개 클라이언트
- 닉네임 단위 캐릭터 및 기록 구분

Phase 2 MVP:

- 닉네임 또는 사용자 ID
- 비밀번호

상용화:

- Supabase Auth 기반 인증 권장
- 이메일 로그인 옵션
- Google 로그인
- Apple 로그인
- 부모/자녀 계정 관계

### 3.3 비밀번호 보안

비밀번호는 절대 평문으로 DB에 저장하지 않는다.

필수 원칙:

- 인증 시스템에서 안전하게 해시 처리
- 세션 토큰 사용
- RLS 기반 사용자별 데이터 접근 제한
- 클라이언트 코드에 관리자 권한 키 금지

### 3.4 유저 추가 완료 기준

- 기본 3명의 기존 캐릭터와 기록이 그대로 유지된다.
- 새 이름을 등록하면 해당 유저가 즉시 선택된다.
- 새 유저로 캐릭터 생성, 게임 결과 저장, 코인 지급이 동작한다.
- 새로고침 후 마지막 선택 유저와 추가 유저 목록이 유지된다.
- 캐릭터가 저장된 유저는 다른 브라우저에서도 Supabase 데이터를 통해 발견된다.
- 잘못된 이름과 중복 이름은 클라이언트와 DB 양쪽에서 거부된다.

---

## 4. 캐릭터 시스템

### 4.1 캐릭터 생성

사용자는 계정 생성 이후 하나 이상의 캐릭터를 생성할 수 있다.

필수 입력 항목:

- 캐릭터 이름
- 직업
- 기본 외형 (직업별 남성/여성 중 선택)
- 오라/테마 색상

추후 확장:

- 추가 체형
- 얼굴
- 머리
- 머리색
- 피부색
- 기본 의상
- 시작 장비

### 4.2 초기 직업

초기 상용 버전의 직업은 5종이다.

1. 전사 Warrior
2. 도적 Rogue
3. 마법사 Mage
4. 권투가 Fighter
5. 궁수 Archer

### 4.3 캐릭터 상태창

캐릭터 선택 후 홈 화면에서 캐릭터 상태를 확인할 수 있다.

표시 정보:

```text
LV. 12
블리자드
마법사

HP             120
EXP        650 / 1000
Coin           1,250

최고 Combo        24
클리어 Stage       18
정답률             91%
총 플레이 시간
```

캐릭터 상태창에서 제공할 기능:

- 장비 확인
- 장비 변경
- 상점 이동
- 인벤토리
- 레벨/EXP 확인
- 스테이지 기록
- 최고 콤보
- 정답률
- 누적 정답 수
- 던전 입장

---

## 5. 레벨 및 경험치 시스템

### 5.1 경험치 획득

기본안:

- 정답 1문제: EXP +10
- 스테이지 클리어: EXP +100

초기 밸런스 예시:

```text
LV 1 → 2 : 100 EXP
LV 2 → 3 : 150 EXP
LV 3 → 4 : 220 EXP
LV 4 → 5 : 300 EXP
```

중장기 계산식 후보:

```text
필요 EXP = 100 × Level^1.4
```

### 5.2 레벨업 효과

레벨업 시:

- 레벨업 애니메이션
- 신규 장비 해금
- 신규 던전 해금
- 신규 외형 해금
- 업적 해금

예:

```text
LV 5  : 고급 상점 해금
LV 10 : Dungeon 2 해금
LV 20 : 전직 또는 특수 퀘스트 해금
```

초기 상용화에서는 레벨이 문제 난이도를 직접 낮추는 구조보다, **콘텐츠/꾸미기/도전 요소를 해금하는 역할**을 우선한다.

---

## 6. 핵심 게임 루프

```text
로그인
  ↓
캐릭터 선택
  ↓
캐릭터 상태 확인 / 장비 변경
  ↓
던전 선택
  ↓
스테이지 선택
  ↓
영단어 문제
  ↓
정답
  ↓
캐릭터 공격
  ↓
몬스터 처치
  ↓
EXP + Coin
  ↓
다음 몬스터
  ↓
연속 정답 → Combo
  ↓
보스 또는 최종 문제
  ↓
Stage Clear
  ↓
Treasure Chest
  ↓
랜덤 보너스 코인
  ↓
레벨업 / 상점 / 다음 던전
```

### 6.1 30초 마이크로 루프

한 문제 단위의 경험은 다음 네 단계가 30초 이내에 반복되는 것을 기준으로 한다.

```text
ACTION   : 5초 안에 정답 선택
FEEDBACK : 정답/오답, 발음, 공격 또는 피격 연출
REWARD   : Coin, Combo, 진행도, 향후 EXP
REPEAT   : 다음 몬스터 또는 재도전
```

서바이벌의 긴장감은 유지하되 실패 전까지 얻은 코인을 보존하여, 한 번의 실수가 전체 학습 성과를 무효화하지 않도록 한다.

---

## 7. 문제 시스템

### 7.1 현재 기본 문제 유형

현재 프로토타입의 문제 유형을 유지한다.

- 영어 → 한글 뜻
- 한글 뜻 → 영어
- 4지선다
- 문제 순서 랜덤
- 출제 방향 랜덤

### 7.2 오답 보기 생성

오답 보기는 가능한 한 다음 조건을 우선한다.

- 같은 품사
- 비슷한 철자
- 비슷한 단어 길이
- 의미가 헷갈릴 수 있는 단어

### 7.3 품사 표시

뜻 보기에는 다음과 같이 품사를 표시한다.

```text
[명] 단어 뜻
[동] 단어 뜻
[형] 단어 뜻
[부] 단어 뜻
[숙어] 숙어 뜻
```

### 7.4 향후 문제 유형

추후 다음 문제 타입 추가:

- 빈칸 채우기
- 철자 맞추기
- 듣고 맞추기
- 문장 속 의미
- 유의어
- 반의어
- 단어 조합
- 문맥 선택

---

## 8. 제한시간 및 게임 오버

### 8.1 기본 제한시간

기본 문제 제한시간:

```text
5초
```

### 8.2 Survival Mode

현재 핵심 모드는 Survival이다.

- 오답 시 즉시 GAME OVER
- 시간 초과 시 즉시 GAME OVER

### 8.3 향후 Normal Mode

상용화 확장 시 다음 모드를 추가할 수 있다.

- HP 기반
- 오답 시 HP 감소
- HP 0 시 GAME OVER

초기에는 Survival을 기본 모드로 유지한다.

---

## 9. 전투 연출

### 9.1 정답 처리

정답을 누르면:

```text
정답 판정
→ 공격 애니메이션
→ Damage 표시
→ 몬스터 피격
→ 몬스터 사망
→ Coin/EXP 표시
→ 캐릭터 전진
→ 다음 몬스터 등장
```

### 9.2 오답 처리

오답 또는 시간 초과:

```text
몬스터 공격
→ 캐릭터 피격
→ 캐릭터 쓰러짐
→ GAME OVER
```

### 9.3 기본 캐릭터 애니메이션

모든 직업 공통:

- Idle
- Walk
- Attack
- Hit
- Victory
- Dead

직업별:

- 전사: Sword Slash
- 도적: Dagger Attack
- 마법사: Magic Cast
- 권투가: Punch / Uppercut
- 궁수: Bow Shot

---

## 10. 코인 시스템

### 10.1 현재 확정 기본 규칙

정답 1문제:

```text
+1 Coin
```

5의 배수 콤보:

```text
5 Combo  → +1 Coin
10 Combo → +1 Coin
15 Combo → +1 Coin
20 Combo → +1 Coin
...
```

스테이지 클리어:

```text
+10 Coin
```

게임 오버되더라도 그전까지 획득한 정답 코인과 콤보 코인은 지급한다.

### 10.2 30문제 기본 스테이지 예시

일반 캐릭터가 30문제를 모두 맞힌 경우:

```text
정답            30 Coin
5단위 Combo       6 Coin
Stage Clear      10 Coin
Treasure Chest 10~30 Coin
────────────────────────
총              56~76 Coin
```

---

## 11. 콤보 시스템

### 11.1 일반 규칙

연속 정답 수를 Combo로 표시한다.

일반 캐릭터 보너스 시점:

```text
5 / 10 / 15 / 20 / 25 / 30 ...
```

각 시점마다:

```text
+1 Bonus Coin
```

### 11.2 표시 연출

예:

```text
5 COMBO!
BONUS +1 COIN
```

높은 콤보에서는 UI 연출을 강화한다.

예:

- 10 Combo: 화면 이펙트 강화
- 20 Combo: 황금 텍스트
- 30 Combo: 특별 배지

---

## 12. 스테이지 클리어 및 보물상자

### 12.1 클리어 흐름

마지막 몬스터 또는 보스를 쓰러뜨리면:

```text
STAGE CLEAR
→ 캐릭터 Victory
→ 캐릭터 전진
→ 보물상자 등장
→ 사용자가 상자 클릭
→ 상자 오픈 애니메이션
→ 랜덤 보상
```

### 12.2 보물상자 기본 보상

일반 캐릭터:

```text
10 ~ 30 Coin
```

기본 보상 확률 예시:

| 구간 | 확률 |
|---|---:|
| 10~14 Coin | 35% |
| 15~19 Coin | 30% |
| 20~24 Coin | 20% |
| 25~29 Coin | 12% |
| 30 Coin | 3% |

확률값은 운영 데이터에 따라 변경 가능하게 한다.

---

## 13. 직업 특성

직업은 외형뿐 아니라 플레이 방식에 영향을 준다.

### 13.1 전사 Warrior

특성명: **강인함**

효과:

- 각 문제 시작 시 일정 확률로 제한시간 +1초

초기 제안:

```text
15% 확률
5초 → 6초
```

연출:

```text
⚔ WARRIOR SKILL!
TIME +1
```

### 13.2 도적 Rogue

특성명: **행운의 손**

효과:

- 정답 시 일정 확률로 추가 Coin +1

초기 제안:

```text
15% 확률
```

예:

```text
기본 정답 +1 Coin
Lucky 발동 +1 Coin
총 +2 Coin
```

연출:

```text
💰 LUCKY!
BONUS +1 COIN
```

### 13.3 마법사 Mage

특성명: **Time Stop**

효과:

- 문제별로 일정 확률로 타이머가 잠시 멈춘다.

초기 제안:

```text
10% 확률
1.5초 정지
```

연출:

```text
❄ TIME STOP
```

타이머 숫자는 그대로 유지되고 정지 시간이 끝난 뒤 다시 감소한다.

### 13.4 권투가 Fighter

특성명: **Combo Master**

일반 캐릭터:

```text
5 Combo 단위 보너스
```

권투가:

```text
3 Combo 단위 보너스
3 / 6 / 9 / 12 / 15 ...
```

각 구간마다:

```text
+1 Coin
```

30문제를 모두 맞히면 일반 캐릭터는 콤보 보너스 6회, 권투가는 10회를 얻는다.

### 13.5 궁수 Archer

특성명: **Treasure Hunter**

효과:

- 스테이지 클리어 보물상자의 최소 보상을 높인다.

일반:

```text
10 ~ 30 Coin
```

궁수:

```text
20 ~ 30 Coin
```

연출:

```text
🏹 TREASURE HUNTER!
MINIMUM REWARD 20
```

### 13.6 직업 밸런스 초기값

| 직업 | 특성 | 초기 권장값 |
|---|---|---:|
| 전사 | 문제 시간 +1초 | 15% |
| 도적 | 정답 추가 +1 Coin | 15% |
| 마법사 | Timer Stop | 10%, 1.5초 |
| 권투가 | 3 Combo마다 +1 Coin | 상시 |
| 궁수 | 상자 최소 20 Coin | 상시 |

직업 특성값은 관리자 설정 또는 DB Configuration으로 분리해 코드 배포 없이 조정 가능하게 한다.

---

## 14. 몬스터 시스템

### 14.1 기본 구조

한 문제 = 한 몬스터를 기본 개념으로 한다.

예:

Dungeon 1:

- Slime
- Bat
- Goblin
- Skeleton

Dungeon 2:

- Orc
- Ghost
- Dark Knight
- Wizard

Dungeon 3:

- Golem
- Wyvern
- Demon
- Dragon Hatchling

### 14.2 몬스터 난이도

초기에는 몬스터 스탯이 문제 난이도에 직접 영향을 주지 않아도 된다.

몬스터의 역할:

- 시각적 진행감
- 스테이지 테마 제공
- 정답의 즉각적 게임 보상

향후:

- 몬스터별 문제 타입
- 특정 단어 카테고리
- 보스 특수 패턴

등으로 확장할 수 있다.

---

## 15. 보스 시스템

초기안:

- 각 스테이지의 마지막 문제를 Boss로 설정

예:

```text
1~29 : 일반 몬스터
30   : Boss
```

Boss 문제 정답 시:

```text
CRITICAL!
BOSS DEFEATED
```

이후:

```text
STAGE CLEAR
→ Treasure Chest
```

---

## 16. 상점 및 인벤토리

### 16.1 상점 구분

상점은 크게 두 카테고리로 운영한다.

#### Avatar Shop

- 모자
- 왕관
- 머리 장식
- 옷
- 갑옷
- 무기
- 망토
- 날개
- 오라
- 펫

#### Reward Shop

현실 보상:

- 간식
- 음료
- 게임시간 추가
- 외식
- 용돈
- 소원권
- 부모가 직접 등록한 보상

### 16.2 장비 슬롯

초기 장비 슬롯:

```text
Head
Body
Weapon
Back
Aura
Pet
```

### 16.3 장비 표시 원칙

구매한 아이템은 단순 인벤토리 아이콘으로 끝나지 않고 실제 캐릭터 외형에 적용되어야 한다.

예:

```text
기본 전사
+
Golden Crown
+
Red Cape
+
Flame Sword
```

이 시각적 변화가 장기적인 수집/성장 동기의 핵심이다.

### 16.4 아이템 가격 예시

```text
기본 모자       100 Coin
고급 모자       300 Coin
갑옷            500 Coin
무기            700 Coin
날개          1,500 Coin
전설 오라     3,000 Coin
```

실제 가격은 플레이 데이터에 따라 조정한다.

---

## 17. 현실 보상 시스템

### 17.1 보상 교환

사용자가 현실 보상을 구매하면 즉시 지급되지 않는다.

```text
보상 구매
→ Coin 차감
→ 보호자 승인 대기
```

### 17.2 상태값

```text
pending     : 승인 대기
approved    : 승인
fulfilled   : 지급 완료
cancelled   : 취소
```

### 17.3 부모 화면

예:

```text
율이
🍗 치킨 먹기
500 Coin

[승인]
[거절]
```

장기적으로 부모가 직접 보상을 생성할 수 있게 한다.

---

## 18. 클리어 타임 및 랭킹

### 18.1 클리어 타임

측정 대상:

- 실제 문제 해결 시간

제외:

- 정답 후 공격 애니메이션
- 다음 문제 전환 대기시간
- Stage Clear 연출

### 18.2 랭킹 종류

- Stage Fastest
- Total Coin
- Highest Level
- Highest Combo
- Accuracy
- Total Cleared

향후:

- Friend Ranking
- Weekly Ranking
- Monthly Ranking
- School/Class Ranking

최단시간 기록은 코인을 직접 지급하는 요소와 분리하고, 배지/칭호/업적으로 보상하는 방향을 우선한다.

---

## 19. 학습 데이터 구조

기본 단어 모델:

```json
{
  "word": "survive",
  "partOfSpeech": "verb",
  "meaning": "살아남다"
}
```

상용 데이터 구조 확장:

```json
{
  "word": "survive",
  "meaning": "살아남다",
  "pos": "verb",
  "difficulty": 3,
  "grade": 7,
  "unit": 2,
  "day": 15,
  "example": "Only a few animals survived.",
  "pronunciation": null,
  "synonyms": [],
  "antonyms": []
}
```

추가 가능 필드:

- 발음기호
- 음성 URL
- 예문
- 난이도
- 학년
- 교재
- Unit
- Day
- 동의어
- 반의어
- 카테고리
- 태그
- 오답 후보군

---

## 20. 발음 시스템

현재:

- Web Speech API
- 영어 문제에서 수동 발음 버튼
- 정답 시 영어 자동 발음

상용화 고려:

- 안정적인 TTS API
- 단어별 사전 녹음
- CDN 캐싱
- 발음 속도 옵션
- 미국식/영국식 옵션

---

## 21. 세계관

가칭 세계관: **Wordoria**

설정:

언어의 힘으로 유지되는 세계에서 어둠의 세력이 Word Crystal을 훔쳐가면서 세상의 단어들이 사라지기 시작한다.

플레이어는 모험가가 되어 각 던전에 흩어진 Word Crystal을 되찾는다.

```text
Word Dungeon
→ Monster
→ Word Question
→ Correct Answer
→ Monster Defeated
→ Word Crystal Recovered
```

학습 행동을 세계관 안의 행동으로 자연스럽게 연결한다.

---

## 22. 전체 화면 흐름

```text
LOGIN
 │
 ▼
USER HOME
 │
 ▼
CHARACTER SELECT
 │
 ├── CHARACTER CREATE
 │
 ▼
CHARACTER STATUS
 │
 ├── Equipment
 ├── Inventory
 ├── Shop
 ├── Ranking
 └── Dungeon
        │
        ▼
     DUNGEON SELECT
        │
        ▼
     STAGE SELECT
        │
        ▼
       GAME
        │
   ┌────┴─────┐
   │          │
 GAME OVER   CLEAR
              │
              ▼
        TREASURE CHEST
              │
              ▼
          REWARD
              │
              ▼
        CHARACTER HOME
```

---

## 23. 데이터베이스 설계 방향

현재 Supabase의 프로토타입 테이블을 상용 구조로 확장한다.

현재 Phase 1 테이블:

```text
game_characters
game_scores
coin_ledger
shop_items
character_inventory
reward_redemptions
```

현재 `player`는 인증 사용자의 ID가 아니라 표시용 닉네임이다. `game_characters`와 `game_scores`는 동일한 유저 이름 규칙을 DB CHECK 및 RLS INSERT 정책으로 검증한다.

목표 테이블 구조:

```text
users / auth.users
profiles

characters
character_stats
character_equipment
character_inventory

words
stages
stage_words
monsters
dungeons

game_sessions
game_answers

game_scores
coin_ledger

shop_items
purchases
reward_items
reward_redemptions

achievements
user_achievements

class_balance_config
game_balance_config
```

### 23.1 코인 원장

코인은 단순 잔액만 저장하지 않는다.

반드시 `coin_ledger`에 모든 증감 내역을 남긴다.

예:

```text
question_reward
combo_bonus
stage_clear_bonus
treasure_reward
rogue_bonus
shop_purchase
reward_redemption
admin_adjustment
```

### 23.2 환경과 스키마 원본

- 로컬 개발 DB: Supabase CLI가 실행하는 PostgreSQL 17
- 원격 운영 DB: 연결된 Supabase 프로젝트
- 스키마 원본: `supabase/migrations/*.sql`
- 로컬 카탈로그 데이터: `supabase/seed.sql`
- 운영 사용자 및 플레이 기록은 seed에 포함하지 않는다.
- 브라우저 앱은 `localhost` 또는 `127.0.0.1`에서 로컬 API를 자동 사용하고, 배포 도메인에서는 원격 API를 사용한다.
- 필요 시 `?db=local` 또는 `?db=remote`로 대상을 명시한다.

### 23.3 DB 변경 및 배포 절차

```text
supabase migration new <change_name>
→ migration SQL 작성
→ supabase db reset --local
→ 로컬 REST/RPC 통합 테스트
→ Supabase security/performance advisor 확인
→ supabase db push --linked --dry-run
→ 검토 후 supabase db push --linked
→ supabase migration list --linked로 동기화 확인
```

운영 DB를 Dashboard에서 직접 수정하지 않는다. 긴급하게 원격에서 변경한 경우 즉시 `db pull`로 로컬 migration 기준선을 복구한 뒤 다음 작업을 진행한다.

---

## 24. 서버 권한 및 Anti-Cheat

상용 버전에서 클라이언트의 값을 그대로 신뢰하면 안 된다.

서버에서 검증/계산해야 하는 항목:

- 사용자 인증
- 문제 정답 여부
- 획득 Coin
- Combo Bonus
- Stage Clear Bonus
- Treasure Reward
- 직업 특성 발동
- EXP
- Level Up
- 구매 가격
- 보유 Coin
- 인벤토리
- 보상 교환

특히 클라이언트에서 임의로 다음과 같은 조작이 불가능해야 한다.

```javascript
coins += 100000;
level = 99;
```

권장 방식:

- Supabase RPC 또는 Edge Function
- 서버 시드 기반 랜덤
- RLS
- 게임 세션 ID
- 서버 측 정답 검증
- 코인 지급 idempotency

---

## 25. 관리자 페이지

상용화에서는 코드 배포 없이 콘텐츠와 밸런스를 변경할 수 있어야 한다.

관리자 기능:

### 콘텐츠

- 단어 등록
- 단어 수정
- CSV/Excel 업로드
- Stage 생성
- Stage 문제 수 설정
- Dungeon 생성
- Monster 설정
- Boss 설정

### 경제

- 아이템 등록
- 가격 변경
- Coin 보상 변경
- Treasure 확률 변경
- EXP 변경

### 직업 밸런스

- 전사 발동률
- 도적 발동률
- 마법사 Time Stop 확률/지속시간
- 권투가 Combo 기준
- 궁수 Treasure 최소값

### 사용자

- 계정 조회
- 캐릭터 조회
- Coin 조정
- 보상 승인
- 부정 플레이 확인

---

## 26. 콘텐츠 운영 구조

현재의 JS 파일 기반 Stage 정의는 프로토타입 용도로 유지하되, 상용화 시 DB 기반으로 이전한다.

예:

```text
Dungeon 1
 ├ Stage 1
 ├ Stage 2
 ├ Stage 3
 └ Boss Stage

Dungeon 2
 ├ Stage 4
 ├ Stage 5
 └ Boss Stage
```

관리자가 다음 방식으로 콘텐츠를 추가할 수 있어야 한다.

- 관리자 화면 직접 입력
- CSV 업로드
- Excel 업로드
- 교재/학년별 일괄 등록

---

## 27. 핵심 제품 차별점

이 프로젝트의 가장 중요한 차별점은 다음 한 문장으로 정의한다.

> **영단어 문제를 맞히는 행위 자체가 RPG 전투다.**

기존 구조:

```text
Study
→ Reward
```

목표 구조:

```text
Study = Battle = Progress
```

정답을 맞히면 캐릭터가 실제로 공격하고, 몬스터가 쓰러지고, 앞으로 전진하고, 보상을 얻는다.

이 직접적인 피드백이 학습과 게임의 결합 지점이다.

---

## 28. 현재 구현 상태

현재 프로토타입에서 구현된 기능:

- 기본 플레이어 외 유저 추가 및 선택
- 유저 이름 클라이언트/DB 이중 검증
- 마지막 선택 유저와 로컬 유저 목록 유지
- 캐릭터 데이터 기반 원격 유저 목록 복원
- Stage 1~6
- 객관식 4지선다
- 영어 → 한글
- 한글 → 영어
- 문제 랜덤 순서
- 방향 랜덤
- 5초 타이머
- Survival Mode
- 정답 자동 발음
- 발음 버튼
- 캐릭터 생성
- 전사 / 마법사 / 권투가 / 궁수 아바타
- 캐릭터별 Coin
- 캐릭터 선택
- Stage 반복 도전
- 정답 1문제당 +1 Coin
- 5 Combo마다 +1 Coin
- Stage Clear +10 Coin
- 클리어 타임
- 랭킹
- 상점
- 아바타 아이템
- 현실 보상 교환 신청
- Supabase 저장
- Coin Ledger
- Supabase CLI 로컬 개발 환경
- 버전 관리되는 DB migration 및 개발 seed

현재 프로토타입에는 아직 없는 주요 기능:

- 실제 사용자 로그인
- 사용자 개인 비밀번호
- 도적 직업
- Level / EXP
- 캐릭터 상태창 완성
- 실제 스타일라이즈드 2D 캐릭터 전투
- 몬스터
- 공격 애니메이션
- Dungeon Map
- Boss
- Treasure Chest
- Treasure Random Reward
- 직업 특성 실제 적용
- 장비 레이어 기반 캐릭터 꾸미기
- 부모 계정
- 관리자 페이지
- 서버 기반 완전한 Anti-Cheat

---

## 29. 개발 로드맵

### Phase 1 — Prototype

현재 단계.

완료/진행 기능:

```text
Quiz
Stage
Local User Profile
Pronunciation
Timer
Survival
Character
Coin
Combo
Shop
Ranking
Supabase
Local DB / Migration Workflow
```

### Phase 2 — RPG Core

다음 핵심 개발 단계.

```text
User Login
Password/Auth
Character Level
EXP
Character Status
Pixel Character
Battle Scene
Monster
Attack Animation
Treasure Chest
Class Skills
```

### Phase 3 — RPG Growth

```text
Equipment Layer
Inventory Expansion
Dungeon Map
Boss
Achievements
Pets
Advanced Shop
Character Customization
```

### Phase 4 — Commercial

```text
Parent Account
Admin
Word CMS
Analytics
Anti-Cheat
Payments
Mobile App
Push Notification
Operational Dashboard
```

---

## 30. Phase 2 구현 우선순위

### P1. 사용자 시스템

Phase 1에서 고정 플레이어 선택을 닉네임 기반 로컬 유저 프로필로 확장했다. Phase 2에서는 이를 Supabase Auth 기반 실제 사용자 시스템으로 전환한다.

Phase 1 완료:

- 기본 유저 유지
- 유저 추가 및 선택
- 유저 이름 검증
- 새 유저의 캐릭터/게임 기록 저장
- 로컬 선택 상태 유지

Phase 2 완료 조건:

- 회원가입
- 로그인
- 로그아웃
- 개인 비밀번호
- 로그인 세션 유지
- 사용자별 캐릭터 분리

### P2. 캐릭터 Level / EXP

완료 조건:

- 캐릭터별 Level
- 현재 EXP
- 다음 레벨 필요 EXP
- 정답 EXP 지급
- Stage Clear EXP 지급
- Level Up 연출

### P3. 캐릭터 상태창

완료 조건:

- 캐릭터 이미지
- Level
- EXP Bar
- Coin
- 직업
- 장비
- 최고 Combo
- Stage Clear 수
- Accuracy
- Dungeon 입장 버튼

### P4. 게임 화면 RPG화

기존 퀴즈 화면을 다음 비율로 변경한다.

```text
상단 1/3 : Battle Scene
하단 2/3 : Word Quiz
```

### P5. 스타일라이즈드 2D 캐릭터 / 몬스터

필수 캐릭터 애니메이션:

```text
Idle
Walk
Attack
Hit
Victory
Dead
```

필수 몬스터 애니메이션:

```text
Idle
Hit
Dead
Attack
```

### P6. Treasure Chest

Stage Clear 후:

```text
Treasure Chest 등장
→ 클릭
→ Open Animation
→ 서버 랜덤 Coin
→ Reward 표시
```

### P7. 직업 특성

구현 순서:

1. 전사: +1초 확률
2. 도적: 추가 Coin 확률
3. 마법사: Timer Stop
4. 권투가: 3 Combo 보너스
5. 궁수: Treasure 최소 20

---

## 31. Phase 2 완료 기준

다음 화면 경험이 완성되면 Phase 2의 핵심 목표를 달성한 것으로 본다.

```text
┌──────────────────────────┐
│ LV.12 블리자드      🪙530 │
│                          │
│ 🧙‍♂️  → → →        👹     │
│                          │
│ ███████████░░░  18 / 30 │
├──────────────────────────┤
│                          │
│        survive           │
│                          │
│  ① 살아남다              │
│  ② 조사하다              │
│  ③ 지우다                │
│  ④ 반복하다              │
│                          │
│          ⏱ 3.8           │
└──────────────────────────┘
```

정답 시:

```text
🧙‍♂️ ✨──────▶ 👹💥

정답!
+1 Coin
8 COMBO
```

마지막 문제 정답 시:

```text
BOSS DEFEATED
→ STAGE CLEAR
→ Treasure Chest
→ Open
→ +10~30 Coin
```

이 단계부터 프로젝트는 **영단어 퀴즈에 RPG 요소를 덧붙인 앱**이 아니라, **영단어를 이용해 실제로 플레이하는 RPG**로 전환된다.

---

## 32. 다음 문서화 항목

이 문서를 기준으로 후속 문서를 분리한다.

1. `DATABASE_DESIGN.md`
   - ERD
   - Table 정의
   - RLS
   - RPC

2. `BATTLE_SYSTEM.md`
   - 전투 상태 머신
   - 정답/오답 이벤트
   - 애니메이션 타이밍

3. `CLASS_BALANCE.md`
   - 직업별 발동률
   - 기대 Coin/시간 이득
   - 밸런스 시뮬레이션

4. `UI_FLOW.md`
   - 로그인
   - 캐릭터 생성
   - 상태창
   - 던전
   - 게임
   - 상점

5. `CONTENT_MODEL.md`
   - 단어
   - 교재
   - Unit/Day
   - Stage
   - Dungeon

6. `ROADMAP.md`
   - 구현 Task
   - Milestone
   - Release 기준

---

## 33. 최종 방향

상용 버전의 목표는 다음과 같다.

> 사용자가 영어 공부를 시작했다는 느낌보다 **던전에 들어가 모험을 시작했다는 느낌**을 먼저 받게 한다.

그리고 게임을 진행하기 위해 자연스럽게 단어를 반복해서 풀게 만든다.

최종 구조:

```text
영단어 학습
+ 판타지 RPG
+ 캐릭터 성장
+ 수집
+ Coin Economy
+ Ranking
+ Parent Reward
```

이 일곱 축을 중심으로 기능을 확장한다.

---

## 34. 개발 및 릴리스 원칙

### 34.1 로컬 우선 개발

기능 개발은 정적 프런트엔드와 로컬 Supabase를 함께 실행해 검증한다. DB 변경은 migration 파일을 먼저 만들고 로컬에서 재현한 후 원격에 배포한다.

```text
로컬 Supabase 시작
→ migration/seed 적용
→ 로컬 정적 웹 서버 시작
→ 기능 및 REST/RPC 흐름 테스트
→ DB advisor와 migration dry-run 확인
→ 원격 DB migration 배포
→ main 브랜치 배포
→ 운영 smoke test
```

### 34.2 릴리스 게이트

- `supabase db reset --local`이 빈 DB에서 성공한다.
- 핵심 테이블 6개와 RLS 정책, RPC 3개가 로컬에서 생성된다.
- 기본 상점 아이템 7개가 seed로 준비된다.
- 새 유저가 캐릭터를 만들고 게임 결과와 코인을 저장할 수 있다.
- 로컬/원격 migration 이력이 일치한다.
- 프런트엔드 문법 검사와 핵심 사용자 흐름 테스트가 통과한다.
- 기존 데이터에 영향을 주는 변경은 배포 전 백업 및 롤백 전략을 확인한다.

### 34.3 현재 알려진 보안 부채

Phase 1은 인증 없는 가족용 프로토타입이므로 공개 `anon` 역할이 일부 읽기/생성 기능과 `SECURITY DEFINER` RPC를 호출할 수 있다. 이는 상용 보안 모델이 아니다.

Phase 2 Auth 전환 시 다음을 한 번에 처리한다.

- 캐릭터와 기록에 `auth.uid()` 소유권 연결
- 사용자별 RLS `USING` 및 `WITH CHECK` 적용
- 공개 RPC 실행 권한 축소
- RPC 내부 소유권 및 게임 세션 검증
- 현실 보상 승인 기능의 보호자 권한 분리
