# 월드 11 어휘 선정과 검증

조사일: 2026-11-22. `world-eleven-vocabulary.json`이 편집 원본이며, 단계별 `itemIds`도 이 파일에 명시되어 있다. 두 모드는 같은 생성 결과를 사용한다.

| 수준 | 고유 항목 | 직접 만든 짧은 표현 | 단계별 배정 | 총 배정 |
| --- | ---: | ---: | ---: | ---: |
| 초등학교 3학년 보조 연습 | 264 | 43 | 44 × 30 | 1,320 |
| 중학교 2학년 보조 연습 | 264 | 66 | 44 × 30 | 1,320 |

CEFR 등급을 한국 학년과 일대일 대응시키지 않았다. 국내 공개 학년 목차로 생활 주제와 기능을 고르고, 국제 목록으로 개별 후보 어휘의 존재와 기초 수준을 확인했다. 특정 교과서의 단어집이나 필수어 전체를 재현한 자료가 아니다.

## 실제 열람한 공식 자료

- [미래엔 초등 영어 3 공개 학습 목차](https://aidt.m-teacher.co.kr/elem-eng3.html): 인사, 교실 지시, 사물, 음식 취향, 소유, 개수, 나이, 감정, 능력, 색, 날씨를 초등 생활 주제의 기준으로 참고했다. 교재 본문이나 평가 문항은 사용하지 않았다.
- [Cambridge 공식 Pre A1 Starters 준비 자료](https://www.cambridgeenglish.org/exams-and-tests/qualifications/young-learners/paper/starters/preparation/)에서 연결된 [2025 공식 어휘 PDF](https://www.cambridgeenglish.org/Images/506166-starters-movers-flyers-word-list-2025.pdf): **PDF 4–7쪽의 Starters 부분만** 대조했다. 초등 항목 252개의 표제어 또는 확장 표현의 근거 어휘를 확인했다. 결합 목록의 높은 단계 어휘를 Starters로 표시하지 않았다.
- [NE능률 2022 개정 중학교 영어2 공개 목차](https://www.neteacher.co.kr/english/textbook/10079?chapterTab=10589): 우정, 돕기, 학교, 건강, 개성, 여행, 사고팔기와 나눔, 기술의 생활 주제를 참고했다. 회원 자료와 교재 파일을 내려받거나 복제하지 않았다.
- [Cambridge A2 Key 공식 어휘 목록, August 2025](https://www.cambridgeenglish.org/Images/506886-a2-key-2020-vocabulary-list.pdf): 중등 264항목 및 초등의 생활 기본어/표현 12항목의 표제어 근거를 대조했다. 초등의 rabbit, lion, sunny, rain, snow, hot, cold, wake up, wash, help 등의 근거로 사용한 것이며, 이들을 Starters에 수록되었다고 주장하지 않는다. 초등의 어려운 A2 추상어를 수량 채우기용으로 넣지 않았다.

원본의 각 항목에는 `sourceIds`, `level`, `topic`, `difficulty`, `authoredExtension`, `evidence.headwords`, `evidence.headwordLocations`를 기록했다. PDF 페이지는 뷰어 기준 **1부터 시작**한다. 표제어 대조는 PDF 전체를 웹 도구로 실제 열람해 수행했으며, 목차에만 단어가 보인 경우를 근거로 삼지 않았다. 예를 들어 A2 목록에 없는 honest, promise, creative, recycle 등의 초기 후보는 제외하고 수록이 확인된 기초어로 교체했다.

`authoredExtension: true`는 확인한 기초 어휘를 조합하여 게임용으로 직접 쓴 표현이다. `headwords`는 그 표현의 어휘 근거이며, 표현 전체가 공식 목록에 실렸다는 뜻이 아니다. 모든 한국어 뜻은 직접 작성했고 단어마다 사용할 생활 의미를 하나로 제한했다. 번역·예문·교재 문항의 대량 복제는 하지 않았다.

## 배정과 검증 범위

각 수준을 11개 생활 주제 × 24개로 편집했다. 11단계씩 네 순환을 만들고 매 단계 주제 24개와 이전 주제의 복습 6개를 배정했다. 첫 단계만 다음 주제의 기초 6개를 예고한다. 순환마다 복습하는 여섯 항목을 바꾸며, 주제 항목의 순서도 고정적으로 회전한다. 단계 사이 복습을 허용하되 한 단계의 영어 30개와 한국어 정답 30개는 각각 중복이 없다. 숫자나 색깔만 치환하여 수량을 채우지 않았다.

런타임 행 형식은 `[영어, 화면 분류 라벨, 한국어]`다. 두 번째 필드는 기존 `makeQuestion()`이 한국어 정답 앞에 표시하므로 영어 원문을 넣지 않는다. 한 단어는 `단어`, 공백이 있는 여러 단어는 `표현`으로 표시한다. 품사를 추정하지 않으며, 검증된 발음 정보는 제공하지 않는다(`policy.phonetics: "not-provided"`, 항목별 `phonetics: null`). 원본의 `displayLabel`과 `policy.displayLabel`에 표시 정책을 기록한다.

재생성:

```bash
node scripts/generate-world-eleven-content.mjs
node scripts/generate-world-eleven-content.mjs --check
node scripts/verify-world-eleven-content.mjs
```

생성기는 저장된 원본과 배정으로 항상 동일한 `world-eleven-content.js`를 출력한다. `--check`는 파일을 수정하지 않고 최신 여부만 검사한다. 검증기는 각 수준의 44×30, 빈 값과 중복 정답, 출처 ID와 PDF 페이지, 원본/런타임의 완전 일치, 모든 편집 항목의 실제 배정을 확인한다. 이 검사는 교사 수업 검토나 사용자 외형 승인을 대체하지 않는다.
