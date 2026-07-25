# Serve Capsium packages behind Apache httpd.
#
# Apache fronts the network; capsium reactor serves the actual .cap
# package on localhost:9292. mod_proxy_http forwards; mod_ssl
# terminates TLS; mod_auth_basic provides htpasswd authn if needed.
#
# Usage:
#   docker compose up --build
#   curl -k https://localhost/
#
# The reactor stays single-purpose (serve .cap); Apache handles TLS,
# auth, logging, and any URL rewriting the operator needs. This is
# the same deployment shape Annex 93 of CC 62001 describes.

FROM httpd:2.4

# Enable the proxy, proxy_http, ssl, and headers modules Apache needs
# to forward to the capsium reactor and terminate TLS.
RUN sed -i \
  -e 's/^#\(LoadModule proxy_module\)/\1/' \
  -e 's/^#\(LoadModule proxy_http_module\)/\1/' \
  -e 's/^#\(LoadModule ssl_module\)/\1/' \
  -e 's/^#\(LoadModule headers_module\)/\1/' \
  -e 's/^#\(LoadModule auth_basic_module\)/\1/' \
  -e 's/^#\(LoadModule authn_file_module\)/\1/' \
  -e 's/^#\(LoadModule authz_user_module\)/\1/' \
  -e 's/^#\(LoadModule rewrite_module\)/\1/' \
  conf/httpd.conf

# Capsium vhost: TLS termination + reverse proxy to the reactor.
COPY capsium.apache.conf /usr/local/apache2/conf/extra/capsium.apache.conf
RUN echo 'Include conf/extra/capsium.apache.conf' >> conf/httpd.conf

# Self-signed cert for local testing. Operators replace with real
# certs in production (Let's Encrypt, corporate CA, etc.).
RUN openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout /usr/local/apache2/conf/server.key \
  -out /usr/local/apache2/conf/server.crt \
  -days 365 -subj "/CN=localhost"
