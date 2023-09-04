FROM node:20-slim as builder
WORKDIR /usr/src/app

COPY . .

RUN npm install --production
RUN npm install -g @vercel/ncc
RUN ncc build index.js -o dist

FROM node:20.5-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/dist/index.js .
COPY --from=builder /usr/src/app/public ./public

EXPOSE 8080
CMD [ "node", "index.js" ]