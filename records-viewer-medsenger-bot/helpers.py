import json
import os
import sys
import math
from datetime import datetime

from flask import request, abort, render_template
from pytz import timezone
from sentry_sdk import capture_exception
from medsenger_api import AgentApiClient

from config import *

medsenger_api = AgentApiClient(APP_KEY, MAIN_HOST, AGENT_ID, API_DEBUG)
text_categories = ['symptom', 'medicine', 'patient_comment', 'information']


def gts():
    now = datetime.now()
    return now.strftime("%Y-%m-%d %H:%M:%S - ")


def log(error, terminating=False):
    exc_type, exc_obj, exc_tb = sys.exc_info()
    file_name = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]

    if PRODUCTION:
        capture_exception(error)

    if terminating:
        print(gts(), exc_type, file_name, exc_tb.tb_lineno, error, "CRITICAL")
    else:
        print(gts(), exc_type, file_name, exc_tb.tb_lineno, error)


# decorators
def verify_args(func):
    def wrapper(*args, **kwargs):
        if not request.args.get('contract_id'):
            abort(422)
        if request.args.get('api_key') != APP_KEY:
            abort(401)
        try:
            return func(request.args, request.form, *args, **kwargs)
        except Exception as e:
            log(e, True)
            abort(500)

    wrapper.__name__ = func.__name__
    return wrapper


def verify_json(func):
    def wrapper(*args, **kwargs):
        if not request.json.get('contract_id') and "status" not in request.url:
            abort(422)
        if request.json.get('api_key') != APP_KEY:
            abort(401)
        try:
            return func(request.json, *args, **kwargs)
        except Exception as e:
            log(e, True)
            abort(500)

    wrapper.__name__ = func.__name__
    return wrapper


def get_ui(contract, mode='settings', object_id=None, source=None, params={}):
    return render_template('index.html', contract_id=contract.id, agent_token=contract.agent_token,
                           mode=mode, object_id=object_id, source=source, params=json.dumps(params),
                           api_host=MAIN_HOST.replace('8001', '8000'), local_host=LOCALHOST,
                           agent_id=AGENT_ID, lc=dir_last_updated('static'))


def dir_last_updated(folder):
    return str(max(os.path.getmtime(os.path.join(root_path, f))
                   for root_path, dirs, files in os.walk(folder)
                   for f in files))


def timezone_now(zone=None):
    if zone:
        tz = timezone(zone)
    else:
        tz = timezone('Europe/Moscow')
    return datetime.now(tz)


def localize(d, zone=None):
    if zone:
        tz = timezone(zone)
    else:
        tz = timezone('Europe/Moscow')
    return tz.localize(d)


def get_patient_data(contract_id):
    patient = medsenger_api.get_patient_info(contract_id)
    return patient


def get_records_list(contract_id, categories, dates, options=None):
    if options is None:
        options = {}
    info = {
        'type': options.get('type'),
        'first_load': options.get('first_load')
    }

    if options.get('first_load'):
        last_record = medsenger_api.get_records(contract_id, (','.join(categories) + ','), limit=1)
        if last_record and len(last_record):
            last_date = datetime.fromtimestamp(last_record[0]['timestamp']).replace(hour=23, minute=59, second=59)
        else:
            last_date = datetime.now().replace(hour=23, minute=59, second=59)
        last_timestamp = int(round(last_date.timestamp()))
        dates = [last_timestamp - 14 * 24 * 60 * 60 + 1, last_timestamp]
    info['dates'] = dates

    if options.get('type') == 'line':
        categories += text_categories

    limit = RECORDS_LIMIT if options.get('type') == 'report' else None
    offset = options.get('page', 0) * RECORDS_LIMIT

    records = medsenger_api.get_records(contract_id, time_from=dates[0], time_to=dates[1],
                                        category_name=(','.join(categories) + ','),
                                        limit=limit, offset=offset)
    if not records:
        records = []

    if options.get('type') == 'report' and options.get('get_pages_count'):
        all_records = medsenger_api.get_records(contract_id, time_from=dates[0], time_to=dates[1], return_count=True,
                                                category_name=','.join(categories) if categories else None)
        count = all_records['count'] if all_records else 0
        info['page_count'] = math.ceil(count / RECORDS_LIMIT)

    for record in records:
        if record['category_info']['default_representation'] == 'non_zero_dates' and record['value'] == 0:
            continue

        record['formatted_date'] = datetime.fromtimestamp(record['timestamp']).strftime('%d.%m.%Y')
        record['formatted_time'] = datetime.fromtimestamp(record['timestamp']).strftime('%H:%M')

    answer = {
        'records': records,
        'info': info
    }

    return answer


def search_params(contract):
    params = {}
    # fixme
    return []
