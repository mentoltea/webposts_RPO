from flask import Blueprint, jsonify, request, session, send_from_directory, request, redirect
from database import SessionLocal, init_db, new_session
from config import FLASK_SECRET_KEY, BASE_DIR, FRONTEND_DIR
from datetime import timedelta
from models import User
import os

import hashlib
import os

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/auth')

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode('utf-8'), 
        salt, 
        100000
    )    
    return f"{salt.hex()}${pwd_hash.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        (salt_hex, original_hash_hex) = tuple(stored_hash.split('$'))
        salt = bytes.fromhex(salt_hex)
        
        new_hash = hashlib.pbkdf2_hmac(
            'sha256', 
            password.encode('utf-8'), 
            salt, 
            100000
        )
        return new_hash.hex()==original_hash_hex
    except (ValueError, TypeError) as e:
        print(e)
        return False


@auth_bp.route('/', methods=["GET"])
def index():
    if "user_id" in session:
        return redirect("/")
    
    response = send_from_directory(FRONTEND_DIR, "auth.html")
    
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response

@auth_bp.route('/api/me', methods=["GET"])
def me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"authenticated": False, "error": "Unauthorized"}), 401

    with new_session() as db:
        user = db.get(User, user_id)
        if not user:
            session.clear()
            return jsonify({"authenticated": False, "error": "User not found"}), 401

        return jsonify({
            "authenticated": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_admin": getattr(user, "is_admin", False)
            }
        }), 200

@auth_bp.route('/api/signin', methods=["POST"])
def try_to_signin():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    login_or_email = data.get("login") or data.get("email")
    password = data.get("password")

    if not login_or_email or not password:
        return jsonify({"error": "Login/Email and password are required"}), 400

    with new_session() as db:
        try:
            user = db.query(User).filter(
                (User.username == login_or_email) | (User.email == login_or_email)
            ).first()

            if not user or not verify_password(password, user.password_hash):
                return jsonify({"error": "Invalid username or password"}), 401

            session.clear()
            
            session["user_id"] = user.id
            
            return jsonify({
                "message": "Success",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "is_admin": user.is_admin
                }
            }), 200

        finally:
            db.close()


@auth_bp.route('/api/signup', methods=["POST"])
def try_to_signup():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    login = data.get("login")
    email = data.get("email")
    password = data.get("password")

    if not login or not email or not password:
        return jsonify({"error": "Login, email and password are required"}), 400

    
    with new_session() as db:
        try:
            existing_user = db.query(User).filter(
                (User.username == login) | (User.email == email)
            ).first()

            if existing_user:
                if existing_user.username == login:
                    return jsonify({"error": "User with this username already exists"}), 400
                return jsonify({"error": "User with this email already exists"}), 400

            pass_hash = hash_password(password)

            new_user = User(
                username=login,
                email=email,
                password_hash=pass_hash,
                is_admin=False
            )

            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            
            session.clear()
            session["user_id"] = new_user.id

            return jsonify({
                "message": "User registered successfully",
                "user": {
                    "id": new_user.id,
                    "username": new_user.username,
                    "email": new_user.email,
                    "is_admin": new_user.is_admin
                }
            }), 201
        finally:
            db.close()
            

@auth_bp.route('/api/logout', methods=["POST"])
def logout():
    session.clear()
    response = jsonify({"message": "Successfully logged out"})
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response, 200