import React, { useState, useEffect } from 'react';
import { Header } from './Header';

// Глобальный кэш для хранения загруженных авторов { user_id: username }
const userCache = {};

function AuthorName({ userId }) {
  const [username, setUsername] = useState(() => userCache[userId] || null);

  useEffect(() => {
    if (!userId) return;
    
    // Если пользователь уже в кэше — не делаем повторный запрос
    if (userCache[userId]) {
      setUsername(userCache[userId]);
      return;
    }

    // Запрос по правильному роуту вашего user_bp: /user/id/<id>
    fetch(`/user/id/${userId}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.username) {
          userCache[userId] = data.username;
          setUsername(data.username);
        } else {
          setUsername(`Пользователь #${userId}`);
        }
      })
      .catch(() => setUsername(`Пользователь #${userId}`));
  }, [userId]);

  return <span>👤 {username || `Загрузка...`}</span>;
}

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
      .then((data) => {
        if (data && data.authenticated) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => setCurrentUser(null));
  }, []);

  // 2. Получение общего числа страниц и первая загрузка
  useEffect(() => {
    fetchTotalPagesAndLoadFirst();
  }, []);

  const fetchTotalPagesAndLoadFirst = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/post/pages', { credentials: 'include' });
      if (!res.ok) throw new Error('Не удалось получить количество страниц');
      const data = await res.json();
      
      const total = data.pages_count || 1;
      setTotalPages(total);

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
      const res = await fetch(`/post/pages/${page}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Ошибка загрузки страницы ${page}`);
      
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
        <PaginationControls />

        {loading && <div className="loader">Загрузка постов...</div>}
        {error && <div className="alert-error">{error}</div>}

        {!loading && !error && (
          <div className="posts-list">
            {posts.length === 0 ? (
              <div className="no-posts">Постов пока нет.</div>
            ) : (
              posts.map((post) => {
                const authorId = post.author_id || post.user_id || post.author;

                return (
                  <article key={post.id} className="post-card">
                    {/* Юзернейм автора над заголовком */}
                    <div className="post-author">
                      {post.username || post.author_name ? (
                        <span>by {post.username || post.author_name}</span>
                      ) : (
                        <AuthorName userId={authorId} />
                      )}
                    </div>

                    <h2 className="post-title">{post.title}</h2>
                    <p className="post-text">{post.text}</p>
                    
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
                );
              })
            )}
          </div>
        )}

        <PaginationControls />
      </main>
    </div>
  );
}