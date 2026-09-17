import React, { useState, useEffect } from 'react';

// Компонент отображения имени автора
// Компонент отображения имени автора
function AuthorName({ userId }) {
  const [name, setName] = useState('Загрузка...');

  useEffect(() => {
    if (!userId) {
      setName('Неизвестный автор');
      return;
    }

    fetch(`/user/id/${userId}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Ошибка сети или пользователь не найден');
        return res.json();
      })
      .then((data) => {
        // Если никнейм успешно получен из БД
        if (data && data.username) {
          setName(data.username);
        } else {
          setName(`Пользователь #${userId}`);
        }
      })
      .catch(() => {
        // Запасной вариант ТОЛЬКО при ошибке запроса
        setName(`Пользователь #${userId}`);
      });
  }, [userId]);

  return <span>by {name}</span>;
}

// Компонент загрузки и отображения фотографий поста
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
      {photoIds.map((id) => {
        const photoUrl = `/photo/id/${id}`;
        return (
          <img
            key={id}
            src={photoUrl}
            alt={`Фото к посту ${postId}`}
            className="post-image-thumb"
            onClick={() => onImageClick(photoUrl)}
          />
        );
      })}
    </div>
  );
}

// Модальное окно просмотра полноразмерной фотографии
function ImageModal({ src, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Зум колесиком мыши
  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const zoomFactor = 0.15;
    let newScale = e.deltaY < 0 ? scale + zoomFactor : scale - zoomFactor;

    // Ограничения зума: от 1x (исходный) до 5x
    if (newScale < 1) {
      newScale = 1;
      setPosition({ x: 0, y: 0 }); // Сброс позиции при возврате к 1x
    } else if (newScale > 5) {
      newScale = 5;
    }

    setScale(newScale);
  };

  // Начало перетаскивания (только если картинка приближена)
  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  // Процесс перетаскивания
  const handleMouseMove = (e) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  // Завершение перетаскивания
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Сброс зума при двойном клике
  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="image-modal-content" 
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        <img
          src={src}
          alt="Увеличенное фото"
          className="full-size-image"
          onDoubleClick={handleDoubleClick}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        />
      </div>
    </div>
  );
}

