"""Import WordMax Level 3 Day 11–30 without modifying the source workbook.

Usage: python3 scripts/import-world4-vocabulary.py '/path/to/교사용 CD Level 3.xlsx'
Uses only the Python standard library. Generated stage15.js is the runtime source.
"""
import hashlib
import json
import re
import sys
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
CORRECTIONS = {
    (21, "entrance"): ("존재", "입구, 입장"),
    (28, "inspect"): ("의도, 목적", "검사하다, 점검하다"),
    (28, "complex"): ("~을 내려다보다, 얕보다", "복잡한"),
    (29, "long for"): ("망하다, 갈망하다", "열망하다, 갈망하다"),
    (26, "weekly"): ("매주의, 주회의", "매주의, 주 1회의"),
}


def clean(value):
    # Preserve multi-line meanings as separate alternatives, rather than joining words.
    value = re.sub(r"\s*\n\s*", ", ", value)
    return re.sub(r"\s+", " ", value).strip()


def import_stages(path):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    stages = {}
    with zipfile.ZipFile(path) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared = ["".join(si.itertext()) for si in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
        relations = {
            item.attrib["Id"]: item.attrib["Target"]
            for item in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        }
        sheets = {
            item.attrib["name"]: relations[item.attrib[f"{{{REL}}}id"]]
            for item in ET.fromstring(archive.read("xl/workbook.xml")).find("s:sheets", NS)
        }
        for day in range(11, 31):
            sheet_name = f"Day {day}"
            target = sheets[sheet_name]
            sheet_path = target.lstrip("/") if target.startswith("/") else "xl/" + target
            rows = []
            for row in ET.fromstring(archive.read(sheet_path)).find("s:sheetData", NS):
                cells = {}
                for cell in row:
                    address = cell.attrib["r"]
                    column = re.sub(r"\d", "", address)
                    value = cell.find("s:v", NS)
                    text = value.text if value is not None else ""
                    if cell.attrib.get("t") == "s":
                        text = shared[int(text)]
                    elif cell.attrib.get("t") == "inlineStr":
                        text = "".join(cell.find("s:is", NS).itertext())
                    cells[column] = text or ""
                rows.append((int(row.attrib["r"]), cells))
            words, corrections, source_rows = [], [], []
            reading_words = False
            for row_number, cells in rows:
                if cells.get("B", "").strip() == "단어":
                    reading_words = True
                    continue
                if not reading_words:
                    continue
                if len(words) == 30:
                    break
                english, meaning = clean(cells.get("B", "")), clean(cells.get("D", ""))
                if not english or not meaning or not re.search(r"[A-Za-z]", english):
                    raise ValueError(f"Missing vocabulary in {sheet_name} row {row_number}")
                correction = CORRECTIONS.get((day, english.lower()))
                if correction:
                    original, corrected = correction
                    if meaning != original:
                        raise ValueError(f"Changed correction source: {sheet_name} {english}")
                    corrections.append({"cell": f"D{row_number}", "english": english,
                                        "originalMeaning": meaning, "meaning": corrected})
                    meaning = corrected
                # The source contains no part-of-speech column; do not invent one.
                words.append([english, "—", meaning])
                source_rows.append(row_number)
            if len(words) != 30 or len({w[0].lower() for w in words}) != 30:
                raise ValueError(f"Expected 30 unique words in {sheet_name}")
            if len({w[2] for w in words}) != 30:
                raise ValueError(f"Ambiguous duplicate meanings in {sheet_name}")
            number = day - 10
            stages[f"s{number + 14}"] = {
                "name": f"월드 4 · {number}단계",
                "desc": f"WordMax Level 3 · Day {day} · 30문제",
                "learningLevel": "middle", "storyChapter": 4,
                "storyStage": number, "storyPart": 1 if number <= 10 else 2,
                "questionCount": 30,
                "source": {"workbook": unicodedata.normalize("NFC", path.name),
                           "sha256": digest, "sheet": sheet_name,
                           "englishRange": f"B{source_rows[0]}:B{source_rows[-1]}",
                           "meaningRange": f"D{source_rows[0]}:D{source_rows[-1]}",
                           "partOfSpeech": "not supplied", "corrections": corrections},
                "words": words,
            }
    return stages


if __name__ == "__main__":
    source_path = Path(sys.argv[1])
    stages = import_stages(source_path)
    destination = Path(__file__).resolve().parents[1] / "stage15.js"
    payload = json.dumps(stages, ensure_ascii=False, indent=2)
    destination.write_text(
        "// Generated by scripts/import-world4-vocabulary.py from WordMax Level 3 Day 11–30.\n"
        "// World 4 only; keep these maps out of the Survival vocabulary list.\n"
        "window.QUIZ_STAGES = window.QUIZ_STAGES || {};\n"
        f"Object.assign(window.QUIZ_STAGES, {payload});\n", encoding="utf-8")
    print(f"Generated {destination.name}: {len(stages)} stages, 600 words, "
          f"{sum(len(s['source']['corrections']) for s in stages.values())} corrections.")
