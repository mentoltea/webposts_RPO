import React, { useState, useEffect, useRef } from 'react';
import { Header } from './Header';

const userCache = {};

// Компонент автозагрузки имени автора
function AuthorName({ userId }) {
  const [username, setUsername] = useState(() => userCache[userId] || null);

  useEffect(() => {
    if (!userId) return;
    if (userCache[userId]) {
      setUsername(userCache[userId]);
      return;
    }

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

  return <span>by {username || 'Загрузка...'}</span>;
}

// Компонент загрузки списка фотографий поста по API
function PostPhotos({ postId, onImageClick }) {
  const [photoIds, setPhotoIds] = useState([]);

  useEffect(() => {
    if (!postId) return;
    fetch(`/post/${postId}/photos`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.photo_ids) {
          setPhotoIds(data.photo_ids);
        }
      })
      .catch(() => {});
  }, [postId]);

  if (photoIds.length === 0) return null;

  return (
    <div className="post-images-grid">
      {photoIds.map((photoId) => {
        const photoUrl = `/photo/id/${photoId}`;
        return (
          <img
            key={photoId}
            src={photoUrl}
            alt="Прикрепленное фото"
            className="post-image-thumb"
            onClick={() => onImageClick(photoUrl)}
          />
        );
      })}
    </div>
  );
}

// Модальное окно просмотра фото с Zoom и Pan
function ImageModal({ src, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Закрытие по нажатию на ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Масштабирование колесиком мыши
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 0.15;
    let newScale = e.deltaY < 0 ? scale + zoomFactor : scale - zoomFactor;
    
    // Ограничиваем зум от 1x до 5x
    newScale = Math.min(Math.max(1, newScale), 5);
    
    // Сбрасываем позицию при возврате к 1x
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
    setScale(newScale);
  };

  // Перетаскивание увеличенного изображения
  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        <img
          src={src}
          alt="Увеличенное фото"
          className="modal-image"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Состояние активного фото для просмотра в модальном окне
  const [activePhotoUrl, setActivePhotoUrl] = useState(null);

  useEffect(() => {
    fetch('/auth/api/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.authenticated) setCurrentUser(data.user);
      })
      .catch(() => setCurrentUser(null));
  }, []);

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
      setTotalPages(data.pages_count || 1);
      await loadPostsPage(1);
    } catch (err) {
      setError('Ошибка при загрузке данных с сервера');
      setLoading(false);
    }
  };

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
                    <div className="post-author">
                      {post.username || post.author_name ? (
                        <span>by {post.username || post.author_name}</span>
                      ) : (
                        <AuthorName userId={authorId} />
                      )}
                    </div>

                    <h2 className="post-title">{post.title}</h2>
                    <p className="post-text">{post.content}</p>
                    
                    {/* Список фото поста из /post/<id>/photos */}
                    <PostPhotos 
                      postId={post.id} 
                      onImageClick={(url) => setActivePhotoUrl(url)} 
                    />
                  </article>
                );
              })
            )}
          </div>
        )}

        <PaginationControls />
      </main>

      {/* Модальное окно просмотра фото */}
      {activePhotoUrl && (
        <ImageModal 
          src={activePhotoUrl} 
          onClose={() => setActivePhotoUrl(null)} 
        />
      )}
    </div>
  );
}