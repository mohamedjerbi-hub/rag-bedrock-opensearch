FROM node:22-alpine  
WORKDIR /app  
COPY backend/package*.json ./backend/  
WORKDIR /app/backend  
RUN npm install --legacy-peer-deps  
COPY backend/ ./  
RUN npm run build  
EXPOSE 3001  
ENV NODE_ENV=production  
ENV PORT=3001  
CMD ["npm", "start"] 
