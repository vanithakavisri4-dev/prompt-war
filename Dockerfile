FROM nginx:1.27-alpine

# Add security labels
LABEL maintainer="ArenaFlow AI Team" \
      version="2.0.0" \
      description="ArenaFlow AI — Predictive Stadium Experience Orchestrator" \
      org.opencontainers.image.title="ArenaFlow AI" \
      org.opencontainers.image.description="AI-powered crowd flow optimization" \
      org.opencontainers.image.vendor="ArenaFlow AI Team" \
      org.opencontainers.image.version="2.0.0" \
      org.opencontainers.image.licenses="MIT"

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config with security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy application files
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/

# Copy manifest for PWA support
COPY manifest.json /usr/share/nginx/html/

# Run as non-root user for security (workers drop privileges)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
