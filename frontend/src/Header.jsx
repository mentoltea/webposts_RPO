import React from 'react';

export function Header({ user, setUser }) {
  const isAuthPage = window.location.pathname === '/auth';
  const isHomePage = window.location.pathname === '/';

  const handleGoHome = () => {
    if (!isHomePage) {
      window.location.href = '/';
    }
  };

  const handleGoAuth = () => {
    if (!isAuthPage) {
      window.location.href = '/auth';
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/auth/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        if (setUser) {
          setUser(null);
        }
        window.location.href = '/auth';
      } else {
        console.error('Ошибка при выходе из системы');
      }
    } catch (error) {
      console.error('Сетевая ошибка при выходе:', error);
    }
  };

  return (
    <header className="header">
      <div className="header-logo" onClick={handleGoHome} style={{ cursor: 'pointer' }}>
        My Application
      </div>
      
      <nav className="header-nav">
        {!isHomePage && (
          <button className="btn btn-secondary" onClick={handleGoHome}>
            На главную
          </button>
        )}

        {user ? (
          <div className="header-user-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Отображаем юзернейм авторизованного пользователя */}
            <span className="header-username" style={{ fontWeight: 500 }}>
              {user.username || user.login || 'Пользователь'}
            </span>

            <button className="btn btn-outline-danger" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        ) : (
          !isAuthPage && (
            <button className="btn btn-primary" onClick={handleGoAuth}>
              Войти
            </button>
          )
        )}
      </nav>
    </header>
  );
}