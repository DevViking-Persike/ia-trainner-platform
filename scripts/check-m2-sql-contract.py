#!/usr/bin/env python3
"""Compare the three normative SQL blocks with a reviewed DDL checkout, byte for byte."""

import argparse
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ddl-dir", type=Path, default=ROOT / "database/ia-trainner-sql-ddl")
    args = parser.parse_args()
    contract = (ROOT / "docs/contracts/m2/banco-de-dados.md").read_text()
    blocks = re.findall(r"^```sql\n(.*?)^```$", contract, re.M | re.S)
    sources = (
        "scripts/verify/infra-bootstrap.sql",
        "postgresql/V0001__documents_core.sql",
        "postgresql/V0002__outbox_inbox.sql",
    )
    if len(blocks) != len(sources):
        sys.exit("Esperados exatamente três blocos SQL normativos no contrato.")
    for block, source in zip(blocks, sources):
        file = args.ddl_dir / source
        if not file.is_file():
            sys.exit(f"Arquivo ausente: {file}; informe --ddl-dir com o checkout revisado.")
        if block.encode("utf-8") != file.read_bytes():
            sys.exit(f"Contrato divergente de {source}.")
        print(f"SQL idêntico: {source}")


if __name__ == "__main__":
    main()
