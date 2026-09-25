#!/usr/bin/env python3
"""Initialize pinned modules and keep optional sibling aliases without copying data."""
import argparse
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
MODULES = json.loads((ROOT / "workspace.json").read_text())["modules"]


def run(*args):
    subprocess.run(args, cwd=ROOT, check=True)


def check():
    entries = subprocess.check_output(["git", "ls-files", "--stage", "-z"], cwd=ROOT).decode().split("\0")
    modes = {entry.split("\t", 1)[1]: entry.split()[0] for entry in entries if entry}
    for module in MODULES:
        path = ROOT / module["path"]
        if modes.get(module["path"]) != "160000":
            raise SystemExit(f"Não é gitlink/submódulo: {module['path']}")
        if path.is_symlink():
            raise SystemExit(f"O submódulo deve ser uma pasta real: {module['path']}")
        if (path / ".git").exists():
            expected = subprocess.check_output(["git", "rev-parse", f":{module['path']}"], cwd=ROOT).strip()
            actual = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=path).strip()
            if expected != actual:
                raise SystemExit(f"Ponteiro diverge do checkout: {module['path']}")
        print(f"OK {module['path']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["init", "link-dev", "check"])
    parser.add_argument("--legacy", action="store_true", help="Inicializar também referências antigas, sem recursão")
    parser.add_argument("--dev-directory", type=Path, default=ROOT.parent)
    args = parser.parse_args()
    if args.command == "init":
        selected = [m["path"] for m in MODULES if m["active"] or args.legacy]
        # Never recursively initialize legacy/secrets or download llama.cpp implicitly.
        run("git", "submodule", "update", "--init", "--checkout", "--", *selected)
    elif args.command == "check":
        check()
    else:
        destination = args.dev_directory.resolve()
        destination.mkdir(parents=True, exist_ok=True)
        for module in MODULES:
            target = ROOT / module["path"]
            if not (target / ".git").exists():
                continue
            alias = destination / module["alias"]
            if alias.is_symlink() and alias.resolve() == target.resolve():
                continue
            if alias.exists() or alias.is_symlink():
                raise SystemExit(f"Caminho ocupado; nada foi removido: {alias}")
            alias.symlink_to(os.path.relpath(target, destination), target_is_directory=True)
            print(f"{alias.name} -> {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
