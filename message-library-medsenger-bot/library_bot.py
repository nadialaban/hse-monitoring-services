import json

from manage import *
from medsenger_api import AgentApiClient
from helpers import *
from managers.ContractManager import ContractManager
from managers.MessageManager import MessageManager
from managers.FileManager import FileManager
import urllib.parse

medsenger_api = AgentApiClient(API_KEY, MAIN_HOST, AGENT_ID, API_DEBUG)
contract_manager = ContractManager(medsenger_api, db)
message_manager = MessageManager(medsenger_api, db)
file_manager = FileManager(medsenger_api, db)


@app.route('/')
def index():
    return "Waiting for the thunder"


# common api

@app.route('/status', methods=['POST'])
@verify_json
def status(data):
    answer = {
        "is_tracking_data": True,
        "supported_scenarios": [],
        "tracked_contracts": contract_manager.get_active_ids()
    }

    return jsonify(answer)


@app.route('/order', methods=['POST'])
@verify_json
def order(data):
    contract_id = data.get('contract_id')
    if data['order'] == 'send_message':
        params = data['params']
        message = message_manager.get_with_files(params['message_id'])
        message_manager.send(message, contract_id)
        return 'ok'

    return "not found"

# contract management api


@app.route('/init', methods=['POST'])
@verify_json
def init(data):
    contract_id = data.get('contract_id')
    clinic_id = data.get('clinic_id')
    if not contract_id:
        abort(422)

    contract_manager.add(contract_id, clinic_id)
    return "ok"


@app.route('/remove', methods=['POST'])
@verify_json
def remove(data):
    contract_id = data.get('contract_id')
    if not contract_id:
        abort(422)

    contract_manager.remove(contract_id)

    return "ok"


# settings and views

@app.route('/settings', methods=['GET'])
@verify_args
def get_settings(args, form):
    contract = contract_manager.get(args.get('contract_id'))
    patient_info = medsenger_api.get_patient_info(args.get('contract_id'))

    return get_ui('settings', contract, patient_info['doctor_id'])


# api
@app.route('/api/save_message', methods=['POST'])
@only_doctor_args
def create_message(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)

    message = message_manager.create_or_edit(request.json, contract)

    if message:
        return jsonify(message.as_dict())
    else:
        abort(422)


@app.route('/api/delete_message', methods=['POST'])
@only_doctor_args
def delete_form(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)

    result = message_manager.remove(request.json.get('id'), contract)

    if result:
        return jsonify({
            "deleted_id": result
        })
    else:
        abort(404)


@app.route('/api/get_available_messages', methods=['GET'])
@only_doctor_args
def get_available_messages(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)

    messages = message_manager.get_available(contract)
    return jsonify(list(map(lambda m: m.as_dict(), messages)))


@app.route('/api/send_message/<message_id>', methods=['GET'])
@verify_args
def send_form(args, form, message_id):
    message = message_manager.get_with_files(message_id)
    contract_id = int(args.get('contract_id'))

    message_manager.send(message, contract_id)

    return jsonify({
        "result": "ok",
    })


@app.route('/api/get_message/<message_id>', methods=['GET'])
@verify_args
def get_message(args, form, message_id):
    message = message_manager.get_with_files(message_id)
    return jsonify(message)


@app.route('/api/get_file/<file_id>', methods=['GET'])
@verify_args
def get_file(args, form, file_id):
    file = file_manager.get_full_file(file_id)
    return jsonify(file)


@app.route('/api/get_clinics_info', methods=['GET'])
@verify_args
def get_clinics(args, form):
    return jsonify(medsenger_api.get_clinics_info())


@app.route('/api/get_patient', methods=['GET'])
@verify_args
def get_patient(args, form):
    contract_id = int(args.get('contract_id'))
    return jsonify(contract_manager.get_patient(contract_id))


# не работает...
@app.route('/storage/<message>/<file>', methods=['GET', 'POST'])
def open_file(message, file):
    return send_from_directory(directory=os.path.join(STORAGE_PATH_PARTS, message), filename=urllib.parse.unquote(file))


with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(HOST, PORT, debug=API_DEBUG)
