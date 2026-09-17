import os
from datetime import timedelta
from flask import Blueprint, jsonify, request, session, send_from_directory, redirect
from database import SessionLocal, init_db, new_session
from config import FLASK_SECRET_KEY, BASE_DIR, FRONTEND_DIR
from models import User, Post, Photo
from s3 import s3

photo_bp = Blueprint('photo_bp', __name__, url_prefix='/photo')

@photo_bp.route("/id/<int:id>", methods=['GET'])
def get_photo_by_id(id: int):
    with new_session() as db:
        photo = db.get(Photo, id)
        if not photo:
            return jsonify({"error": "Photo not found"}), 404

        # Генерируем ссылку на 60 секунд (1 минута)
        presigned_url = s3.get_presigned_url(photo.s3_key, expires_in=60)
        
        # Перенаправляем клиента напрямую в S3
        return redirect(presigned_url, code=302)


@photo_bp.route("/id/<int:id>/json", methods=['GET'])
def get_photo_json_by_id(id: int):
    with new_session() as db:
        photo = db.get(Photo, id)
        if not photo:
            return jsonify({"error": "Photo not found"}), 404

        presigned_url = s3.get_presigned_url(photo.s3_key, expires_in=60)
        
        photo_data = photo.to_dict()
        photo_data["url"] = presigned_url
        photo_data["expires_in"] = 60
        
        return jsonify(photo_data), 200