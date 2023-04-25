from manage import *
from helpers import *
from tasks import tasks


@app.route('/')
def index():
    return "Waiting for the thunder"


@app.route('/debug-sentry')
def trigger_error():
    try:
        division_by_zero = 1 / 0
    except Exception as e:
        log(e, True)
        abort(500)


# monitoring and common api

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
    contract = contract_manager.get(contract_id)

    if data['order'] == 'need_conclusion':
        medicines = list(filter(lambda m: not m.canceled_at, contract.medicines))
        medicines = list(map(lambda m: m.title + (f' {m.dose}' if m.dose else ''), medicines))
        canceled_medicines = list(filter(lambda m: m.canceled_at, contract.medicines))
        canceled_medicines = list(map(lambda m: m.title + (f' {m.dose}' if m.dose else ''), canceled_medicines))

        params = {
            'medicines': medicines,
            'canceled_medicines': canceled_medicines
        }
        medsenger_api.send_order(contract.id, 'conclusion_params', None, params)
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

    contract, is_new = contract_manager.add(contract_id, clinic_id)

    params = data.get('params')

    if params:
        custom_records = filter(lambda x: "record_" in x and params.get(x), params.keys())
        for record_selector in custom_records:
            parts = record_selector.lstrip("record_").split('|')

            try:
                record_category = parts[0]
                value = params.get(record_selector)

                if len(parts) == 2:
                    record_transformer = parts[1]

                    if record_transformer == "week_to_date":
                        value = int(value)
                        value = (datetime.now() - timedelta(days=((value - 1) * 7 + 3))).strftime('%Y-%m-%d')

                medsenger_api.add_record(contract_id, record_category, value)

            except Exception as e:
                log(e)

        forms = params.get('forms')
        exclude_algorithms = params.get('exclude_algorithms', "").split(',')

        if forms:

            if not is_new:
                form_manager.clear(contract)
                algorithm_manager.clear(contract)
                medicine_manager.clear(contract)

            for template_id in forms.split(','):

                form = form_manager.attach(template_id, contract, {
                    "timetable": params.get('form_timetable_{}'.format(template_id)),
                    "message": params.get('form_message_{}'.format(template_id)),
                    "times": params.get('form_times_{}'.format(template_id)),
                })

                if form.algorithm_id and str(form.algorithm_id) not in exclude_algorithms:
                    algorithm_manager.attach(form.algorithm_id, contract, params)

        reminders = params.get('reminders')

        if reminders:
            for template_id in reminders.split(','):
                reminder_manager.attach(template_id, contract)

        algorithms = params.get('algorithms')

        if algorithms:
            for template_id in algorithms.split(','):
                algorithm_manager.attach(template_id, contract, params)

        medicines = params.get('medicines')

        if medicines:
            for template_id in medicines.split(','):
                medicine_manager.attach(template_id, contract, params.get('medicine_timetable_{}'.format(template_id)))

        custom_forms = filter(lambda x: "form_" in x and params.get(x), params.keys())
        for custom_form in custom_forms:
            try:
                part = custom_form.split('_')[1]
                if not part.isnumeric():
                    continue

                form_id = int(part)

                form = form_manager.attach(form_id, contract, {
                    "timetable": params.get('form_timetable_{}'.format(form_id)),
                    "message": params.get('form_message_{}'.format(form_id)),
                    "times": params.get('form_times_{}'.format(form_id)),
                })

                if form.algorithm_id and str(form.algorithm_id) not in exclude_algorithms:
                    algorithm_manager.attach(form.algorithm_id, contract, params)
            except Exception as e:
                log(e)

        custom_medicines = filter(lambda x: "medicine_" in x and params.get(x), params.keys())
        for custom_medicine in custom_medicines:
            try:
                part = custom_medicine.split('_')[1]
                if not part.isnumeric():
                    continue
                medicine_id = int(part)
                medicine_manager.attach(medicine_id, contract, params.get('medicine_timetable_{}'.format(medicine_id)))
            except Exception as e:
                log(e)

        custom_algorithms = filter(lambda x: "algorithm_" in x and params.get(x), params.keys())
        for custom_algorithm in custom_algorithms:
            try:
                part = custom_algorithm.split('_')[1]
                if not part.isnumeric():
                    continue
                algorithm_id = int(part)
                algorithm_manager.attach(algorithm_id, contract)
            except Exception as e:
                print(e)

    return "ok"


