#!/usr/bin/env bash
# Instala e coloca no ar o Auditor de Cobertura WAF (Akamai).
# Uso: ./setup.sh   (não rode com sudo - o script pede senha quando precisar)
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
info() { echo -e "${BLUE}==>${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

if [ "$EUID" -eq 0 ]; then
  fail "Não rode este script com sudo. Rode como seu usuário normal: ./setup.sh (ele pede senha quando precisar)."
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo -e "${BOLD}======================================================${NC}"
echo -e "${BOLD}  Auditor de Cobertura WAF (Akamai) — Instalação${NC}"
echo -e "${BOLD}======================================================${NC}"
echo

# ---- 1. Python ----
info "Verificando Python 3..."
command -v python3 >/dev/null || fail "python3 não encontrado. Instale com: sudo apt install python3 python3-venv"
ok "Python 3 encontrado: $(python3 --version)"

# ---- 2. Bibliotecas de sistema do WeasyPrint (geração de PDF) ----
info "Verificando bibliotecas de sistema necessárias para gerar PDF..."
MISSING_LIBS=()
for lib in libpango-1.0-0 libpangocairo-1.0-0 libcairo2 libgdk-pixbuf-2.0-0; do
  dpkg -s "$lib" >/dev/null 2>&1 || MISSING_LIBS+=("$lib")
done
if [ ${#MISSING_LIBS[@]} -gt 0 ]; then
  warn "Faltam bibliotecas de sistema: ${MISSING_LIBS[*]}"
  if command -v apt-get >/dev/null; then
    info "Instalando via apt (vai pedir sua senha)..."
    sudo apt-get update -qq
    sudo apt-get install -y "${MISSING_LIBS[@]}"
    ok "Bibliotecas instaladas"
  else
    fail "Gerenciador apt não encontrado. Instale manualmente: ${MISSING_LIBS[*]}"
  fi
else
  ok "Bibliotecas do WeasyPrint já presentes"
fi

# ---- 3. Ambiente Python do backend ----
info "Configurando ambiente Python do backend..."
if [ ! -d backend/venv ]; then
  python3 -m venv backend/venv
  ok "Ambiente virtual criado em backend/venv"
else
  ok "Ambiente virtual já existe"
fi
backend/venv/bin/pip install --upgrade pip -q
backend/venv/bin/pip install -r backend/requirements.txt -q
ok "Dependências Python instaladas"

# ---- 4. Node.js ----
info "Verificando Node.js..."
export NVM_DIR="$HOME/.nvm"
NODE_OK=0
if command -v node >/dev/null; then
  NODE_MAJOR="$(node -v | sed 's/v//; s/\..*//')"
  [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null && NODE_OK=1
fi
if [ "$NODE_OK" -eq 1 ]; then
  ok "Node.js encontrado: $(node -v)"
else
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    info "Node.js não encontrado. Instalando nvm (não precisa de sudo)..."
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  fi
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  info "Instalando Node.js LTS via nvm..."
  nvm install --lts >/dev/null
  ok "Node.js instalado: $(node -v)"
fi
NPM_BIN="$(command -v npm)"
NODE_BIN_DIR="$(dirname "$NPM_BIN")"

# ---- 5. Dependências Node (raiz + frontend) ----
info "Instalando dependências Node (orquestração)..."
"$NPM_BIN" install --silent
ok "Dependências da raiz instaladas"

info "Instalando dependências do frontend..."
"$NPM_BIN" install --silent --prefix frontend
ok "Dependências do frontend instaladas"

# ---- 6. Serviço systemd (start persistente + auto-restart) ----
echo
if command -v systemctl >/dev/null; then
  info "Configurando serviço systemd para iniciar automaticamente e reiniciar sozinho se cair..."
  SERVICE_NAME="waf-auditor"
  APP_USER="$(whoami)"

  sed \
    -e "s#__APP_USER__#${APP_USER}#g" \
    -e "s#__APP_DIR__#${APP_DIR}#g" \
    -e "s#__NPM_BIN__#${NPM_BIN}#g" \
    -e "s#__NODE_BIN_DIR__#${NODE_BIN_DIR}#g" \
    deploy/waf-auditor.service.template > "/tmp/${SERVICE_NAME}.service"

  sudo cp "/tmp/${SERVICE_NAME}.service" "/etc/systemd/system/${SERVICE_NAME}.service"
  sudo systemctl daemon-reload
  sudo systemctl enable "$SERVICE_NAME" >/dev/null
  sudo systemctl restart "$SERVICE_NAME"

  info "Aguardando o serviço subir..."
  UP=0
  for _ in $(seq 1 20); do
    if curl -sf http://localhost:8000/api/health >/dev/null 2>&1; then
      UP=1
      break
    fi
    sleep 1
  done

  if [ "$UP" -eq 1 ]; then
    ok "Serviço '${SERVICE_NAME}' rodando e respondendo"
  else
    warn "Serviço instalado mas ainda não respondeu. Isso pode ser normal (primeiro start demora um pouco mais)."
    warn "Verifique com: sudo systemctl status ${SERVICE_NAME}  e  journalctl -u ${SERVICE_NAME} -f"
  fi
else
  warn "systemd não disponível neste sistema."
  warn "Inicie manualmente sempre que for usar: npm start"
fi

echo
echo -e "${BOLD}======================================================${NC}"
ok "Instalação concluída!"
echo -e "${BOLD}======================================================${NC}"
echo
echo -e "  Acesse:  ${BOLD}http://localhost:5174${NC}"
echo
echo "  Comandos úteis (serviço persistente):"
echo "    sudo systemctl status waf-auditor     -> ver se está rodando"
echo "    journalctl -u waf-auditor -f          -> ver logs em tempo real"
echo "    sudo systemctl restart waf-auditor    -> reiniciar"
echo "    sudo systemctl stop waf-auditor       -> parar"
echo
