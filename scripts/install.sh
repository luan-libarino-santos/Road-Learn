#!/usr/bin/env bash
# Instala ou atualiza o Road-Learn: backend (venv, pip, migrate) + frontend (npm build) + PM2.
#
# Primeira vez (depois do git clone):
#   chmod +x scripts/install.sh
#   ./scripts/install.sh
#
# Atualização (já instalado):
#   ./scripts/install.sh --pull
#
# Flags:
#   --pull         git pull antes do build
#   --no-system    não instala python/node/pm2 via apt/npm global
#   --no-pm2       só builda; não sobe/reinicia o processo
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

PULL=0
INSTALL_SYSTEM=1
MANAGE_PM2=1

for arg in "$@"; do
  case "${arg}" in
    --pull) PULL=1 ;;
    --no-system) INSTALL_SYSTEM=0 ;;
    --no-pm2) MANAGE_PM2=0 ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *)
      echo "Flag desconhecida: ${arg}" >&2
      echo "Use: $0 [--pull] [--no-system] [--no-pm2]" >&2
      exit 1
      ;;
  esac
done

log() { printf '\n==> %s\n' "$*"; }
tem() { command -v "$1" >/dev/null 2>&1; }

PRIMEIRA=0
if [[ ! -d "${ROOT}/.venv" || ! -f "${ROOT}/.env" ]]; then
  PRIMEIRA=1
fi

if [[ "${PULL}" -eq 1 ]]; then
  log "git pull"
  git pull --ff-only
fi

if [[ "${INSTALL_SYSTEM}" -eq 1 ]]; then
  if ! tem python3 || ! python3 -c "import venv" >/dev/null 2>&1; then
    log "Instalando Python (apt)"
    sudo apt-get update -y
    sudo apt-get install -y python3 python3-venv python3-pip git sqlite3 curl
  fi
  if ! tem node || ! tem npm; then
    log "Instalando Node.js 22 (só para o build do front)"
    if [[ ! -f /etc/apt/sources.list.d/nodesource.list ]]; then
      curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    fi
    sudo apt-get install -y nodejs
  fi
  if [[ "${MANAGE_PM2}" -eq 1 ]] && ! tem pm2; then
    log "Instalando PM2"
    if ! tem npm; then
      echo "npm não encontrado; instale o Node antes do PM2." >&2
      exit 1
    fi
    sudo npm install -g pm2
  fi
fi

if ! tem python3; then
  echo "python3 não encontrado. Rode sem --no-system ou instale python3-venv." >&2
  exit 1
fi
if ! tem node || ! tem npm; then
  echo "Node/npm não encontrados. Precisam existir para o build do frontend." >&2
  exit 1
fi

log "Backend: venv + pip"
if [[ ! -d "${ROOT}/.venv" ]]; then
  python3 -m venv "${ROOT}/.venv"
fi
# shellcheck disable=SC1091
source "${ROOT}/.venv/bin/activate"
python -m pip install --upgrade pip
pip install -r "${ROOT}/requirements.txt"

if [[ ! -f "${ROOT}/.env" ]]; then
  log "Criando .env (primeira instalação)"
  cp "${ROOT}/.env.example" "${ROOT}/.env"
  SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(50))')"
  APIKEY="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
  python - "${ROOT}/.env" "${SECRET}" "${APIKEY}" <<'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
secret, apikey = sys.argv[2], sys.argv[3]
text = path.read_text(encoding="utf-8")
repl = {
    "SECRET_KEY=altere-para-uma-chave-secreta-forte": f"SECRET_KEY={secret}",
    "DEBUG=True": "DEBUG=False",
    "ROADLEARN_API_KEY=altere-esta-chave": f"ROADLEARN_API_KEY={apikey}",
}
for old, new in repl.items():
    text = text.replace(old, new)
path.write_text(text, encoding="utf-8")
PY
  echo "  DEBUG=False  ALLOWED_HOSTS=* (IP público da Oracle é aceito)"
  echo "  ROADLEARN_API_KEY gravada no .env — copie para os outros módulos do hub."
fi

if grep -q '^ALLOWED_HOSTS=' "${ROOT}/.env"; then
  if ! grep -qE '^ALLOWED_HOSTS=.*\*' "${ROOT}/.env"; then
    log "Ajustando ALLOWED_HOSTS=* (libera http://150.230.230.89:8002)"
    sed -i 's/^ALLOWED_HOSTS=.*/ALLOWED_HOSTS=*/' "${ROOT}/.env"
  fi
else
  printf '\nALLOWED_HOSTS=*\n' >> "${ROOT}/.env"
fi

PUBLIC_ORIGIN="http://150.230.230.89:8002"
if grep -q '^CSRF_TRUSTED_ORIGINS=' "${ROOT}/.env"; then
  if ! grep -qE "^CSRF_TRUSTED_ORIGINS=.*150\\.230\\.230\\.89:8002" "${ROOT}/.env"; then
    log "Incluindo ${PUBLIC_ORIGIN} em CSRF_TRUSTED_ORIGINS"
    sed -i "s|^CSRF_TRUSTED_ORIGINS=.*|CSRF_TRUSTED_ORIGINS=${PUBLIC_ORIGIN},http://150.230.230.89,http://127.0.0.1:8002,http://localhost:5173|" "${ROOT}/.env"
  fi
else
  printf '\nCSRF_TRUSTED_ORIGINS=%s,http://150.230.230.89,http://127.0.0.1:8002,http://localhost:5173\n' "${PUBLIC_ORIGIN}" >> "${ROOT}/.env"
fi

if grep -q '^ALLOW_ANY_HOST=' "${ROOT}/.env"; then
  sed -i 's/^ALLOW_ANY_HOST=.*/ALLOW_ANY_HOST=True/' "${ROOT}/.env"
else
  printf '\nALLOW_ANY_HOST=True\n' >> "${ROOT}/.env"
fi

log "Backend: migrate"
python "${ROOT}/manage.py" migrate --noinput

log "Frontend: npm + vite build"
if [[ ! -f "${ROOT}/frontend/package.json" ]]; then
  echo "frontend/package.json não encontrado." >&2
  exit 1
fi
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=384}"
cd "${ROOT}/frontend"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
npm run build
cd "${ROOT}"

if [[ ! -f "${ROOT}/static/app/index.html" ]]; then
  echo "Build do front falhou: static/app/index.html não existe." >&2
  exit 1
fi

log "Backend: collectstatic"
python "${ROOT}/manage.py" collectstatic --noinput
deactivate

if [[ "${MANAGE_PM2}" -eq 1 ]]; then
  if ! tem pm2; then
    echo "PM2 não encontrado. Instale ou use --no-pm2." >&2
    exit 1
  fi
  log "PM2"
  if pm2 describe road-learn >/dev/null 2>&1; then
    pm2 restart road-learn --update-env
  else
    pm2 start "${ROOT}/ecosystem.config.cjs"
    pm2 save
    echo "Para subir no boot, rode uma vez: pm2 startup"
    echo "e execute o comando sudo que o PM2 imprimir."
  fi
  pm2 status road-learn || pm2 status
fi

log "Pronto"
if [[ "${PRIMEIRA}" -eq 1 ]]; then
  echo "Primeira instalação concluída."
else
  echo "Atualização concluída (backend + frontend rebuild)."
fi
echo "App:    http://150.230.230.89:8002"
echo "Saúde:  http://150.230.230.89:8002/api/v1/saude"
echo "Logs:   pm2 logs road-learn"
