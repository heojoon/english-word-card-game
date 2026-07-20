# Word Bloom 영단어 게임

아이별 영단어 학습, 자동 오답 복습, 주간 통계, 월간 랭킹, 부모 확인 화면을 포함한 가벼운 정적 웹앱입니다. 현재는 브라우저 `localStorage`로 데이터를 유지하므로 바로 Vercel에 배포해 실행할 수 있습니다.

## GitHub → Vercel 자동 배포

1. 이 저장소를 GitHub에 push합니다.
2. [Vercel](https://vercel.com/new)에서 저장소를 Import합니다.
3. Framework Preset은 **Other**로 두고 Deploy합니다.
4. 이후 `main` 브랜치에 push할 때마다 Vercel이 자동 배포합니다.

## Supabase로 성적 저장 확장

Supabase SQL Editor에서 아래 테이블을 만들고, 앱의 localStorage 읽기/쓰기 부분을 Supabase 호출로 교체하면 됩니다. 실제 서비스에서는 **Supabase Auth**로 아이/부모 계정을 구분하고 RLS를 반드시 켜세요.

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  role text not null check (role in ('child', 'parent')),
  parent_id uuid references profiles(id)
);

create table study_sessions (
  id bigint generated always as identity primary key,
  child_id uuid not null references profiles(id),
  score integer not null,
  total integer not null,
  completed_at timestamptz not null default now()
);

create table word_mistakes (
  child_id uuid not null references profiles(id),
  word text not null,
  mistake_count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (child_id, word)
);
```

권장 흐름: 게임 완료 시 `study_sessions`에 점수를 저장하고, 오답 선택 시 `word_mistakes`를 upsert합니다. 복습 덱은 이 테이블의 최신 오답 단어에서 만들며, 부모 화면은 `profiles.parent_id` 기준으로 자녀 세션만 조회합니다.
