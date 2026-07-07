from flask import Flask

from .config import Config
from .students.csv_repository import CSVStudentRepository
from .students.routes import students_bp
from .auth.routes import auth_bp
from .extensions import session_ext

def create_app():
    app = Flask(__name__)
    
    app.config.from_object(Config)

    session_ext.init_app(app)
    
    #change when using LDAP
    app.student_repository = CSVStudentRepository(app.config["STUDENT_DATA_PATH"])

    app.register_blueprint(students_bp)
    app.register_blueprint(auth_bp)

    return app