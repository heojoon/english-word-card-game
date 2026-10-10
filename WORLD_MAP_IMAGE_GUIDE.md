# Crystal Quest 월드맵 이미지 생성 지침

이 문서는 Wordoria의 스토리 월드맵을 생성·재생성·수정할 때 사용하는 그림체 기준이다. 이미지 생성 도구를 호출하기 전에 반드시 읽고, 기준 이미지를 실제로 확인한다. 캐릭터, 전투 배경, UI, OCR 입력 사진에는 이 월드맵 규격을 적용하지 않는다.

## 1. 기준 이미지와 적용 범위

- **그림체 원본:** `assets/story/chapter-1-library-map.webp`. 매번 스타일 참조로 첨부한다. 색감, 채색, 재질, 디테일 밀도, 원근감의 최우선 기준이다.
- **월드 2 적용 예:** `assets/story/chapter-2-crystal-temple-map.webp`. 사원·다리·폭포·경로 구성의 보조 참조다. 원본 그림체 참조를 대체하지 않는다.
- **지형 참조:** 재생성 대상 월드의 기존 지도. 스타일 참조와 별도로 역할을 지정한다. 기존 지도의 단순한 3D 질감은 복제하지 않는다.
- `ART_DIRECTION.md`의 Direction 01과 `GAME_DESIGN.md`의 월드·스테이지 설정을 함께 따른다. 사용자의 구체적인 변경 지시가 우선한다.

내부 스타일명: **Crystal Quest Painterly World Map**.

한 문장 정의: 따뜻한 햇빛 아래 구름 위 판타지 지형을 섬세하게 채색한, 부드러운 회화적 질감의 고급 모바일 RPG 월드맵.

`ART_DIRECTION.md`의 캐릭터용 선화·셀 셰이딩 규칙을 월드맵에 기계적으로 적용하지 않는다. 월드맵은 기준 이미지처럼 색과 명암으로 형태를 구분한다. 이 차이는 캐릭터나 UI의 스타일 변경을 허용하지 않는다.

## 2. 유지할 그림체

| 요소 | 생성 규칙 |
| --- | --- |
| 채색 | 정돈된 손그림 붓결, 부드러운 그라데이션, 세밀하지만 명료한 형태. 검은 외곽선 없이 대상색의 어두운 면으로 경계 표현. |
| 광원 | 기본은 좌상단의 따뜻한 낮 햇빛. 밝은 면은 크림·금빛, 그림자는 차가운 청록·남보라 계열. 흰 부분이 날아가지 않도록 조절. |
| 색감 | 연두·초록 식생, 크림색 석재, 황금빛 길, 청록색 물, 푸른 하늘과 흰 구름. 보라·파랑 수정은 길찾기 포인트로 선명하게. |
| 수목 | 여러 크기와 색의 잎 덩어리, 풍성한 관목, 읽기 쉬운 침엽수 실루엣. 단색 삼각형 나무와 플라스틱 같은 표면 금지. |
| 작은 디테일 | 길 가장자리의 꽃, 덩굴, 이끼, 돌과 풀. 주요 경로·크리스털 주변을 가리지 않도록 배치. |
| 바위·건축 | 크림·회갈색 석재의 자연스러운 면과 균열, 절벽 층, 오래된 조각, 덩굴. 거친 실사 텍스처나 단순 로우폴리 면 대신 세밀한 채색. |
| 수정 | 투명한 보라·파랑의 면 분할, 흰 하이라이트, 은은한 마법광. 스테이지 수정은 금테 원형 받침 위에 개별 배치. |
| 물 | 청록색 수면, 흰 물보라, 여러 높이의 폭포, 부드러운 물안개. 발광 줄기처럼 단순화하지 않는다. |
| 깊이 | 가까운 지형은 선명하게, 먼 지형은 낮은 대비와 푸른 대기감으로 부드럽게. 구름은 섬 사이 공간과 높이를 드러낸다. |
| 분위기 | 밝고 안전한 모험. 신비로움은 빛·수정·유적으로 표현하며 공포나 어두운 폐허 분위기로 바꾸지 않는다. |

같은 그림체를 유지한다는 이유로 모든 월드에 도서관·사원·폭포를 복제하지 않는다. 지역의 주제는 바꿀 수 있으나 채색·재질·광원·디테일 밀도는 유지한다. 야간 등 다른 시간대는 사용자가 요청하거나 해당 지역 설정이 요구할 때 적용한다.

## 3. 구도와 게임 좌표

- 모바일 세로 화면에서 읽히는 높은 3/4 시점의 지도. 측면 전투 배경이나 평면 안내도로 바꾸지 않는다.
- 주요 목적지를 상단 또는 경로 종점에 두고, 넓은 길·다리·계단으로 진행 방향을 읽을 수 있게 만든다.
- 기본 그림체의 부유섬·구름·원경을 활용하되 지역 설정에 맞게 지형을 구성한다.
- 기존 지도를 교체할 때는 실제 이미지 크기, `crystal-game.js`의 해당 월드 `positions`, 스테이지 수·순서·이름을 먼저 확인한다. 다른 월드의 비율이나 7개 스테이지를 모든 지도에 강제하지 않는다.
- 프롬프트에 목표 비율과 정규화 좌표를 적는다. `x = 이미지 왼쪽부터의 비율`, `y = 이미지 위쪽부터의 비율`이며 지형 참조와 함께 전달한다.
- 생성 모델의 좌표 준수는 보장되지 않는다. 생성 후 실제 수정 중심을 측정하고 오버레이로 버튼과 대조한다. 위치가 달라졌으면 지형을 다시 생성하거나 해당 월드 좌표만 조정한다.
- 스테이지 수와 같은 개수의 보라색 수정 받침을 만든다. 장식용 청록 수정은 가능하지만 스테이지처럼 보이는 추가 받침은 만들지 않는다.
- 경로의 연결성·진행 순서·수정 가림·가장자리 잘림을 확인한다. 글자, 번호, 캐릭터, 몬스터, 버튼 등 UI는 그림에 넣지 않는다.

