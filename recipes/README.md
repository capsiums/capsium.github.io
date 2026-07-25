# Capsium deployment recipes

Copy-paste recipes for serving `.cap` packages behind common reverse
proxies. Each recipe is self-contained: Dockerfile + config +
docker-compose.yml + README.

| Recipe | Reverse proxy | Best for |
|---|---|---|
| [Apache httpd](./apache/) | Apache 2.4 + mod_proxy + mod_ssl | Sites already running Apache; defense in depth with `mod_auth_basic` |
| [Caddy](./caddy/) | Caddy 2 | New deployments wanting auto-TLS with minimal config |

Both recipes use the same backend: the Ruby `capsium` gem's reactor
serving a `.cap` package on `localhost:9292`. The reverse proxy handles
TLS termination, logging, and any URL rewriting the operator needs.

## Quick start (either recipe)

```bash
cd recipes/<apache|caddy>
cp /path/to/your-package.cap capsium-package.cap
docker compose up --build
curl -k https://localhost/
```

## Production hardening checklist

- Replace self-signed certs with real ones (Let's Encrypt, corp CA)
- Pin the `capsium` gem version in the reactor image
- Set up health checks on the reactor's `/api/v1/introspect/status`
- Configure rate limiting + WAF rules at the proxy layer
- Log to a central sink (Loki, CloudWatch, etc.)

## Related

- CC 62001 §07 (reactor) — the contract the reactor implements
- CC 62001 Annex 93 — Apache blueprint
- [capsium install](https://capsium.org/install) — get the gem
