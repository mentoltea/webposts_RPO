import React, { useState, useEffect } from 'react';
import { Header } from './Header';

const userCache = {};

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

function ImageModal({ src, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 0.15;
    let newScale = e.deltaY < 0 ? scale + zoomFactor : scale - zoomFactor;
    newScale = Math.min(Math.max(1, newScale), 5);
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
    setScale(newScale);
  };

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

function CreatePostModal({ onClose }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);

  const handleRequestClose = () => {
    if (isSubmitting) return;

    if (title.trim() || content.trim() || selectedFiles.length > 0) {
      const confirmClose = window.confirm(
        'Вы уверены, что хотите закрыть окно? Все несохранённые данные будут потеряны.'
      );
      if (!confirmClose) return;
    }
    onClose();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 5) {
      alert('Можно прикрепить не более 5 фотографий');
      return;
    }
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 5));
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Заполните заголовок и текст новости');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Шаг 1: Создание новости
      setStatusText('Публикация записи...');
      const postRes = await fetch('/post/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, text: content }),
      });

      if (!postRes.ok) {
        const data = await postRes.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка при создании новости');
      }

      const postData = await postRes.json();
      const createdPost = postData.post || postData;
      const postId = createdPost.id;

      // Шаг 2: Последовательная загрузка фотографий
      const uploadedPhotoIds = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        setStatusText(`Загрузка фото ${i + 1} из ${selectedFiles.length}...`);
        
        const formData = new FormData();
        formData.append('file', selectedFiles[i]);

        const uploadRes = await fetch('/photo/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => ({}));
          throw new Error(uploadData.error || `Ошибка загрузки фото #${i + 1}`);
        }

        const uploadData = await uploadRes.json();
        uploadedPhotoIds.push(uploadData.photo_id);
      }

      // Шаг 3: Привязка фото к созданной новости
      if (uploadedPhotoIds.length > 0) {
        setStatusText('Привязка фотографий к новости...');
        const attachRes = await fetch(`/post/${postId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ photo_ids: uploadedPhotoIds }),
        });

        if (!attachRes.ok) {
          const attachData = await attachRes.json().catch(() => ({}));
          throw new Error(attachData.error || 'Ошибка привязки фото к новости');
        }
      }

      // Шаг 4: Перезагрузка страницы
      setStatusText('Успешно! Обновление страницы...');
      window.location.reload();

    } catch (err) {
      console.error(err);
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="create-post-modal">
        <div className="modal-header">
          <h2>Создание новости</h2>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={handleRequestClose}
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="create-post-form">
          <div className="form-group">
            <label>Заголовок:</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              placeholder="Введите заголовок"
            />
          </div>

          <div className="form-group">
            <label>Текст новости:</label>
            <textarea
              className="form-textarea"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
              placeholder="Введите текст новости"
            />
          </div>

          <div className="form-group">
            <label>Фотографии (макс. 5):</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              disabled={isSubmitting || selectedFiles.length >= 5}
            />

            {selectedFiles.length > 0 && (
              <div className="file-preview-list">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="file-preview-item">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      className="btn-remove-file"
                      onClick={() => handleRemoveFile(idx)}
                      disabled={isSubmitting}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isSubmitting && <div className="status-info">{statusText}</div>}

          <div className="modal-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Публикация...' : 'Опубликовать'}
            </button>
          </div>
        </form>
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
  
  const [activePhotoUrl, setActivePhotoUrl] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  const handleCreateButtonClick = () => {
    if (!currentUser) {
      window.location.href = '/auth';
    } else {
      setIsCreateModalOpen(true);
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

      <div className="main-wrapper">
        <aside className="sidebar-left">
          <button 
            className="btn btn-create-post" 
            onClick={handleCreateButtonClick}
          >
            ➕ Создать новость
          </button>
        </aside>

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
                      <p className="post-text">{post.content || post.text}</p>
                      
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
      </div>

      {activePhotoUrl && (
        <ImageModal 
          src={activePhotoUrl} 
          onClose={() => setActivePhotoUrl(null)} 
        />
      )}

      {isCreateModalOpen && (
        <CreatePostModal 
          onClose={() => setIsCreateModalOpen(false)} 
        />
      )}
    </div>
  );
}