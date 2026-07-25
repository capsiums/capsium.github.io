# Apache httpd + Capsium reactor

A copy-paste recipe for serving a `.cap` package behind Apache httpd.
Apache handles TLS termination, logging, and URL rewriting; the
capsium reactor stays single-purpose (serve the package). This is the
deployment shape CC 62001 Annex 93 describes.

## Files

- `Dockerfile` — Apache httpd 2.4 with mod_proxy + mod_ssl enabled
- `capsium.apache.conf` — vhost config: TLS + reverse proxy to the reactor
- `docker-compose.yml` — runs the reactor + Apache together

## Quick start

```bash
cd recipes/apache

# Drop your .cap into the recipe directory.
cp /path/to/your-package.cap capsium-package.cap

# Bring up the stack.
docker compose up --build

# Verify (self-signed cert, hence -k).
curl -k https://localhost/
curl -k https://localhost/api/v1/introspect/status
```

## Production notes

- Replace the self-signed cert with a real one (Let's Encrypt, corp CA).
- Pin the `capsium` gem version: `gem install capsium -v 0.6.0`.
- For multi-package serving, mount multiple `.cap` files and update
  the reactor command to use `--mount` per package.
- Apache's `mod_cache` + `mod_cache_disk` cache the reactor's
  `Cache-Control`-tagged responses for free.

## Why Apache

If you already run Apache for other sites, adding a Capsium-served
package is a config change, not a new process to manage. Apache's
`Allow` / `Require` directives layer on top of Capsium's route-level
`accessControl` for defense in depth.
