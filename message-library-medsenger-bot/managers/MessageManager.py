import json
from config import LOCALHOST
from helpers import log, timezone_now
from managers.Manager import Manager
from managers.FileManager import FileManager
from managers.ContractManager import ContractManager
from models import Contract, Message
import urllib.parse


class MessageManager(Manager):
    def __init__(self, *args):
        super(MessageManager, self).__init__(*args)
        self.file_manager = FileManager(*args)
        self.contract_manager = ContractManager(*args)

    def get_available(self, contract):
        messages = Message.query.all()

        if contract.is_admin:
            return messages

        return list(filter(lambda m: not m.include_clinics and not m.exclude_clinics or
                                     m.include_clinics and contract.clinic_id in m.include_clinics or
                                     m.exclude_clinics and contract.clinic_id not in m.exclude_clinics, messages))

    def get(self, message_id):
        message = Message.query.filter_by(id=message_id).first()

        if not message:
            raise Exception("No message_id = {} found".format(message_id))

        return message

    def get_with_files(self, message_id):
        message = self.get(message_id).as_dict()
        message['attached_files'] = self.file_manager.get_all_message_files(message_id)
        return message

    def remove(self, id, contract):
        message = Message.query.filter_by(id=id).first_or_404()

        if not contract.is_admin:
            return None

        try:
            for file in message.attached_files:
                self.db.session.delete(file)

            self.db.session.delete(message)

            self.__commit__()
        except Exception as e:
            log(e)

        return id

    def create_or_edit(self, data, contract):
        try:
            message_id = data.get('id')
            if not message_id:
                message = Message()
            else:
                message = Message.query.filter_by(id=message_id).first_or_404()
                if not contract.is_admin:
                    return None

            message.title = data.get('title')
            message.text = data.get('text')
            message.category = data.get('category', 'Общее')

            message.editors = data.get('editors', [])

            message.include_clinics = list(map(lambda c: c['id'], data.get('include_clinics', [])))
            message.include_clinics = message.include_clinics if len(message.include_clinics) else None

            message.exclude_clinics = list(map(lambda c: c['id'], data.get('exclude_clinics', [])))
            message.exclude_clinics = message.exclude_clinics if len(message.exclude_clinics) else None

            message.pin_files = data.get('pin_files', False)

            if not message_id:
                self.db.session.add(message)
            self.__commit__()

            self.file_manager.delete_files(message.id)

            for file in data.get('attached_files', []):
                self.file_manager.add(file, message.id)

            return message
        except Exception as e:
            log(e)
            return None

    def send(self, message, contract_id):
        result = self.medsenger_api.send_message(contract_id, message['text'], attachments=message['attached_files'])

        if message['pin_files']:
            materials = [{'name': file['title'], 'link': LOCALHOST + '/' + file['path'] + '/' + urllib.parse.quote(file['name'])} for file in
                         message['attached_files'] if file['title']]
            self.medsenger_api.set_info_materials(contract_id, json.dumps(materials))

        self.contract_manager.add_message(contract_id, message['id'])
        return result
