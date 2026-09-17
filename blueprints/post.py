import os
from datetime import timedelta
from flask import Blueprint, jsonify, request, session, send_from_directory
from database import SessionLocal, init_db, new_session
from config import FLASK_SECRET_KEY, BASE_DIR, FRONTEND_DIR
from models import User, Post, Photo

post_bp = Blueprint('post_bp', __name__, url_prefix='/post')

POSTS_PER_PAGE = 20


@post_bp.route("/", methods=['GET'])
def index():
    return send_from_directory(FRONTEND_DIR, "post.html")


@post_bp.route("/pages", methods=['GET'])
def get_pages_number():
    """Возвращает общее количество страниц (по 20 постов на страницу)"""
    with new_session() as db:
        total_posts = db.query(Post).count()
        pages_count = (total_posts + POSTS_PER_PAGE - 1) // POSTS_PER_PAGE
        return jsonify({"pages_count": pages_count, "total_posts": total_posts}), 200


@post_bp.route("/pages/<int:page>", methods=['GET'])
def get_page_posts(page: int):
    """Возвращает 20 или менее постов для указанной страницы"""
    if page < 1:
        return jsonify({"error": "Page number must be 1 or greater"}), 400

    offset_value = (page - 1) * POSTS_PER_PAGE

    with new_session() as db:
        posts = (
            db.query(Post)
            .order_by(Post.id.desc())
            .offset(offset_value)
            .limit(POSTS_PER_PAGE)
            .all()
        )
        return jsonify([post.to_dict() for post in posts]), 200


@post_bp.route("/id/<int:id>", methods=['GET'])
def get_post_by_id(id: int):
    with new_session() as db:
        post = db.get(Post, id)
        if not post:
            return jsonify({"error": "Post not found"}), 404
        return jsonify(post.to_dict()), 200


@post_bp.route("/from/<int:id>", methods=['GET'])
def get_post_from_user(id: int):
    """Получение всех постов конкретного пользователя"""
    with new_session() as db:
        user = db.get(User, id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        posts = db.query(Post).filter(Post.author_id == id).order_by(Post.id.desc()).all()
        return jsonify([post.to_dict() for post in posts]), 200


@post_bp.route("/delete/<int:id>", methods=['DELETE', 'POST'])
def delete_post_by_id(id: int):
    """Удаление поста. Разрешено только автору или администратору"""
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Unauthorized"}), 401

    with new_session() as db:
        post = db.get(Post, id)
        if not post:
            return jsonify({"error": "Post not found"}), 404

        caller = db.get(User, uid)
        is_admin = getattr(caller, "is_admin", False) if caller else False
        is_author = (post.author_id == uid)

        if not (is_author or is_admin):
            return jsonify({"error": "Forbidden: Insufficient privileges"}), 403

        db.delete(post)
        db.commit()
        return jsonify({"message": f"Post {id} deleted successfully"}), 200


@post_bp.route("/attach", methods=['PUT', 'POST'])
def attach_existing_photo_to_post():
    """Прикрепление фото к посту: /post/attach?post_id=1&photo_id=2"""
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Unauthorized"}), 401

    post_id = request.args.get("post_id", type=int)
    photo_id = request.args.get("photo_id", type=int)

    if not post_id or not photo_id:
        return jsonify({"error": "post_id and photo_id parameters are required"}), 400

    with new_session() as db:
        post = db.get(Post, post_id)
        photo = db.get(Photo, photo_id)

        if not post or not photo:
            return jsonify({"error": "Post or Photo not found"}), 404

        if post.author_id != uid:
            return jsonify({"error": "Forbidden: Only author can attach photos"}), 403

        if photo in post.photos:
            return jsonify({"message": "Photo is already attached to this post"}), 200

        post.photos.append(photo)
        db.commit()
        return jsonify({"message": "Photo attached successfully"}), 200


@post_bp.route("/detach", methods=['PUT', 'POST', 'DELETE'])
def detach_photo_from_post():
    """Открепление фото от поста: /post/detach?post_id=1&photo_id=2"""
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Unauthorized"}), 401

    post_id = request.args.get("post_id", type=int)
    photo_id = request.args.get("photo_id", type=int)

    if not post_id or not photo_id:
        return jsonify({"error": "post_id and photo_id parameters are required"}), 400

    with new_session() as db:
        post = db.get(Post, post_id)
        photo = db.get(Photo, photo_id)

        if not post or not photo:
            return jsonify({"error": "Post or Photo not found"}), 404

        caller = db.get(User, uid)
        is_admin = getattr(caller, "is_admin", False) if caller else False
        is_author = (post.author_id == uid)

        if not (is_author or is_admin):
            return jsonify({"error": "Forbidden: Insufficient privileges"}), 403

        if photo in post.photos:
            post.photos.remove(photo)
            db.commit()
            return jsonify({"message": "Photo detached successfully"}), 200

        return jsonify({"error": "Photo is not attached to this post"}), 400


@post_bp.route("/new", methods=['POST', 'PUT'])
def make_new_post():
    """Создание поста с заголовком и текстом. Только для авторизованных пользователей"""
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    title = data.get("title")
    # Принимаем 'content' или 'text' для совместимости
    content = data.get("content") or data.get("text")

    if not title or not content:
        return jsonify({"error": "Both title and content are required"}), 400

    with new_session() as db:
        new_post = Post(
            title=title,
            content=content,
            author_id=uid
        )
        db.add(new_post)
        db.commit()
        db.refresh(new_post)

        return jsonify({
            "message": "Post created successfully",
            "post": new_post.to_dict()
        }), 201


@post_bp.route("/edit/<int:id>", methods=['PUT', 'POST'])
def edit_post_by_id(id: int):
    """Редактирование заголовка и/или текста поста. Только для автора"""
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    new_title = data.get("title")
    new_content = data.get("content") or data.get("text")

    if not new_title and not new_content:
        return jsonify({"error": "At least one field (title or content) must be provided for update"}), 400

    with new_session() as db:
        post = db.get(Post, id)
        if not post:
            return jsonify({"error": "Post not found"}), 404

        if post.author_id != uid:
            return jsonify({"error": "Forbidden: Only author can edit this post"}), 403

        if new_title:
            post.title = new_title
        if new_content:
            post.content = new_content

        db.commit()

        return jsonify({
            "message": "Post updated successfully",
            "post": post.to_dict()
        }), 200


@post_bp.route('/<int:id>/photos', methods=['GET'])
def get_post_photos(id: int):
    with new_session() as db:
        post = db.get(Post, id)
        
        if not post:
            return jsonify({"error": "Post not found"}), 404

        photo_ids = [photo.id for photo in post.photos]

        return jsonify({
            "post_id": post.id,
            "photo_ids": photo_ids,
            "count": len(photo_ids)
        }), 200


@post_bp.route('/<int:id>/photos', methods=['POST'])
def attach_photos_list_to_post(id: int):
    """Прикрепление массива photo_ids к посту"""
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    if not data or 'photo_ids' not in data:
        return jsonify({"error": "photo_ids array is required"}), 400

    photo_ids = data.get('photo_ids', [])

    with new_session() as db:
        post = db.get(Post, id)
        if not post:
            return jsonify({"error": "Post not found"}), 404

        if post.author_id != uid:
            return jsonify({"error": "Forbidden: Only author can attach photos"}), 403

        photos = db.query(Photo).filter(Photo.id.in_(photo_ids)).all()
        
        for photo in photos:
            if photo not in post.photos:
                post.photos.append(photo)

        db.commit()

        return jsonify({
            "message": "Photos attached successfully",
            "attached_count": len(photos)
        }), 200