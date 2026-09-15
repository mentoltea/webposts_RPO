
# Build frontend
# FROM node:18-alpine AS frontend-builder

# WORKDIR /app/frontend

# # Копируем зависимости и устанавливаем их
# COPY frontend/package*.json ./
# RUN npm install

# # Копируем исходный код фронтенда и собираем production-билдинг
# COPY frontend/ ./
# RUN npm run build


FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# COPY --from=frontend-builder /app/frontend/dist ./static

COPY . .

EXPOSE 8000

CMD ["python", "main.py"]