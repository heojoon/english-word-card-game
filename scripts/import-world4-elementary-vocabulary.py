"""Build World 4 elementary maps from the supplied 800-word PDF.

python3 scripts/import-world4-elementary-vocabulary.py '/path/to/교육부지정 초등영단어 800.pdf'
PDF extraction requires pdfplumber. Regenerate without it using --from-json.
"""
import argparse
import hashlib
import json
import random
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = 20261012
# Explicit editorial fixes; the extraction snapshot preserves every original cell.
CORRECTIONS = {
    1: ('a / an', '하나의'),
    50: ('beautiful', '아름다운'),
    79: ('breakfast', '아침 식사'),
    125: ('chopstick', '젓가락'),
    150: ('country', '나라, 시골'),
    162: ('dad', '아빠, 아버지'),
    164: ('danger', '위험'),
    177: ('dinner', '저녁 식사'),
    213: ('excellent', '뛰어난'),
    226: ('fat', '살찐'),
    230: ('few', '거의 없는, 적은 수의'),
    240: ('fish', '물고기, 낚시하다'),
    254: ('fresh', '신선한'),
    273: ('god', '신, 하나님'),
    277: ('grape', '포도'),
    301: ('heart', '심장, 마음'),
    421: ('mom', '엄마'),
    464: ('okay', '좋아, 괜찮아'),
    515: ('potato', '감자'),
    533: ('real', '실제의, 진짜의'),
    629: ('spend', '쓰다, 보내다'),
    635: ('stamp', '우표'),
    666: ('surprise', '놀라게 하다, 놀라움'),
    669: ('swim', '수영하다'),
    721: ('toy', '장난감'),
    722: ('train', '기차, 훈련하다'),
    735: ('understand', '이해하다'),
    762: ('weather', '날씨'),
    765: ('well', '잘'),
    790: ('wrong', '틀린, 잘못된'),
}


def extract(path):
    import pdfplumber
    rows = []
    with pdfplumber.open(path) as pdf:
        for page_number, page in enumerate(pdf.pages[:16], 1):
            tables = page.extract_tables()
            if len(tables) != 1:
                raise ValueError(f'Unexpected table layout on page {page_number}')
            for row in tables[0][2:]:
                for offset in (0, 3):
                    number, english, meaning = row[offset:offset + 3]
                    rows.append(dict(number=int(number), page=page_number,
                                     english=english, meaning=meaning))
    rows.sort(key=lambda row: row['number'])
    return dict(pdf=unicodedata.normalize('NFC', path.name),
                sha256=hashlib.sha256(path.read_bytes()).hexdigest(), rows=rows)


def normalize(row):
    english = re.sub(r'\s+', ' ', row['english']).strip()
    meaning = re.sub(r'\s+', ' ', row['meaning']).strip()
    if meaning.startswith('(') and meaning.endswith(')'):
        meaning = meaning[1:-1]
    meaning = meaning.replace('/', ', ')
    english, meaning = CORRECTIONS.get(row['number'], (english, meaning))
    if not english or not meaning or not re.search('[가-힣]', meaning):
        raise ValueError(f'Invalid vocabulary: {row}')
    return [english, '—', meaning]


def build(snapshot):
    rows = snapshot['rows']
    if [row['number'] for row in rows] != list(range(1, 801)):
        raise ValueError('Expected all 800 numbered PDF entries exactly once')
    rng = random.Random(SEED)
    # Three out of every four source entries keeps the whole A–Z range represented.
    selected = []
    for start in range(0, 800, 4):
        selected.extend(rng.sample(rows[start:start + 4], 3))
    if len({normalize(row)[0].lower() for row in selected}) != 600:
        raise ValueError('Selection contains duplicate English words')
    rng.shuffle(selected)
    # Balance stages and prevent indistinguishable Korean answers on matching boards.
    for _ in range(100):
        groups = [[] for _ in range(20)]
        for row in selected:
            meaning = normalize(row)[2]
            candidates = [i for i, group in enumerate(groups)
                          if len(group) < 30 and meaning not in {normalize(r)[2] for r in group}]
            if not candidates:
                break
            minimum = min(len(groups[i]) for i in candidates)
            groups[rng.choice([i for i in candidates if len(groups[i]) == minimum])].append(row)
        else:
            break
        rng.shuffle(selected)
    else:
        raise ValueError('Could not allocate unambiguous stages')
    stages = {}
    for number, group in enumerate(groups, 1):
        rng.shuffle(group)
        corrections = [dict(number=row['number'], page=row['page'],
                            originalEnglish=row['english'], originalMeaning=row['meaning'],
                            english=normalize(row)[0], meaning=normalize(row)[2])
                       for row in group if row['number'] in CORRECTIONS]
        stages[f'e{number + 14}'] = dict(
            name=f'월드 4 · {number}단계',
            desc=f'교육부지정 초등영단어 800 · 혼합 {number} · 30문제',
            learningLevel='elementary', storyChapter=4, storyStage=number,
            storyPart=1 if number <= 10 else 2, questionCount=30,
            source=dict(pdf=snapshot['pdf'], sha256=snapshot['sha256'],
                        selection='3 of each consecutive 4 source entries', seed=SEED,
                        sourceNumbers=[row['number'] for row in group],
                        pages=[row['page'] for row in group],
                        partOfSpeech='not supplied', corrections=corrections),
            words=[normalize(row) for row in group])
    return stages


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--from-json', action='store_true')
    args = parser.parse_args()
    snapshot = json.loads(args.source.read_text()) if args.from_json else extract(args.source)
    stages = build(snapshot)
    destination = ROOT / 'elementary-stages.js'
    existing = destination.read_text()
    if 'Object.assign(window.QUIZ_STAGES, {});' not in existing and 'Generated by scripts/import-world4-elementary-vocabulary.py' not in existing:
        raise ValueError('Refusing to replace separately authored elementary vocabulary')
    source_dir = ROOT / 'content/sources'
    source_dir.mkdir(parents=True, exist_ok=True)
    (source_dir / 'elementary-800.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
    destination.write_text(
        '// Generated by scripts/import-world4-elementary-vocabulary.py.\n'
        '// World 4 elementary vocabulary only; excluded from Survival.\n'
        'window.QUIZ_STAGES = window.QUIZ_STAGES || {};\n'
        'Object.assign(window.QUIZ_STAGES, ' + json.dumps(stages, ensure_ascii=False, indent=2) + ');\n')
    print('Generated 20 elementary World 4 maps: 30 unique pairs each, 600 distinct words total.')
