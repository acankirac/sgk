#!/usr/bin/env bash
# Sunucuda root olarak bir kez çalıştırılır. Uygulamayı GitHub'dan çeker,
# nginx + HTTPS kurar ve her 5 dakikada bir güncelleyen görev ekler.
set -euo pipefail
REPO="${REPO:-https://github.com/acankirac/sgk.git}"
BRANCH="${BRANCH:-claude/bold-rubin-2yarjv}"
DOMAIN="${DOMAIN:-sgk.krccorp.net}"
SRC=/opt/sgk
DEST=/var/www/cift-aylik

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx git rsync certbot python3-certbot-nginx >/dev/null

if [ -d "$SRC/.git" ]; then git -C "$SRC" fetch -q origin "$BRANCH" && git -C "$SRC" checkout -q -B "$BRANCH" "origin/$BRANCH"
else git clone -q --branch "$BRANCH" "$REPO" "$SRC"; fi

cat > /usr/local/bin/sgk-update <<UPD
#!/usr/bin/env bash
set -e
git -C $SRC fetch -q origin $BRANCH
git -C $SRC reset -q --hard origin/$BRANCH
mkdir -p $DEST
rsync -a --delete --include='index.html' --include='sw.js' --include='manifest.webmanifest' \\
  --include='css/***' --include='js/***' --include='assets/***' --exclude='*' $SRC/ $DEST/
chown -R www-data:www-data $DEST
UPD
chmod +x /usr/local/bin/sgk-update
/usr/local/bin/sgk-update

cp "$SRC/deploy/nginx.conf" /etc/nginx/sites-available/cift-aylik
sed -i "s/server_name .*;/server_name $DOMAIN;/" /etc/nginx/sites-available/cift-aylik
ln -sf /etc/nginx/sites-available/cift-aylik /etc/nginx/sites-enabled/cift-aylik
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "*/5 * * * * root /usr/local/bin/sgk-update >/dev/null 2>&1" > /etc/cron.d/sgk-update

certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --redirect -d "$DOMAIN" \
  && systemctl reload nginx \
  || echo "UYARI: sertifika alınamadı; uygulama http://$DOMAIN/ üzerinde. Sonra: certbot --nginx -d $DOMAIN"

echo "Tamam: https://$DOMAIN/  (her 5 dakikada GitHub'dan güncellenir; elle: sgk-update)"
