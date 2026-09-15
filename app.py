from flask import Flask, jsonify, request
from database import SessionLocal, init_db, new_session
from models import User
import models

from blueprints import users_bp


app = Flask(__name__)

app.register_blueprint(users_bp)

@app.route("/")
def root_not_found():
    return jsonify({
        "error": "Wrong path",
        "message": "Вы ошиблись путём. Используйте эндпоинты API, например /users"
    }), 404