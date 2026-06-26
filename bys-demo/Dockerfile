# demo.fivucsas.com — static BYS demo served by nginx behind Traefik.
# Migrated off Hostinger (plan cancelled 2026-06) onto the Hetzner box.
FROM nginx:1.27-alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/bys-demo.conf
COPY . /usr/share/nginx/html
RUN cd /usr/share/nginx/html && rm -rf \
    Dockerfile nginx.conf docker-compose.prod.yml .dockerignore
EXPOSE 80
