from flask import Blueprint, jsonify, request
from database import SessionLocal
from models import User

users_bp = Blueprint('users', __name__, url_prefix='/users')


@users_bp.route('', methods=['GET'])
def get_all_users():
    with SessionLocal() as db:
        users = db.query(User).all()
        return jsonify([{
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "created_at": u.created_at.isoformat()
        } for u in users]), 200


# 2. GET /users/<id> — Получить пользователя по ID
@users_bp.route('/<int:user_id>', methods=['GET'])
def get_user_by_id(user_id: int):
    with SessionLocal() as db:
        user = db.query(User).get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at.isoformat()
        }), 200


# 3. POST /users — Создать нового пользователя
@users_bp.route('', methods=['POST'])
def create_user():
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')

    if not username or not email:
        return jsonify({"error": "username and email are required"}), 400

    with SessionLocal() as db:
        new_user = User(username=username, email=email)
        try:
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            return jsonify({
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email
            }), 201
        except Exception as e:
            db.rollback()
            return jsonify({"error": "User could not be created", "details": str(e)}), 400


# 4. PUT /users/<id> — Обновить пользователя
@users_bp.route('/<int:user_id>', methods=['PUT'])
def update_user(user_id: int):
    data = request.get_json() or {}
    
    with SessionLocal() as db:
        user = db.query(User).get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        if 'username' in data:
            user.username = data['username']
        if 'email' in data:
            user.email = data['email']

        try:
            db.commit()
            return jsonify({
                "id": user.id,
                "username": user.username,
                "email": user.email
            }), 200
        except Exception as e:
            db.rollback()
            return jsonify({"error": "Could not update user", "details": str(e)}), 400


# 5. DELETE /users/<id> — Удалить пользователя
@users_bp.route('/<int:user_id>', methods=['DELETE'])
def delete_user(user_id: int):
    with SessionLocal() as db:
        user = db.query(User).get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        db.delete(user)
        db.commit()
        return jsonify({"message": f"User {user_id} deleted successfully"}), 200