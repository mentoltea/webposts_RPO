import config
from app import app
from database import init_db

def main():
    init_db()
    
    app.run(host='0.0.0.0', port=config.FLASK_PORT, debug=True)

if __name__ == "__main__":
    main()