FROM node:22-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
# hls.js is served by the gateway itself, so the player also works with no internet access on the LAN
RUN npm install --omit=dev --no-save hls.js@1 \
 && mkdir -p public \
 && cp node_modules/hls.js/dist/hls.min.js public/hls.min.js \
 && rm -rf node_modules
COPY server.js ./
COPY public/player.html ./public/player.html
ENV PORT=8765 CACHE_DIR=/cache NODE_ENV=production
EXPOSE 8765
VOLUME ["/cache"]
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node","server.js"]
