import os
from datetime import timedelta
from flask import Blueprint, jsonify, request, session, send_from_directory, redirect
from database import SessionLocal, init_db, new_session
from config import FLASK_SECRET_KEY, BASE_DIR, FRONTEND_DIR
from models import User, Post, Photo
import uuid
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
    
@photo_bp.route('/upload', methods=['POST', 'PUT'])
def upload_photo():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({"error": "Empty file"}), 400

    original_filename = file.filename
    mime_type = file.mimetype or 'image/jpeg'

    ext = os.path.splitext(original_filename)[1]
    s3_key = f"{uuid.uuid4()}{ext}"

    try:
        with new_session() as db:
            user = db.get(User, user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            s3.upload_file(file.stream, s3_key, content_type=mime_type)
            
            photo = Photo(
                s3_key=s3_key,
                original_filename=original_filename,
                mime_type=mime_type,
                user_id=user_id
            )
            
            db.add(photo)
            db.commit()
            db.refresh(photo)

            return jsonify({
                "message": "Photo uploaded successfully",
                "photo_id": photo.id,
                "s3_key": photo.s3_key
            }), 201

    except Exception as e:
        return jsonify({"error": f"Failed to upload photo: {str(e)}"}), 500