import pytz
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from medsenger_api import AgentApiClient

from helpers import timezone_now, localize


class Manager:
    def __init__(self, medsenger_api: AgentApiClient, db: SQLAlchemy):
        self.medsenger_api = medsenger_api
        self.db = db

    def __commit__(self):
        self.db.session.commit()

