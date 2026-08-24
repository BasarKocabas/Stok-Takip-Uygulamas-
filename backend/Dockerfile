FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 make g++
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["sh", "-c", "npm run migrate && npm run seed && npm start"]
