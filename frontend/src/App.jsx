import React, { useState, useEffect } from 'react';

export default function App() {
  const [status, setStatus] = useState('Загрузка...');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/ping', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);
        return res.json();
      })
      .then((resData) => {
        setStatus('✅ Подключение к Flask API успешно!');
        setData(resData);
      })
      .catch((err) => {
        setStatus(`❌ Ошибка подключения: ${err.message}`);
      });
  }, []);

  return (
    <div>
      <header>
        <h1>🚀 Flask + React + PostgreSQL + MinIO</h1>
        <p>Фронтенд успешно отдан через Flask!</p>
      </header>

      <div>
        <h2>Проверка соединения с бэкендом:</h2>
        <p style={{ fontWeight: 'bold' }}>{ status }</p>

        {data && (
          <div>
            <p><strong>Ответ сервера:</strong></p>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}