@app.route('/hook', methods=['POST'])
@verify_json
def hook(data):
    contract_id = int(data.get('contract_id'))
    category_names = data.get('category_names')
    tasks.examine_hook.s(contract_id, category_names).apply_async()
    return jsonify({
        "result": "ok",
    })


@app.route('/remove', methods=['POST'])
@verify_json
def remove(data):
    contract_id = data.get('contract_id')
    if not contract_id:
        abort(422)

    contract_manager.remove(contract_id)

    return "ok"


@app.route('/actions', methods=['POST'])
@verify_json
def actions(data):
    print("asked for actions")
    contract = contract_manager.get(data.get('contract_id'))
    forms = filter(lambda f: f.show_button, contract.forms)

    actions = [{'link': 'form/{}'.format(form.id), 'type': 'patient', 'name': form.button_title, 'id': form.id} for form
               in forms]

    return jsonify(actions)


@app.route('/params', methods=['POST'])
@verify_json
def params(data):
    contract = contract_manager.get(data.get('contract_id'))
    contract.timezone = medsenger_api.get_patient_info(contract.id).get('timezone')
    db.session.commit()
    return jsonify(algorithm_manager.search_params(contract))


@app.route('/params', methods=['GET'])
@verify_args
def get_params(args, data):
    contract = contract_manager.get(args.get('contract_id'))
    return jsonify(algorithm_manager.search_params(contract))


@app.route('/compliance', methods=['POST'])
@verify_json
def compliance(data):
    contract = contract_manager.get(data.get('contract_id'))
    sent, done = contract.patient.count_week_compliance()
    return jsonify({"sent": sent, "done": done})


@app.route('/message', methods=['POST'])
@verify_json
def message(data):
    return "ok"


# settings and views

@app.route('/settings', methods=['GET'])
@verify_args
def get_settings(args, form):
    contract = contract_manager.get(args.get('contract_id'))
    return get_ui('settings', contract, medsenger_api.get_categories())


@app.route('/preview_form/<form_id>', methods=['GET'])
@verify_args
def form_preview_page(args, form, form_id):
    contract = contract_manager.get(args.get('contract_id'))
    return get_ui('form', contract, medsenger_api.get_categories(), form_id, True)


@app.route('/form/<form_id>', methods=['GET'])
@verify_args
def form_page(args, form, form_id):
    contract = contract_manager.get(args.get('contract_id'))
    return get_ui('form', contract, medsenger_api.get_categories(), form_id)


@app.route('/outsource_form/<form_id>', methods=['GET'])
def outsource_form_page(form_id):
    return get_ui('outsource-form', None, [], form_id)


@app.route('/graph', methods=['GET'])
@verify_args
def graph_page(args, form):
    contract = contract_manager.get(args.get('contract_id'))
    return get_ui('graph', contract)


@app.route('/graph/<category_id>', methods=['GET'])
@verify_args
def graph_page_with_args(args, form, category_id):
    contract = contract_manager.get(args.get('contract_id'))
    return get_ui('graph', contract, object_id=category_id)


@app.route('/medicine/<medicine_id>', methods=['GET'])
@verify_args
def medicine_page(args, form, medicine_id):
    contract = contract_manager.get(args.get('contract_id'))
    medicine = medicine_manager.get(medicine_id)

    if medicine.verify_dose:
        return get_ui('verify-dose', contract, object_id=medicine_id)

    medicine_manager.submit(medicine_id, contract.id)

    if contract.tasks and 'medicine-{}'.format(medicine_id) in contract.tasks:
        medsenger_api.finish_task(contract.id, contract.tasks['medicine-{}'.format(medicine_id)])

    return get_ui('done', contract, [])


@app.route('/medicine-manager', methods=['GET'])
@verify_args
def medicine_editor_page(args, form):
    contract = contract_manager.get(args.get('contract_id'))
    return get_ui('settings', contract, medsenger_api.get_categories(), dashboard_parts=['meds'])


@app.route('/form-manager', methods=['GET'])
@verify_args
def forms_editor_page(args, form):
    contract = contract_manager.get(args.get('contract_id'))
    return get_ui('settings', contract, medsenger_api.get_categories(), dashboard_parts=['forms', 'algorithms'])


@app.route('/reminder-manager', methods=['GET'])
@verify_args
def notification_editor_page(args, form):
    contract = contract_manager.get(args.get('contract_id'))
    return get_ui('settings', contract, medsenger_api.get_categories(), dashboard_parts=['reminders'])