## 4. 매번 사용하는 고정 프롬프트

아래 스타일 블록과 금지 블록을 그대로 사용한다. 지역 설명·구도·비율·스테이지 계약은 별도 문단으로 붙인다. 참조 이미지 번호는 실제 첨부 순서에 맞춘다.

### 고정 스타일 블록

```text
STYLE LOCK — Crystal Quest Painterly World Map.
Use the attached chapter-1-library-map.webp as the authoritative STYLE reference. Match its rendering, color relationships, material treatment, detail density and atmospheric depth, not its specific library building or geography.
Create a finely hand-painted premium fantasy mobile RPG world map. Use soft controlled painterly brush texture, delicate colored edges without black outlines, dimensional cream stone, naturally layered cliffs, nuanced lush foliage, tiny flowers and climbing ivy. Use warm sunlight, cool teal-violet shadows, golden paths, turquoise water where appropriate, blue atmospheric distance and softly billowing white clouds. Violet-blue crystals have translucent faceted surfaces, white highlights and restrained magical glow; gold is a restrained waypoint accent.
Use an elevated three-quarter map view, clear destination architecture, readable winding routes, crisp nearby terrain and softer lower-contrast distant scenery. Keep navigation landmarks distinct at portrait mobile size. The image must look like another region painted by the same artist as the style reference. Preserve the region's own subject and geography rather than copying the reference's buildings.
```

### 지역별 지정 블록

```text
Use case: stylized-concept.
Asset type: Wordoria Crystal Quest story world map.
Scene: [world name, region theme, destination, terrain and route].
Reference roles: Image 1 = authoritative style; Image 2 = existing target layout, if provided. Follow Image 2 for topology only, not for rendering style.
Composition: [target portrait aspect ratio and dimensions; main destination and route].
Gameplay contract: exactly [stage count] distinct violet-blue crystal waypoints on gold-rimmed circular pedestals. Stage order and normalized centers: [stage name, x%, y% for each stage]. Build the paths and landings around those centers. Keep every waypoint separate and unobscured. Do not add extra waypoint pedestals.
For a replacement: preserve [required landmarks, bridge connections and route topology]. Change [requested changes].
```

### 고정 금지 블록

```text
Avoid coarse low-poly geometry, chunky toy-like 3D rendering, plastic surfaces, flat oversaturated green terrain, black cartoon outlines, pixel art, gritty photorealism, muddy dark palettes, excessive bloom and repetitive noisy detail. No characters, monsters, text, letters, numbers, UI, labels, logos, watermark, frames or black side borders. Do not obscure the route or waypoint crystals with foliage, clouds or effects. Do not introduce buildings or narrative elements unrelated to the requested world.
```

## 5. 생성·저장·검수 절차

1. 이 지침과 관련 아트·게임 설정을 읽고 기준 이미지 및 대상 지도를 직접 본다. 기준 파일이 없으면 저장소에서 찾아보고, 찾지 못하면 추측으로 그림체를 대체하지 말고 누락을 알린다.
2. 제공되는 `imagegen` 스킬을 읽고 내장 이미지 생성 도구를 기본으로 사용한다. 참조 이미지를 실제 입력에 포함하고 스타일/레이아웃 역할을 명시한다. 편집할 로컬 이미지는 먼저 이미지 보기 도구로 확인한다. 도구의 현재 입력 규격을 따르며 경로 참조와 최근 이미지 참조를 동시에 사용하지 않는다.
3. 고정 블록에 지역별 지정 블록을 결합해 생성한다. 최신 생성물을 원본 스타일 참조 대신 계속 재사용하지 않는다. 추가 생성의 스타일 기준은 항상 월드 1 원본이다.
4. 결과를 원본과 나란히 비교하고 모바일 크기로 확인한다. 그림체·스테이지 수·좌표·경로 연결·잘림을 검수한다. 어긋난 요소가 있으면 원본 참조를 유지한 채 해당 요소를 구체적으로 수정한다.
5. 생성 원본과 런타임 WebP를 분리하고 프로젝트 안에 저장한다. 교체 요청이면 기존 원본을 보관한 뒤 교체하고, 신규 제안이면 별도 파일명으로 저장한다. 임시 경로나 도구 기본 저장 경로만 게임에서 참조하지 않는다.
6. 이미지 옆 `.generation.json`에 날짜, 도구, 노출된 모델명(없으면 미공개), 전체 프롬프트, 기준/레이아웃 참조, 원본/런타임 경로, 목표·실제 크기, 실제 스테이지 좌표, 검수·사용자 승인 상태를 기록한다. 검수 완료를 사용자 승인으로 기록하지 않는다.
7. 게임에 적용하는 작업이면 해당 월드의 참조와 좌표만 변경하고 브라우저에서 이미지 로딩과 선택 버튼 정렬, 모바일 가독성을 확인한다. `npm run build`를 실행한다. 문서·스킬만 수정한 경우에는 게임 빌드가 필요하지 않다.

최종 보고에는 생성 결과, 저장 경로, 사용 도구와 프롬프트 기록, 실제로 수행한 검수를 짧게 적는다. 이 지침은 배포나 새로운 이미지 생성 비용을 독립적으로 승인하는 규칙이 아니며, 사용자가 요청한 작업 범위 안에서 적용한다.
