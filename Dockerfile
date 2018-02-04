FROM node:6
MAINTAINER Jonas Rydholm Birmé <jonas.birme@gmail.com>

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
CMD [ "node", "index.js" ]
