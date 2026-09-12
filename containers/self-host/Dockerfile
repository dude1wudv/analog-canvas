FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.16.0
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm exec esbuild worker/self-host.ts --bundle --format=esm --platform=browser --tsconfig=tsconfig.check.json --outfile=dist/self-host/worker.js
RUN node -e "const fs=require('node:fs'); const pkg='@cloudflare/workerd-linux-'+(process.arch==='arm64'?'arm64':'64')+'/bin/workerd'; fs.copyFileSync(require.resolve(pkg,{paths:[require.resolve('workerd/package.json')]}),'dist/self-host/workerd'); fs.chmodSync('dist/self-host/workerd',0o755)"

FROM nginx:stable-alpine AS assets
COPY containers/self-host/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/editor/dist /usr/share/nginx/html
EXPOSE 80

FROM node:24-bookworm-slim AS runtime
ARG REVISION=codex/image-spice-import
ENV SOURCE_REVISION=$REVISION
LABEL org.opencontainers.image.source="https://github.com/dude1wudv/analog-canvas" \
      org.opencontainers.image.revision=$REVISION
WORKDIR /app
COPY --from=build /app/dist/self-host/workerd /usr/local/bin/workerd
COPY --from=build /app/node_modules/workerd/workerd.capnp /app/workerd.capnp
COPY --from=build /app/dist/self-host/worker.js /app/worker.js
COPY containers/self-host/start.mjs containers/self-host/runtime-config.mjs containers/self-host/init-secrets.mjs /app/
RUN workerd --version && node --check /app/start.mjs \
    && mkdir -p /data /secrets && chown 10001:10001 /data /secrets
USER 10001:10001
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "/app/start.mjs"]
