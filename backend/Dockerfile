FROM node:20

ARG DATABASE_URL
ARG PORT
ARG REDIS_HOST
ARG REDIS_PORT

ENV DATABASE_URL=${DATABASE_URL}
ENV PORT=${PORT}
ENV REDIS_HOST=${REDIS_HOST}
ENV REDIS_PORT=${REDIS_PORT}

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

# Create a startup script
COPY <<EOF /docker-entrypoint.sh
#!/bin/sh
npx prisma migrate deploy
npm run start
EOF

RUN chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]