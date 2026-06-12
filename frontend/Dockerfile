FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY .npmrc ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
