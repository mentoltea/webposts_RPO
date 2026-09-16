import React, { useState, useEffect } from 'react';
import { Header } from './Header';

export function AuthPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Состояния форм
  const [signInData, setSignInData] = useState({ login: '', password: '' });
  const [signUpData, setSignUpData] = useState({ login: '', email: '', password: '' });

  // Проверка сессии при загрузке страницы
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Запрос к эндпоинту проверки текущей сессии
      const res = await fetch('/auth/api/me', { method: 'GET', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user || data);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Обработка Входа (Sign In)
  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch('/auth/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(signInData)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Ошибка входа');

      setCurrentUser(data.user);
      window.location.href = '/'; // Переход на главную после успеха
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Обработка Регистрации (Sign Up)
  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch('/auth/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(signUpData)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Ошибка регистрации');

      setCurrentUser(data.user);
      window.location.href = '/';
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Обработка Выхода (Logout)
async function handleLogout() {
  try {
    const response = await fetch('/auth/api/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Передаём куку session для её очистки на сервере
      credentials: 'include',
    });

    if (response.ok) {
      // После успешного выхода отправляем пользователя на страницу входа
      window.location.href = '/auth';
    } else {
      console.error('Ошибка при выходе из системы');
    }
  } catch (error) {
    console.error('Сетевая ошибка при выходе:', error);
  }
}

  if (loading) return <div className="loader">Загрузка...</div>;

  return (
    <div className="layout">
      <Header user={currentUser} onLogout={handleLogout} />

      <main className="container main-content">
        {errorMessage && <div className="alert-error">{errorMessage}</div>}

        {currentUser ? (
          /* Если пользователь уполномочен/авторизован */
          <div className="authorized-box">
            <h2>Вы уже авторизованы</h2>
            <p>Вы вошли как <strong>{currentUser.username || currentUser.email}</strong></p>
            <button className="btn btn-danger btn-large" onClick={handleLogout}>
              Выйти из аккаунта
            </button>
          </div>
        ) : (
          /* Две колонки для неавторизованного пользователя */
          <div className="auth-grid">
            {/* Окно слева: Sign In */}
            <div className="auth-card">
              <h2>Вход (Sign In)</h2>
              <form onSubmit={handleSignIn}>
                <div className="form-group">
                  <label>Логин или Email</label>
                  <input
                    type="text"
                    required
                    value={signInData.login}
                    onChange={(e) => setSignInData({ ...signInData, login: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Пароль</label>
                  <input
                    type="password"
                    required
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary">Войти</button>
              </form>
            </div>

            {/* Окно справа: Sign Up */}
            <div className="auth-card">
              <h2>Регистрация (Sign Up)</h2>
              <form onSubmit={handleSignUp}>
                <div className="form-group">
                  <label>Логин</label>
                  <input
                    type="text"
                    required
                    value={signUpData.login}
                    onChange={(e) => setSignUpData({ ...signUpData, login: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    required
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Пароль</label>
                  <input
                    type="password"
                    required
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-success">Зарегистрироваться</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}