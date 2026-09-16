from flask import Blueprint, jsonify, request, session, send_from_directory, request, redirect
from database import SessionLocal, init_db, new_session
from config import FLASK_SECRET_KEY, BASE_DIR, FRONTEND_DIR
from datetime import timedelta
from models import User
import os

user_bp = Blueprint('user_bp', __name__, url_prefix='user')

@user_bp.route('/<string:username>', methods=['GET'])
def get_user_by_username(username: str):
    with new_session() as db:
        user = db.query(User).filter(User.username == username).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at,
            "is_admin": user.is_admin
        }
        return jsonify(user_data), 200

@user_bp.route('/id/<int:id>', methods=['GET'])
def get_user_by_id(id: int):
    with new_session() as db:
        user = db.query(User).filter(User.id == id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at,
            "is_admin": user.is_admin
        }
        return jsonify(user_data), 200

@user_bp.route('/delete/id/<int:id>', methods=['DELETE', 'POST'])
def delete_user_by_id(id: int):
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Must be authenticated for deletion"}), 401
    
    with new_session() as db:
        caller = db.get(User, uid)
        if not caller:
            session.clear()
            return jsonify({"error": "Session user no longer exists"}), 401

        is_admin = getattr(caller, "is_admin", False)
        is_self_delete = (uid == id)

        if not (is_admin or is_self_delete):
            return jsonify({"error": "Forbidden: Insufficient privileges"}), 403

        target_user = db.get(User, id)
        if not target_user:
            return jsonify({"error": "Target user not found"}), 404

        db.delete(target_user)
        db.commit()

        if is_self_delete:
            session.clear()

        return jsonify({"message": f"User {id} deleted successfully"}), 200