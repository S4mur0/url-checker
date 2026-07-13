# Auditor de Cobertura WAF (Akamai)

Ferramenta local para escanear seus domínios e descobrir quais estão **online**, **offline**, com qual **status HTTP**, se estão **expostos externamente ou só internamente** (IP privado) e, principalmente, **se têm proteção Akamai ou não**. Gera relatório executivo em **XLSX** e **PDF** ao final de cada scan.

Domínios e scans são organizados por **projeto** (ex: um projeto por cliente/engajamento) — veja [Uso básico](#uso-básico).

---

## Instalação

Pré-requisito: Linux (Ubuntu/Debian ou WSL2 com systemd habilitado) com `sudo`.

```bash
git clone https://github.com/S4mur0/url-checker.git url_checker
cd url_checker
./setup.sh
```

O script instala tudo sozinho: Python, dependências do backend, Node.js (via nvm, se não existir), dependências do frontend, e configura um **serviço systemd** para o sistema **iniciar sozinho e reiniciar automaticamente** se cair — assim ninguém precisa deixar um terminal aberto rodando a aplicação.

Ao final, acesse: **http://localhost:5174**

> O script vai pedir sua senha (`sudo`) em dois momentos: para instalar bibliotecas de sistema (geração de PDF) e para instalar o serviço systemd. É esperado.

---

## Como saber se está rodando

```bash
sudo systemctl status waf-auditor
```

Se aparecer `active (running)` em verde, está tudo certo — abra http://localhost:5174.

Se não subir, o comando abaixo mostra exatamente o que aconteceu (não precisa ficar adivinhando):

```bash
journalctl -u waf-auditor -f
```

Isso mostra os logs do backend e do frontend em tempo real (`Ctrl+C` para sair). As causas mais comuns de erro:

| Sintoma no log | Causa | Solução |
|---|---|---|
| `Address already in use` | Outra coisa já está usando a porta 8000 ou 5174 | `sudo lsof -i :8000` (ou `:5174`) para achar o processo e encerrá-lo, depois `sudo systemctl restart waf-auditor` |
| `ModuleNotFoundError` / erro do Python | Dependências do backend não instaladas corretamente | Rode `./setup.sh` de novo |
| Erro mencionando `pango`/`cairo`/`weasyprint` | Falta biblioteca de sistema para gerar PDF | Rode `./setup.sh` de novo (ele reinstala essas libs) |
| `npm: command not found` | Node.js não foi encontrado no PATH do serviço | Rode `./setup.sh` de novo — ele regrava o serviço com o caminho correto do Node |

### Comandos úteis

```bash
sudo systemctl status waf-auditor     # ver se está rodando
journalctl -u waf-auditor -f          # ver logs em tempo real
sudo systemctl restart waf-auditor    # reiniciar
sudo systemctl stop waf-auditor       # parar
sudo systemctl start waf-auditor      # iniciar de novo
```

Como o serviço é `enabled`, ele também sobe sozinho se a máquina reiniciar.

---

## Uso básico

1. **Abra** http://localhost:5174 — na primeira vez, ele pede pra criar um projeto (ex: nome do cliente).
2. **Domínios** → cadastre os domínios a auditar. Dá pra colar um por vez, colar uma lista, ou importar um CSV (a ferramenta detecta automaticamente qual coluna é o domínio).
3. **Scan** → selecione os domínios (ou todos) e clique em Iniciar Scan. Acompanha o progresso ao vivo.
4. **Relatórios** → cada scan fica salvo no histórico. Abra um relatório e exporte em **XLSX** ou **PDF** — ambos já vêm com a lista de risco priorizada (domínios expostos externamente e sem proteção Akamai aparecem primeiro).
5. **Projetos** (menu lateral) → crie quantos projetos precisar; cada um tem sua própria lista de domínios e histórico de scans, totalmente isolados.

---

## Rodando sem instalar como serviço (modo manual)

Se preferir não usar systemd (ex: para desenvolver/testar), depois do `./setup.sh` você pode rodar manualmente a qualquer momento:

```bash
npm start
```

Isso sobe backend (porta 8000) e frontend (porta 5174) juntos, com logs coloridos no mesmo terminal. `Ctrl+C` para parar. Nesse modo, se fechar o terminal a aplicação para — por isso o modo serviço (systemd) é o recomendado para uso do dia a dia.

---

## Desinstalar

```bash
sudo systemctl stop waf-auditor
sudo systemctl disable waf-auditor
sudo rm /etc/systemd/system/waf-auditor.service
sudo systemctl daemon-reload
```

Os dados ficam em `backend/url_checker.db` (SQLite) — apague esse arquivo se quiser zerar tudo, ou faça uma cópia dele para manter um backup antes.

---

## Estrutura do projeto

```
url_checker/
├── setup.sh                 # instalação automática
├── package.json             # orquestra backend + frontend (npm start)
├── deploy/                  # template do serviço systemd
├── backend/                 # FastAPI + SQLite (porta 8000)
└── frontend/                # React + Vite (porta 5174)
```

---

## Stack

Python (FastAPI, SQLAlchemy, httpx, dnspython, openpyxl, WeasyPrint) + React (Vite) + SQLite. Sem dependências externas pagas — tudo roda localmente.
