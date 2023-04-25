import os.path
import base64

from helpers import log, timezone_now, STORAGE_PATH_PARTS
from managers.Manager import Manager
from models import Contract, AttachedFile


class FileManager(Manager):
    def __init__(self, *args):
        super(FileManager, self).__init__(*args)

    def get(self, file_id):
        file = AttachedFile.query.filter_by(id=file_id).first()

        if not file:
            raise Exception("No file_id = {} found".format(file_id))

        return file

    def add(self, file, message_id):
        path = self.save_file(file, message_id)
        file = AttachedFile(message_id=message_id, type=file['type'],
                            path=path, name=file['name'], title=file.get('title', file['name']))

        self.db.session.add(file)
        self.__commit__()

        return file.id

    def save_file(self, file, message_id):
        try:
            path = os.path.join(STORAGE_PATH_PARTS, 'message_{}'.format(str.zfill(str(message_id), 3)))
            os.makedirs(path, exist_ok=True)

            bytes = file['base64'].encode('utf-8')
            with open(os.path.join(path, file['name']), 'wb') as file_to_save:
                decoded_data = base64.decodebytes(bytes)
                file_to_save.write(decoded_data)

            return path
        except Exception as e:
            log(e)
            return None

    def delete_files(self, message_id):
        AttachedFile.query.filter_by(message_id=message_id).delete()
        try:
            path = os.path.join(STORAGE_PATH_PARTS, 'message_{}'.format(str.zfill(str(message_id), 3)))
            if os.path.exists(path):
                for f in os.listdir(path):
                    os.remove(os.path.join(path, f))

            return 'ok'
        except Exception as e:
            log(e)
            return None

    def get_all_message_files(self, message_id):
        files = AttachedFile.query.filter_by(message_id=message_id).all()
        return [self.get_full_file(file.id) for file in files]

    def get_full_file(self, file_id):
        try:
            file = self.get(file_id)
            with open(os.path.join(file.path, file.name), 'rb') as binary_file:
                binary_file_data = binary_file.read()
                base64_encoded_data = base64.b64encode(binary_file_data)
                base64_message = base64_encoded_data.decode('utf-8')

                result = file.as_dict()
                result.update({'base64': base64_message})

                return result
        except Exception as e:
            log(e)
            return None
