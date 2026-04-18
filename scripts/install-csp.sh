#!/bin/bash
# =============================================================================
# Install/Update Content-Security-Policy header in Nginx config
# =============================================================================
# Adds (or replaces) a strict CSP header tailored to rv-installatie.nl.
# Sources allowed reflect what the site actually loads:
#   - Self (own assets)
#   - Google Fonts (fonts.googleapis.com / fonts.gstatic.com)
#   - Sentry (browser SDK + ingest endpoint)
#   - Google AdSense (pagead2.googlesyndication.com)
#   - Cloudflare Insights (static.cloudflareinsights.com — auto-injected)
#   - reCAPTCHA (google.com/recaptcha + gstatic recaptcha) for forms
#   - data: / blob: for images & fonts (PDF generation, base64 logos)
#
# Idempotent: safe to run multiple times. Backs up before each change.
#
# Usage:  sudo bash scripts/install-csp.sh
# =============================================================================

set -euo pipefail

# Auto-detect Nginx config: probeer eerst override via $1, dan bekende paden,
# dan fallback: zoek in sites-available naar bestand dat 'rv-installatie.nl' bevat
NGINX_CONF="${1:-}"
if [[ -z "$NGINX_CONF" ]]; then
  for candidate in \
    /etc/nginx/sites-available/rv-installatie \
    /etc/nginx/sites-available/rv-installatie.nl \
    /etc/nginx/sites-available/comfort-connect \
    /etc/nginx/sites-available/default; do
    if [[ -f "$candidate" ]]; then
      NGINX_CONF="$candidate"
      break
    fi
  done
fi
if [[ -z "$NGINX_CONF" || ! -f "$NGINX_CONF" ]]; then
  # Laatste poging: grep naar server_name rv-installatie.nl
  FOUND=$(grep -rlE 'server_name[[:space:]]+[^;]*rv-installatie\.nl' /etc/nginx/sites-available/ 2>/dev/null | head -1 || true)
  if [[ -n "$FOUND" ]]; then
    NGINX_CONF="$FOUND"
  fi
fi

BACKUP_DIR="/etc/nginx/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/$(basename "${NGINX_CONF:-unknown}").${TIMESTAMP}.bak"

# Marker line so we can find & replace our own CSP block on re-runs
CSP_MARKER="# === MANAGED CSP HEADER (install-csp.sh) ==="
CSP_END_MARKER="# === END MANAGED CSP HEADER ==="

# Build the CSP value (single line for nginx)
CSP_VALUE="default-src 'self'; \
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://*.sentry.io https://browser.sentry-cdn.com https://js.sentry-cdn.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://www.google.com https://www.gstatic.com; \
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; \
font-src 'self' data: https://fonts.gstatic.com; \
img-src 'self' data: blob: https:; \
connect-src 'self' https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://static.cloudflareinsights.com https://www.google-analytics.com https://pagead2.googlesyndication.com; \
frame-src 'self' https://www.google.com https://googleads.g.doubleclick.net https://*.googlesyndication.com; \
worker-src 'self' blob:; \
media-src 'self' blob: data:; \
object-src 'none'; \
base-uri 'self'; \
form-action 'self'; \
frame-ancestors 'none'; \
upgrade-insecure-requests"

# -----------------------------------------------------------------------------
# Pre-flight checks
# -----------------------------------------------------------------------------
if [[ $EUID -ne 0 ]]; then
  echo "❌ Dit script moet als root draaien. Gebruik: sudo bash $0"
  exit 1
fi

if [[ -z "$NGINX_CONF" || ! -f "$NGINX_CONF" ]]; then
  echo "❌ Nginx config niet automatisch gevonden."
  echo "   Beschikbare configs in /etc/nginx/sites-available/:"
  ls -1 /etc/nginx/sites-available/ 2>/dev/null | sed 's/^/     /'
  echo ""
  echo "   Geef het pad expliciet mee:"
  echo "     sudo bash $0 /etc/nginx/sites-available/JOUW-CONFIG"
  exit 1
fi

echo "📄 Gebruikt config: $NGINX_CONF"

mkdir -p "$BACKUP_DIR"
cp "$NGINX_CONF" "$BACKUP_FILE"
echo "📦 Backup gemaakt: $BACKUP_FILE"

# -----------------------------------------------------------------------------
# Verwijder bestaande managed CSP (zo idempotent)
# -----------------------------------------------------------------------------
if grep -qF "$CSP_MARKER" "$NGINX_CONF"; then
  echo "🔄 Bestaande managed CSP gevonden — wordt vervangen."
  sed -i "/${CSP_MARKER}/,/${CSP_END_MARKER}/d" "$NGINX_CONF"
fi

# Waarschuw als er een handmatige CSP staat (overschrijven we niet)
if grep -qiE 'add_header[[:space:]]+Content-Security-Policy' "$NGINX_CONF"; then
  echo "⚠️  Er staat al een handmatige Content-Security-Policy in de config!"
  echo "    Verwijder die eerst handmatig — anders krijg je dubbele headers."
  echo "    Locaties:"
  grep -n -iE 'add_header[[:space:]]+Content-Security-Policy' "$NGINX_CONF"
  exit 1
fi

# -----------------------------------------------------------------------------
# Voeg CSP toe in het eerste 'server {' blok, net na de openings-accolade
# -----------------------------------------------------------------------------
CSP_BLOCK="    ${CSP_MARKER}
    add_header Content-Security-Policy \"${CSP_VALUE}\" always;
    ${CSP_END_MARKER}
"

# Insert na de eerste 'server {' regel
awk -v block="$CSP_BLOCK" '
  /^[[:space:]]*server[[:space:]]*\{/ && !done {
    print
    print block
    done=1
    next
  }
  { print }
' "$NGINX_CONF" > "${NGINX_CONF}.tmp"

mv "${NGINX_CONF}.tmp" "$NGINX_CONF"
echo "✅ CSP header toegevoegd."

# -----------------------------------------------------------------------------
# Test & reload Nginx
# -----------------------------------------------------------------------------
echo ""
echo "🔍 Nginx config testen..."
if nginx -t 2>&1; then
  echo ""
  echo "♻️  Nginx herladen..."
  systemctl reload nginx
  echo ""
  echo "✅ KLAAR! CSP is actief."
  echo ""
  echo "Verifieer met:"
  echo "  curl -sI https://rv-installatie.nl | grep -i content-security"
  echo ""
  echo "Check je grade opnieuw:"
  echo "  https://securityheaders.com/?q=https://rv-installatie.nl&followRedirects=on"
else
  echo ""
  echo "❌ Nginx config test FAILED — terugrollen naar backup..."
  cp "$BACKUP_FILE" "$NGINX_CONF"
  echo "✅ Backup teruggezet. Nginx is NIET herladen."
  exit 1
fi
