#!/usr/bin/env python3
"""Excel kaynağını (data/*.xls) okuyup satırları JSON ve JS olarak dışa aktarır.

Çıktılar:
  data/excel-rows.json  – testlerin karşılaştırma için kullandığı ham satırlar
  js/excel-rows.js      – tarayıcıda window.SGK_EXCEL olarak yüklenen aynı veri

Kullanım:  python3 scripts/extract_excel.py
Gereksinim: pip install xlrd
"""
import datetime
import hashlib
import json
import pathlib
import re
import sys

try:
    import xlrd
except ImportError:  # pragma: no cover
    sys.exit("xlrd gerekli: pip install xlrd")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "kadinlara_esinden_anne_babasindan.xls"
JSON_OUT = ROOT / "data" / "excel-rows.json"
JS_OUT = ROOT / "js" / "excel-rows.js"

# Sayfa adı -> uygulamadaki anahtar
SHEET_KEYS = {
    "eşten-anne -babadan": "esAnneBaba",
    "anne-babadan": "anneBaba",
    "dul eşe": "dulEs",
}


def clean(value):
    """Hücre metnini normalize eder: NBSP -> boşluk, satır sonlarını ve
    çoklu boşlukları tek boşluğa indirger, sayıları tam sayı metnine çevirir."""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    if not isinstance(value, str):
        return str(value)
    text = value.replace("\xa0", " ")
    text = re.sub(r"\s*\n\s*", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def main():
    wb = xlrd.open_workbook(SRC)
    out = {}
    for sheet in wb.sheets():
        key = SHEET_KEYS.get(sheet.name)
        if key is None:
            continue
        header = [clean(sheet.cell_value(0, c)) for c in range(sheet.ncols)]
        header = [h for h in header if h]
        rows = []
        for r in range(1, sheet.nrows):
            cells = [clean(sheet.cell_value(r, c)) for c in range(sheet.ncols)]
            if not any(cells):
                continue
            rows.append({"row": r + 1, "cells": cells[: len(header)]})
        out[key] = {"sheet": sheet.name, "header": header, "rows": rows}

    # Sürüm damgası: kaynak dosyanın özeti, çıkarım tarihi ve satır sayısı
    digest = hashlib.sha256(SRC.read_bytes()).hexdigest()
    out["meta"] = {
        "dosya": SRC.name,
        "sha256": digest[:8],
        "cikarimTarihi": datetime.date.today().isoformat(),
        "satirSayisi": sum(len(sheet["rows"]) for sheet in out.values() if isinstance(sheet, dict) and "rows" in sheet),
    }

    JSON_OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    js = (
        "// Bu dosya scripts/extract_excel.py tarafından üretilir; elle düzenlenmez.\n"
        "// Kaynak: data/kadinlara_esinden_anne_babasindan.xls\n"
        "var SGK_EXCEL = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n"
        "if (typeof self !== 'undefined') { self.SGK_EXCEL = SGK_EXCEL; }\n"
    )
    JS_OUT.write_text(js, encoding="utf-8")
    for key, sheet in out.items():
        if key != "meta":
            print(f"{key}: {sheet['sheet']!r} -> {len(sheet['rows'])} satır")
    print("sürüm:", out["meta"])


if __name__ == "__main__":
    main()
