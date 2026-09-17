import React, { useState, useEffect } from 'react';
import { Header } from './Header';

export default function App() {
  const [status, setStatus] = useState('Загрузка...');
  const [data, setData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // 1. Проверяем статус авторизации пользователя
    fetch('/auth/api/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((userData) => {
        if (userData && userData.authenticated) {
          setCurrentUser(userData.user);
        }
      })
      .catch(() => setCurrentUser(null));

    // 2. Проверяем соединение с API
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
      <Header user={currentUser} setUser={setCurrentUser} />

      <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <section>
          <h1>Главная страница</h1>
          <p>Фронтенд успешно отдан через Flask!</p>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2>Проверка соединения с бэкендом:</h2>
          <p style={{ fontWeight: 'bold' }}>{status}</p>

          {data && (
            <div style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '6px' }}>
              <p><strong>Ответ сервера:</strong></p>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}