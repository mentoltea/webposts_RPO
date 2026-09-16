from flask import Flask, jsonify, request, session, send_from_directory
from database import SessionLocal, init_db, new_session
from config import FLASK_SECRET_KEY, BASE_DIR, FRONTEND_DIR
from datetime import timedelta
import os

from blueprints import user_bp, auth_bp, post_bp

app = Flask(__name__)

app.secret_key = FLASK_SECRET_KEY

app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

app.register_blueprint(auth_bp)

@app.route("/")
def serve_index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/api/ping")
def ping_handle():
    return jsonify({"status": "ok"}), 200

@app.route("/<path:path>")
def serve_static_or_spa(path):
    target_path = os.path.join(FRONTEND_DIR, path)
    
    if os.path.exists(target_path):
        return send_from_directory(FRONTEND_DIR, path)
    
    return jsonify({"error": "Resource not found"}), 404