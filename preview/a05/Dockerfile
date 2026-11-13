FROM node:22-alpine
WORKDIR /app
COPY research/a05/d206-editorial-50-question-bank-v1-2.json research/a05/d206-editorial-50-question-bank-v1-2.json
COPY research/a05/d213-p0-editorial-decisions.json research/a05/d213-p0-editorial-decisions.json
COPY research/a05/d210-research-template.html research/a05/d210-research-template.html
COPY scripts/a05-d208-research-sampler.mjs scripts/a05-d208-research-sampler.mjs
COPY scripts/a05-d210-build-offline-form.mjs scripts/a05-d210-build-offline-form.mjs
COPY projects/kidp/life-design-lab/a05/types.mjs projects/kidp/life-design-lab/a05/types.mjs
COPY research/a05/d219-simple-diagnosis-template.html research/a05/d219-simple-diagnosis-template.html
COPY scripts/a05-d219-build-simple-diagnosis.mjs scripts/a05-d219-build-simple-diagnosis.mjs
COPY preview/a05/server.mjs preview/a05/server.mjs
RUN node scripts/a05-d210-build-offline-form.mjs && node scripts/a05-d219-build-simple-diagnosis.mjs
USER node
EXPOSE 8080
CMD ["node","preview/a05/server.mjs"]