@app.route('/medicines-list', methods=['GET'])
@verify_args
def medicines_list_page(args, form):
    contract = contract_manager.get(args.get('contract_id'))
    return get_ui('medicines-list', contract, medsenger_api.get_categories())


# settings api
@app.route('/api/settings/get_patient', methods=['GET'])
@only_doctor_args
def get_data(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)
    patient = contract.patient.as_dict()
    patient["info"] = medsenger_api.get_patient_info(contract_id)
    patient["current_contract"] = contract.as_dict()

    return jsonify(patient)


@app.route('/api/settings/get_templates', methods=['GET'])
@only_doctor_args
def get_templates(args, form):
    templates = {
        "forms": form_manager.get_templates_as_dicts(),
        "medicines": medicine_manager.get_templates_as_dicts(),
        "reminders": reminder_manager.get_templates_as_dicts(),
        "algorithms": algorithm_manager.get_templates_as_dicts(),
        "examinations": examination_manager.get_templates_as_dicts()
    }

    return jsonify(templates)


@app.route('/api/settings/form', methods=['POST'])
@only_doctor_args
def create_form(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)
    form = form_manager.create_or_edit(request.json, contract)

    if form:
        return jsonify(form.as_dict())
    else:
        abort(422)


@app.route('/api/settings/delete_form', methods=['POST'])
@only_doctor_args
def delete_form(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)
    result = form_manager.remove(request.json.get('id'), contract)

    if result:
        return jsonify({
            "deleted_id": result
        })
    else:
        abort(404)


@app.route('/api/settings/medicine', methods=['POST'])
@only_doctor_args
def create_medicine(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)
    form = medicine_manager.create_or_edit(request.json, contract)

    if form:
        return jsonify(form.as_dict())
    else:
        abort(422)


@app.route('/api/settings/medicine_history', methods=['POST'])
@only_doctor_args
def edit_medicine_history(args, form):
    form = medicine_manager.edit_history(request.json)

    if form:
        return jsonify(form.as_dict())
    else:
        abort(422)


@app.route('/api/settings/delete_medicine', methods=['POST'])
@only_doctor_args
def delete_medicine(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)
    medicine_manager.edit_history(request.json)
    result = medicine_manager.remove(request.json.get('id'), contract, request.json.get('deleted_by_patient'))

    if result:
        return jsonify({
            "result": "ok",
            "deleted_id": result
        })
    else:
        abort(404)


@app.route('/api/settings/resume_medicine', methods=['POST'])
@only_doctor_args
def resume_medicine(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)
    medicine_manager.edit_history(request.json)
    result = medicine_manager.resume(request.json.get('id'), contract)

    if result:
        return jsonify({
            "result": "ok",
            "resumed_id": result
        })
    else:
        abort(404)


@app.route('/api/settings/delete_reminder', methods=['POST'])
@only_doctor_args
def delete_reminder(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)
    result = reminder_manager.remove(request.json.get('id'), contract)

    if result:
        return jsonify({
            "deleted_id": result
        })
    else:
        abort(404)


@app.route('/api/settings/reminder', methods=['POST'])
@only_doctor_args
def create_reminder(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)

    reminder = reminder_manager.create_or_edit(request.json, contract)

    if reminder:
        return jsonify(reminder.as_dict())
    else:
        abort(422)


@app.route('/reminder/<reminder_id>', methods=['GET'])
@verify_args
def reminder_page(args, form, reminder_id):
    contract = contract_manager.get(args.get('contract_id'))
    return get_ui('confirm-reminder', contract, medsenger_api.get_categories(), reminder_id)


@app.route('/api/reminder/<reminder_id>', methods=['GET'])
@verify_args
def get_reminder(args, form, reminder_id):
    reminder = reminder_manager.get(reminder_id)

    if reminder.contract_id != int(args.get('contract_id')) and not reminder.is_template:
        abort(401)

    return jsonify(reminder.as_dict())


@app.route('/api/reminder/<reminder_id>/set_state', methods=['POST'])
@verify_args
def set_reminder_state(args, form, reminder_id):
    contract_id = int(args.get('contract_id'))
    contract = contract_manager.get(contract_id)

    reminder = reminder_manager.get(reminder_id)
    data = request.json

    if reminder.contract_id != contract_id and not reminder.is_template:
        abort(401)

    if data['state'] == 'later':
        reminder_manager.set_next_date(reminder_id, contract, data['type'], data['count'])

    result = reminder_manager.set_state(reminder, data['state'])

    return jsonify(result)


