import React, { useState, useEffect } from 'react';
import { Header } from './Header';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Проверка авторизации
  useEffect(() => {
    fetch('/auth/api/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((userData) => {
        if (userData && userData.authenticated) {
          setCurrentUser(userData.user);
        }
      })
      .catch(() => setCurrentUser(null));
  }, []);

  // 2. Запрос количества страниц и загрузка 1-й страницы
  useEffect(() => {
    fetchTotalPagesAndLoadFirst();
  }, []);

  const fetchTotalPagesAndLoadFirst = async () => {
    setLoading(true);
    setError(null);
    try {
      // Подключение к Flask-эндпоинту: /post/pages
      const res = await fetch('/post/pages', { credentials: 'include' });
      if (!res.ok) throw new Error('Не удалось получить количество страниц');
      const data = await res.json();
      
      // Бэкенд возвращает { "pages_count": N, "total_posts": M }
      const total = data.pages_count || 1;
      setTotalPages(total);

      // Автоматически загружаем 1-ю страницу
      await loadPostsPage(1);
    } catch (err) {
      console.error(err);
      setError('Ошибка при загрузке данных с сервера');
      setLoading(false);
    }
  };

  // Загрузка постов конкретной страницы
  const loadPostsPage = async (page) => {
    setLoading(true);
    setError(null);
    try {
      // Подключение к Flask-эндпоинту: /post/pages/<page>
      const res = await fetch(`/post/pages/${page}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Ошибка загрузки страницы ${page}`);
      
      // Бэкенд возвращает массив постов: [post.to_dict(), ...]
      const data = await res.json();
      setPosts(data);
      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadPostsPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Компонент кнопок пагинации (сверху и снизу)
  const PaginationControls = () => (
    <div className="pagination-container">
      <button 
        className="btn btn-secondary" 
        disabled={currentPage <= 1 || loading} 
        onClick={() => handlePageChange(currentPage - 1)}
      >
        ← Назад
      </button>

      <span className="pagination-info">
        Страница <strong>{currentPage}</strong> из <strong>{totalPages}</strong>
      </span>

      <button 
        className="btn btn-secondary" 
        disabled={currentPage >= totalPages || loading} 
        onClick={() => handlePageChange(currentPage + 1)}
      >
        Вперёд →
      </button>
    </div>
  );

  return (
    <div className="layout">
      <Header user={currentUser} setUser={setCurrentUser} />

      <main className="feed-container">
        {/* Пагинация над постами */}
        <PaginationControls />

        {/* Состояние загрузки / ошибки */}
        {loading && <div className="loader">Загрузка постов...</div>}
        {error && <div className="alert-error">{error}</div>}

        {/* Лента постов */}
        {!loading && !error && (
          <div className="posts-list">
            {posts.length === 0 ? (
              <div className="no-posts">Постов пока нет.</div>
            ) : (
              posts.map((post) => (
                <article key={post.id} className="post-card">
                  <h2 className="post-title">{post.title}</h2>
                  <p className="post-text">{post.content}</p>
                  
                  {/* Задел под массив фотографий поста в будущем */}
                  {post.photos && post.photos.length > 0 && (
                    <div className="post-images-grid">
                      {post.photos.map((photo) => (
                        <img 
                          key={photo.id} 
                          src={photo.url || photo.path} 
                          alt="Прикреплённое фото" 
                          className="post-image" 
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        )}

        {/* Пагинация под постами */}
        <PaginationControls />
      </main>
    </div>
  );
}