# Caddy + Capsium reactor

A copy-paste recipe for serving a `.cap` package behind Caddy. Caddy
handles TLS automatically (Let's Encrypt for real domains, internal CA
for localhost). The reactor stays single-purpose.

## Files

- `Dockerfile` — Caddy 2 with the Caddyfile baked in
- `Caddyfile` — reverse_proxy to the reactor + TLS
- `docker-compose.yml` — runs the reactor + Caddy together

## Quick start

```bash
cd recipes/caddy

# Drop your .cap into the recipe directory.
cp /path/to/your-package.cap capsium-package.cap

# Bring up the stack.
docker compose up --build

# Verify (Caddy uses internal CA for localhost; -k bypasses).
curl -k https://localhost/
curl -k https://localhost/api/v1/introspect/status
```

## Production notes

- For a real domain: change `:443` to `yourdomain.com` in the
  Caddyfile. Caddy auto-obtains Let's Encrypt certs.
- Pin the `capsium` gem version: `gem install capsium -v 0.6.0`.
- Caddy's built-in `encode` directive does zstd + gzip on responses
  the reactor didn't already compress. Capsium's `--brotli` pack
  option produces pre-compressed sidecars that take priority.

## Why Caddy

Caddy's config is dramatically shorter than Apache's for the same
result. Auto-TLS removes an entire class of operational pain. For
new deployments without existing Apache/nginx investment, Caddy is
the recommended baseline.
