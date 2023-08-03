FROM node:20
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
# For production
# RUN npm ci --omit=dev

COPY . .

EXPOSE 8080
CMD [ "node", "index.js" ]