@app.route('/api/settings/algorithm', methods=['POST'])
@only_doctor_args
def create_algorithm(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)
    form = algorithm_manager.create_or_edit(request.json, contract)

    if form:
        return jsonify(form.as_dict())
    else:
        abort(422)


@app.route('/api/settings/algorithms', methods=['POST'])
@only_doctor_args
def save_algorithms(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)
    for alg in request.json:
        form = algorithm_manager.create_or_edit(alg, contract)
        if not form:
            abort(422)
    return 'ok'


@app.route('/api/settings/delete_algorithm', methods=['POST'])
@only_doctor_args
def delete_algorithm(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)
    result = algorithm_manager.remove(request.json.get('id'), contract)

    if result:
        return jsonify({
            "result": "ok",
            "deleted_id": result
        })
    else:
        abort(404)


@app.route('/api/graph/categories', methods=['GET'])
@verify_args
def graph_categories(args, form):
    contract_id = args.get('contract_id')
    categories = medsenger_api.get_available_categories(contract_id)

    return jsonify(categories)


@app.route('/api/graph/group', methods=['POST'])
@verify_args
def graph_data(args, form):
    contract_id = args.get('contract_id')
    data = request.json
    group = data.get('group')
    dates = data.get('dates', None)

    answer = [(medsenger_api.get_records(contract_id, category_name) if dates is None
               else medsenger_api.get_records(contract_id, category_name, time_from=dates['start'],
                                              time_to=dates['end']))
              for category_name in group['categories']]
    answer = list(filter(lambda x: x is not None, answer))

    return jsonify(answer)


@app.route('/api/form/<form_id>', methods=['GET'])
@verify_args
def get_form(args, form, form_id):
    form = form_manager.get(form_id)

    if form.contract_id != int(args.get('contract_id')) and not form.is_template:
        abort(401)
    answer = form.as_dict()
    if args.get('source') == 'patient':
        answer['preview'] = False
    else:
        answer['preview'] = True

    return jsonify(answer)


@app.route('/api/outsource_form/<form_id>', methods=['GET'])
def get_form_outsource(form_id):
    form = form_manager.get(form_id)
    answer = form.as_dict()
    return jsonify(answer)


@app.route('/api/form/<form_id>', methods=['POST'])
@verify_args
def post_form(args, form, form_id):
    form = form_manager.get(form_id)
    data = request.json
    contract_id = int(args.get('contract_id'))

    if form.contract_id != contract_id and not form.is_template:
        abort(401)

    submit_chain = tasks.submit_form.s(True, data, form_id, contract_id)
    submit_chain |= tasks.examine_form.s(form_id, contract_id)
    submit_chain |= tasks.examine_contract_tasks.s(form_id, contract_id)
    submit_chain.apply_async()

    return jsonify({
        "result": "ok",
    })


@app.route('/api/outsource_form/<form_id>', methods=['POST'])
def post_outsource_form(form_id):
    form = form_manager.get(form_id)
    data = request.json

    result, action_name, custom_params = form_manager.get_integral_evaluation(None, data, form)

    return jsonify({
        "result": custom_params,
    })


@app.route('/api/send_form/<form_id>', methods=['GET'])
@verify_args
def send_form(args, form, form_id):
    form = form_manager.get(form_id)
    contract_id = int(args.get('contract_id'))

    form_manager.run(form, contract_id=contract_id, commit=False)

    return jsonify({
        "result": "ok",
    })


@app.route('/api/medicine/<medicine_id>', methods=['GET'])
@verify_args
def get_medicine(args, form, medicine_id):
    medicine = medicine_manager.get(medicine_id)

    if medicine.contract_id != int(args.get('contract_id')) and not medicine.is_template:
        abort(401)

    return jsonify(medicine.as_dict())


@app.route('/api/medicine/<medicine_id>/disable_notifications', methods=['POST'])
@verify_args
def disable_notifications(args, form, medicine_id):
    medicine = medicine_manager.get(medicine_id)

    if medicine.contract_id != int(args.get('contract_id')):
        abort(401)
    medicine.notifications_disabled = True
    db.session.commit()

    return jsonify(medicine.as_dict())


