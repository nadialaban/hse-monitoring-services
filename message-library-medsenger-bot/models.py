import time
from datetime import datetime, timedelta, date
from functools import reduce

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import backref

db = SQLAlchemy()


class Contract(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    clinic_id = db.Column(db.Integer, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    agent_token = db.Column(db.String(255), nullable=True)

    is_admin = db.Column(db.Boolean, default=False)

    sent_messages = db.Column(db.JSON, nullable=True)

    def as_dict(self, native=False):
        serialized = {
            "id": self.id,
            "clinic_id": self.clinic_id,
            "is_admin": self.is_admin,
            "sent_messages": self.sent_messages
        }

        if native:
            serialized['agent_token'] = self.agent_token

        return serialized


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    title = db.Column(db.String(255), nullable=True)
    text = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(255), nullable=True)

    include_clinics = db.Column(db.JSON, nullable=True)
    exclude_clinics = db.Column(db.JSON, nullable=True)

    editors = db.Column(db.JSON, nullable=True)

    attached_files = db.relationship('AttachedFile', backref=backref('message', uselist=False), lazy=True)
    pin_files = db.Column(db.Boolean, default=False)

    def as_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            "text": self.text,
            'category': self.category,
            'editors': self.editors,
            'include_clinics': self.include_clinics,
            'exclude_clinics': self.exclude_clinics,
            'attached_files': sorted([file.as_dict() for file in self.attached_files], key=lambda k: k['name']),
            'pin_files': self.pin_files
        }


class AttachedFile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id', ondelete="CASCADE"),  nullable=True)
    type = db.Column(db.String(255), nullable=True)
    name = db.Column(db.String(255), nullable=True)
    title = db.Column(db.String(255), nullable=True)
    path = db.Column(db.String(255), nullable=True)

    def as_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'name': self.name,
            'title': self.title,
            'path': self.path
        }




