# fivucsas.com — Vite landing build served by nginx behind Traefik.
# Migrated off Hostinger (plan cancelled 2026-06) onto the Hetzner box.
# Packages the pre-built dist/ (from `npm run build`, locally or in CI).
FROM nginx:1.27-alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/landing.conf
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
