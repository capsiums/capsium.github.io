# Serve Capsium packages behind Caddy.
#
# Caddy handles TLS automatically (Let's Encrypt for real domains,
# internal CA for localhost). Reverse-proxy to the capsium reactor.
#
# Usage:
#   docker compose up
#   curl -k https://localhost/
#
# Single Caddyfile + docker-compose.yml is the entire recipe. Caddy
# is intentionally minimal config; the reactor stays the source of
# truth for routes + content.

FROM caddy:2

COPY Caddyfile /etc/caddy/Caddyfile