@app.route('/api/medicine/<medicine_id>/enable_notifications', methods=['POST'])
@verify_args
def enable_notifications(args, form, medicine_id):
    medicine = medicine_manager.get(medicine_id)

    if medicine.contract_id != int(args.get('contract_id')):
        abort(401)
    medicine.notifications_disabled = False
    db.session.commit()

    return jsonify(medicine.as_dict())


@app.route('/api/confirm-medicine', methods=['POST'])
@verify_args
def post_medicines(args, form):
    contract_id = int(args.get('contract_id'))
    contract = contract_manager.get(contract_id)

    data = request.json

    if data['custom']:
        medsenger_api.add_record(contract_id, 'medicine', data['medicine'], params=data['params'])
    else:
        medicine_manager.submit(data['medicine'], contract.id, params=data['params'])
        if contract.tasks and 'medicine-{}'.format(data['medicine']) in contract.tasks:
            medsenger_api.finish_task(contract.id, contract.tasks['medicine-{}'.format(data['medicine'])])

    return get_ui('done', contract, [])


@app.route('/api/medicine-template', methods=['GET'])
@verify_args
def get_medicine_template(args, form):
    contract_id = int(args.get('contract_id'))
    contract = contract_manager.get(contract_id)
    medicines = medicine_template_manager.get_clinic_templates(contract.clinic_id)
    return jsonify(medicines)

# examinations


@app.route('/examinations-list', methods=['GET'])
@verify_args
def examinations_list_page(args, form):
    contract = contract_manager.get(args.get('contract_id'))
    return get_ui('examinations-list', contract, medsenger_api.get_categories())


@app.route('/examination-manager', methods=['GET'])
@verify_args
def examination_editor_page(args, form):
    contract = contract_manager.get(args.get('contract_id'))
    return get_ui('settings', contract, medsenger_api.get_categories(), dashboard_parts=['examinations'])


@app.route('/examination/<examination_id>', methods=['GET'])
@verify_args
def examination_page(args, form, examination_id):
    contract = contract_manager.get(args.get('contract_id'))
    return get_ui('examination', contract, medsenger_api.get_categories(), examination_id)


@app.route('/api/settings/examination', methods=['POST'])
@only_doctor_args
def create_examination(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)

    examination = examination_manager.create_or_edit(request.json, contract)

    if examination:
        return jsonify(examination.as_dict())
    else:
        abort(422)


@app.route('/api/settings/delete_examination', methods=['POST'])
@only_doctor_args
def delete_examination(args, form):
    contract_id = args.get('contract_id')
    contract = contract_manager.get(contract_id)
    result = examination_manager.remove(request.json.get('id'), contract)

    if result:
        return jsonify({
            "deleted_id": result
        })
    else:
        abort(404)


@app.route('/api/examination/<examination_id>', methods=['GET'])
@verify_args
def get_examination(args, form, examination_id):
    contract_id = int(args.get('contract_id'))
    examination = examination_manager.get(examination_id)

    if examination.contract_id != int(args.get('contract_id')) and not examination.is_template:
        abort(401)
    answer = examination.as_dict()

    if examination.record_id:
        record = medsenger_api.get_record_by_id(contract_id, examination.record_id)
        answer['files'] = [record['attached_files']]

    return jsonify(answer)


@app.route('/api/examination/<examination_id>', methods=['POST'])
@verify_args
def post_examination(args, form, examination_id):
    contract_id = int(args.get('contract_id'))
    examination = examination_manager.get(examination_id)
    data = request.json

    if examination.contract_id != contract_id and not examination.is_template:
        abort(401)

    submit_chain = tasks.submit_examination.s(True, data['files'], examination_id, contract_id, data['date'])
    submit_chain.apply_async()

    return jsonify({
        "result": "ok",
    })


@app.route('/api/settings/get_examination_files/<examination_id>', methods=['GET'])
@verify_args
def get_examination_files(args, form, examination_id):
    contract_id = int(args.get('contract_id'))
    examination = examination_manager.get(examination_id)
    record = medsenger_api.get_record_by_id(contract_id, examination.record_id)

    files = []
    for file_info in record['attached_files']:
        file = medsenger_api.get_file(contract_id, file_info['id'])
        print(file_info)
        files.append({
            'base64': file['base64'],
            'type': file_info.get('type', 'text/plain'),
            'name': file_info['name']
        })
    return jsonify(files)


with app.app_context():
    db.create_all()


def run_tasks():
    timetable_manager.run(app)


if __name__ == "__main__":
    app.run(HOST, PORT, debug=API_DEBUG)
