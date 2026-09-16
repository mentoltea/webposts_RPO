# --- Этап 1: Сборка React ---
FROM node:18-alpine AS frontend-builder

ENV CI=true

WORKDIR /app/frontend

# Копируем И package.json, И package-lock.json
COPY frontend/package*.json ./

# npm ci использует lock-файл для быстрой и воспроизводимой установки
RUN npm ci

ARG CACHEBURST=1
COPY frontend/ ./
RUN npm run build



# 2. Финальный образ Flask
FROM python:3.11-slim AS final

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код бэкенда
COPY . .

# Копируем билд фронтенда из первого этапа
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8000

CMD ["python", "main.py"]