#!/usr/bin/env python3
"""Inject a selected Infisical scope into a backend process without writing values."""
import argparse
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scope", choices=["backend", "worker", "training", "embedding"])
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command:
        parser.error("Informe o comando após --")
    path = ROOT / ".infisical.local.json"
    if not path.is_file():
        parser.error("Configure .infisical.local.json a partir de config/infisical.example.json")
    config = json.loads(path.read_text())
    folder = config["paths"][args.scope]
    if not folder.startswith("/") or folder == "/":
        parser.error("Use uma pasta específica; o escopo raiz não é permitido")
    invocation = ["infisical", "secrets", "--silent", "--output=json", "--expand=true", "--include-imports=false",
                  "--domain=" + config["domain"], "--projectId=" + config["projectId"],
                  "--env=" + config["environment"], "--path=" + folder]
    try:
        result = subprocess.run(invocation, capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired):
        raise SystemExit("Não foi possível consultar Infisical; confira CLI e autenticação.") from None
    if result.returncode:
        raise SystemExit("Falha no Infisical; confira ambiente, pasta e permissões. Saída omitida para proteger credenciais.")
    try:
        secrets = {item["secretKey"]: item["secretValue"] for item in json.loads(result.stdout)}
    except (ValueError, KeyError, TypeError):
        raise SystemExit("Resposta inválida do Infisical; nenhum processo foi iniciado.") from None
    if not secrets:
        raise SystemExit("Escopo sem variáveis; configure-o no Infisical antes de iniciar.")
    if args.scope == "embedding":
        mapping = {"sdk-gemini-1": "Gemini__ApiKey", "sdk-gemini-2": "Gemini__FallbackApiKey"}
        secrets = {mapping[k]: v for k, v in secrets.items() if k in mapping}
        if not secrets.get("Gemini__ApiKey"):
            raise SystemExit("Chave Gemini principal ausente no escopo.")
    if args.scope == "worker" and any(
        key.startswith(("Zitadel__", "Authentication__", "Frontend__", "Email__"))
        or key == "ConnectionStrings__Redis" for key in secrets
    ):
        raise SystemExit("O escopo worker contém configuração exclusiva da API; nenhum processo foi iniciado.")
    env = os.environ.copy()
    env.update(secrets)
    # exec preserves signals and exit status; values are never passed as arguments.
    os.execvpe(command[0], command, env)


if __name__ == "__main__":
    main()