// Универсальное модальное окно для создания И редактирования поста
function PostFormModal({ postToEdit, onClose }) {
  const isEditMode = Boolean(postToEdit);

  const [title, setTitle] = useState(postToEdit ? postToEdit.title : '');
  const [content, setContent] = useState(postToEdit ? postToEdit.content : '');

  // Существующие фотографии (только при редактировании)
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [photosToRemove, setPhotosToRemove] = useState([]); // Массив ID для открепления

  // Новые выбранные фотографии
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]); // Blob URLs для отображения превью

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);

  // Загрузка имеющихся фото поста при редактировании
  useEffect(() => {
    if (isEditMode && postToEdit.id) {
      fetch(`/post/${postToEdit.id}/photos`, { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.photo_ids) {
            setExistingPhotos(data.photo_ids.map((id) => ({ id, url: `/photo/id/${id}` })));
          }
        })
        .catch(() => {});
    }
  }, [isEditMode, postToEdit]);

  // Очистка созданных Blob URL из памяти при размонтировании
  useEffect(() => {
    return () => {
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newPreviews]);

  const handleRequestClose = () => {
    if (isSubmitting) return;
    const confirmClose = window.confirm(
      'Вы уверены, что хотите закрыть окно? Все несохранённые изменения будут потеряны.'
    );
    if (confirmClose) onClose();
  };

  // Выбор новых файлов
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const activeExistingCount = existingPhotos.length - photosToRemove.length;
    const totalCount = activeExistingCount + newFiles.length + files.length;

    if (totalCount > 5) {
      alert('Суммарно у поста может быть не более 5 фотографий');
      return;
    }

    const createdPreviews = files.map((file) => URL.createObjectURL(file));

    setNewFiles((prev) => [...prev, ...files]);
    setNewPreviews((prev) => [...prev, ...createdPreviews]);
  };

  // Пометка существующего фото на удаление
  const handleRemoveExistingPhoto = (photoId) => {
    setPhotosToRemove((prev) => [...prev, photoId]);
  };

  // Отмена пометки на удаление
  const handleRestoreExistingPhoto = (photoId) => {
    setPhotosToRemove((prev) => prev.filter((id) => id !== photoId));
  };

  // Удаление выбранного еще не загруженного фото
  const handleRemoveNewFile = (index) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Сохранение изменений / Публикация
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Заполните заголовок и текст новости');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let postId = postToEdit?.id;

      // 1. Создание или обновление текста
      if (isEditMode) {
        setStatusText('Сохранение изменений...');
        const editRes = await fetch(`/post/edit/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title, content }),
        });
        if (!editRes.ok) {
          const data = await editRes.json().catch(() => ({}));
          throw new Error(data.error || 'Ошибка при редактировании новости');
        }
      } else {
        setStatusText('Публикация записи...');
        const createRes = await fetch('/post/new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title, content }),
        });
        if (!createRes.ok) {
          const data = await createRes.json().catch(() => ({}));
          throw new Error(data.error || 'Ошибка при создании новости');
        }
        const createData = await createRes.json();
        postId = (createData.post || createData).id;
      }

      // 2. Открепление удаленных фотографий
      if (isEditMode && photosToRemove.length > 0) {
        setStatusText('Удаление открепленных фотографий...');
        for (const photoId of photosToRemove) {
          await fetch(`/post/detach?post_id=${postId}&photo_id=${photoId}`, {
            method: 'DELETE',
            credentials: 'include',
          });
        }
      }

      // 3. Загрузка новых файлов на сервер
      const uploadedPhotoIds = [];
      for (let i = 0; i < newFiles.length; i++) {
        setStatusText(`Загрузка новых фото (${i + 1}/${newFiles.length})...`);
        const formData = new FormData();
        formData.append('file', newFiles[i]);

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

      // 4. Привязка новых фото к посту
      if (uploadedPhotoIds.length > 0) {
        setStatusText('Привязка новых фотографий...');
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

      setStatusText('Успешно! Обновление страницы...');
      window.location.reload();

    } catch (err) {
      console.error(err);
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const activeExistingPhotosCount = existingPhotos.length - photosToRemove.length;
  const canAddMore = activeExistingPhotosCount + newFiles.length < 5;

  return (
    <div className="modal-overlay">
      <div className="create-post-modal">
        <div className="modal-header">
          <h2>{isEditMode ? 'Редактирование новости' : 'Создание новости'}</h2>
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

          {/* Превью прикрепленных фотографий */}
          <div className="form-group">
            <label>Прикрепленные фотографии (макс. 5):</label>
            
            <div className="photos-preview-grid">
              {/* Старые фото */}
              {existingPhotos.map((photo) => {
                const isMarkedForRemoval = photosToRemove.includes(photo.id);
                return (
                  <div key={`existing-${photo.id}`} className={`photo-preview-card ${isMarkedForRemoval ? 'marked-remove' : ''}`}>
                    <img src={photo.url} alt="Прикрепленное фото" className="preview-img" />
                    {isMarkedForRemoval ? (
                      <button
                        type="button"
                        className="btn-restore-photo"
                        onClick={() => handleRestoreExistingPhoto(photo.id)}
                        disabled={isSubmitting}
                      >
                        ↩ Восстановить
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-delete-photo"
                        onClick={() => handleRemoveExistingPhoto(photo.id)}
                        disabled={isSubmitting}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Новые фото */}
              {newPreviews.map((url, idx) => (
                <div key={`new-${idx}`} className="photo-preview-card">
                  <img src={url} alt="Новое фото" className="preview-img" />
                  <span className="badge-new">Новое</span>
                  <button
                    type="button"
                    className="btn-delete-photo"
                    onClick={() => handleRemoveNewFile(idx)}
                    disabled={isSubmitting}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {canAddMore && (
              <div className="file-input-wrapper">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />
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
              {isSubmitting ? 'Сохранение...' : isEditMode ? 'Сохранить изменения' : 'Опубликовать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Компонент карточки одного поста
function PostCard({ post, currentUser, onEdit, onImageClick }) {
  const authorId = post.author_id || post.user_id || post.author;
  const username = post.username || post.author_name;
  
  const isAuthor = currentUser && currentUser.id === authorId;
  const isAdmin = currentUser && (currentUser.is_admin || currentUser.role === 'admin');

  const handleDelete = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить этот пост?')) return;

    try {
      const res = await fetch(`/post/delete/${post.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка при удалении поста');
      }

      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <article className="post-card">
      <div className="post-card-header">
        <div className="post-author">
          {/* Если сервер сразу отдает username внутри объекта поста, используем его, иначе делаем запрос в AuthorName */}
          {username ? (
            <span>by {username}</span>
          ) : (
            <AuthorName userId={authorId} />
          )}
        </div>

        <div className="post-actions">
          {isAuthor && (
            <button 
              className="btn-icon btn-edit" 
              onClick={() => onEdit(post)}
              title="Редактировать пост"
            >
              ✏️ Редактировать
            </button>
          )}

          {(isAuthor || isAdmin) && (
            <button 
              className="btn-icon btn-delete" 
              onClick={handleDelete}
              title="Удалить пост"
            >
              🗑️ Удалить
            </button>
          )}
        </div>
      </div>

      <h2 className="post-title">{post.title}</h2>
      <p className="post-text">{post.content}</p>

      <PostPhotos 
        postId={post.id} 
        onImageClick={(url) => onImageClick(url)} 
      />
    </article>
  );
}

// Заголовок страницы / Хедер
function Header({ user, setUser }) {
  const handleLogout = () => {
    fetch('/auth/api/logout', { method: 'POST', credentials: 'include' })
      .then(() => setUser(null))
      .catch(() => {});
  };

  return (
    <header className="header">
      <div className="header-container">
        <h1 className="logo">Лента Новостей</h1>
        <div className="user-nav">
          {user ? (
            <>
              <span className="user-greeting">Привет, <strong>{user.username}</strong></span>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Выйти</button>
            </>
          ) : (
            <a href="/auth" className="btn btn-primary btn-sm">Войти</a>
          )}
        </div>
      </div>
    </header>
  );
}

// Главный компонент App
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activePhotoUrl, setActivePhotoUrl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);

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
      setPostToEdit(null);
      setIsModalOpen(true);
    }
  };

  const handleEditPost = (post) => {
    setPostToEdit(post);
    setIsModalOpen(true);
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
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUser={currentUser}
                    onEdit={handleEditPost}
                    onImageClick={(url) => setActivePhotoUrl(url)}
                  />
                ))
              )}
            </div>
          )}

          <PaginationControls />
        </main>

        <aside className="sidebar-right" />
      </div>

      {activePhotoUrl && (
        <ImageModal 
          src={activePhotoUrl} 
          onClose={() => setActivePhotoUrl(null)} 
        />
      )}

      {isModalOpen && (
        <PostFormModal 
          postToEdit={postToEdit}
          onClose={() => {
            setIsModalOpen(false);
            setPostToEdit(null);
          }} 
        />
      )}
    </div>
  );
}