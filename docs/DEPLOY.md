# Deploy — Road-Learn (Ubuntu + PM2)

Guia para Ubuntu 22.04/24.04 LTS em VM pequena (**~1 GB RAM**, 2 threads). O Road-Learn é o app de estudos do hub:

| App | Porta |
|-----|-------|
| Dinheiro do Luan | 8000 |
| Tasks | 8001 |
| **Road-Learn** | **8002** |
| Treinos | 3001 |

Perfil leve: Gunicorn `--workers 1 --threads 2` via PM2. **Não aumente workers.** Node.js só é necessário para **compilar** o front; em runtime não fica nenhum processo `node`.

## 1. Pacotes

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip git sqlite3 curl

# Node 22 — só para o build do Vite
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
```

## 2. PM2

```bash
sudo npm install -g pm2
```

## 3. App (primeira instalação e atualizações)

Um único script faz venv, pip, `.env`, migrate, **build do front**, collectstatic e PM2.

```bash
cd /opt
sudo git clone https://github.com/luan-libarino-santos/Road-Learn.git road-learn
sudo chown -R $USER:$USER /opt/road-learn
cd /opt/road-learn

chmod +x scripts/install.sh scripts/backup_sqlite.sh
./scripts/install.sh
```

Na primeira vez ele cria `.venv`, gera `SECRET_KEY` / `ROADLEARN_API_KEY`, põe `DEBUG=False` e sobe o PM2. Nas próximas, o mesmo comando **rebuilda backend e frontend** e dá `pm2 restart`.

Ajuste os links do hub e a chave Gemini (opcional):

```bash
nano .env
# HUB_DINHEIRO_URL / HUB_TREINOS_URL / HUB_TASKS_URL
# GEMINI_API_KEY
```

Flags úteis:

```bash
./scripts/install.sh --pull          # git pull + rebuild completo
./scripts/install.sh --no-system     # não instala python/node/pm2 (já tem na VM)
./scripts/install.sh --no-pm2        # só builda, não mexe no processo
```

O `npm run build` gera `static/app/` (SPA). O `collectstatic` copia isso para `staticfiles/` (WhiteNoise).

## 4. PM2 no boot

O script já faz `pm2 start` / `restart` e `pm2 save` na primeira subida. Para voltar após reboot:

```bash
pm2 startup
```

O comando imprime um `sudo env PATH=...`; execute-o uma vez.

O Gunicorn escuta em `0.0.0.0:8002`. No navegador use o **IP público**, não `localhost`.

- App: `http://150.230.230.89:8002`
- Saúde: `http://150.230.230.89:8002/api/v1/saude`
- Status: `pm2 status`
- Logs: `pm2 logs road-learn`
- Reiniciar: `pm2 restart road-learn`

Confirme o bind: `ss -tlnp | grep 8002` — deve aparecer `0.0.0.0:8002`.

## 5. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow from SEU.IP.PUBLICO to any port 8002 proto tcp
sudo ufw enable
```

O app não tem login. Quem alcança a porta vê e edita todos os roadmaps.

## 6. Atualizar

```bash
cd /opt/road-learn
./scripts/install.sh --pull
```

Equivale a `git pull` + rebuild de backend e frontend + `pm2 restart`. Sem `--pull` (se você já deu `git pull` na mão):

```bash
./scripts/install.sh --no-system
```

## 7. Backup diário

```bash
chmod +x /opt/road-learn/scripts/backup_sqlite.sh
crontab -e
```

```
40 3 * * * DB=/opt/road-learn/db.sqlite3 BACKUP_DIR=/opt/road-learn/backups /opt/road-learn/scripts/backup_sqlite.sh >> /opt/road-learn/backups/cron.log 2>&1
```

Há download em `/backup/`.

## 8. RAM — cuidados Always Free / 1 GB

- **Não** use a fórmula `(2×CPU)+1` workers no Gunicorn.
- O `ecosystem.config.cjs` já fixa 1 worker e 2 threads.
- Swap de 1–2 GB ajuda se `npm run build` ou `pip` sofrerem OOM.
- Depois do build, não deixe `npm run dev` rodando.

## Checklist

- [ ] `.env` com `DEBUG=False`, `SECRET_KEY` forte, `ALLOWED_HOSTS` e `ROADLEARN_API_KEY`
- [ ] `python manage.py migrate`
- [ ] `npm run build` gerou `static/app/index.html`
- [ ] `collectstatic` executado
- [ ] `pm2 status` mostra `road-learn` online
- [ ] `http://IP:8002/api/v1/saude` responde `ok`
- [ ] `/static/app/` carrega o JS da SPA
- [ ] Firewall da porta 8002
- [ ] Cron de backup
