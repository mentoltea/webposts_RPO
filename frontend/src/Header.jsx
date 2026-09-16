import React from 'react';

export function Header({ user, onLogout }) {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <header className="header">
      <div className="header-logo" onClick={handleGoHome}>
        My Application
      </div>
      <nav className="header-nav">
        <button className="btn btn-secondary" onClick={handleGoHome}>
          На главную
        </button>
        {user && (
          <button className="btn btn-outline-danger" onClick={onLogout}>
            Выйти
          </button>
        )}
      </nav>
    </header>
  );
}