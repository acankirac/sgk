#!/usr/bin/env bash
# Uygulamayı bir Ubuntu/Debian sunucuya nginx ile yayınlar.
# Kullanım (kendi bilgisayarınızdan, repo kökünde):
#   bash deploy/deploy.sh root@2.59.117.222
# Şifre sorulur; sshpass yüklüyse SSHPASS ortam değişkeni de kullanılabilir.
set -euo pipefail

HOST="${1:?Kullanım: deploy/deploy.sh kullanici@sunucu}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST=/var/www/cift-aylik

SSH=(ssh -o StrictHostKeyChecking=accept-new "$HOST")
if command -v sshpass >/dev/null && [ -n "${SSHPASS:-}" ]; then
  SSH=(sshpass -e ssh -o StrictHostKeyChecking=accept-new "$HOST")
fi

echo "1/4 Sunucu hazırlanıyor (nginx)…"
"${SSH[@]}" "export DEBIAN_FRONTEND=noninteractive; apt-get update -qq && apt-get install -y -qq nginx rsync >/dev/null && mkdir -p $DEST"

echo "2/4 Dosyalar kopyalanıyor…"
RSYNC_RSH="${SSH[*]:0:${#SSH[@]}-1}"
rsync -az --delete -e "$RSYNC_RSH" \
  --include='index.html' --include='sw.js' --include='manifest.webmanifest' \
  --include='css/***' --include='js/***' --include='assets/***' \
  --exclude='*' \
  "$ROOT/" "$HOST:$DEST/"

echo "3/4 nginx yapılandırılıyor…"
"${SSH[@]}" "cat > /etc/nginx/sites-available/cift-aylik" < "$ROOT/deploy/nginx.conf"
"${SSH[@]}" "ln -sf /etc/nginx/sites-available/cift-aylik /etc/nginx/sites-enabled/cift-aylik && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl reload nginx && chown -R www-data:www-data $DEST"

DOMAIN="${DOMAIN:-sgk.krccorp.net}"
echo "4/4 HTTPS sertifikası (Let's Encrypt) alınıyor: $DOMAIN …"
"${SSH[@]}" "export DEBIAN_FRONTEND=noninteractive; apt-get install -y -qq certbot python3-certbot-nginx >/dev/null && certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --redirect -d $DOMAIN && systemctl reload nginx" \
  || echo "Sertifika alınamadı (alan adı henüz sunucuya işaret etmiyor olabilir); uygulama HTTP'de yayında. Daha sonra sunucuda 'certbot --nginx -d $DOMAIN' çalıştırın."

echo "Yayında: https://$DOMAIN/"
