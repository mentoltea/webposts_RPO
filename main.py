import config
from app import app
from database import init_db
from s3 import s3

def main():
    init_db()
    s3.init_public_bucket()
    
    app.run(host='0.0.0.0', port=config.FLASK_PORT, debug=True)

if __name__ == "__main__":
    main()