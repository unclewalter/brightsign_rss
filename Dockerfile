FROM node:20
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
RUN npm install pm2@latest -g

# For production
# RUN npm ci --omit=dev

COPY . .

EXPOSE 8080
CMD [ "pm2-runtime", "index.js" ]