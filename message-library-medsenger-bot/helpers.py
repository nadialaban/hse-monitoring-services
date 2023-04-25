import json
import threading
from datetime import datetime
from flask import request, abort, jsonify, render_template
from config import *
from sentry_sdk import capture_exception
from pytz import timezone
import sys, os

DATACACHE = {}


def gts():
    now = datetime.now()
    return now.strftime("%Y-%m-%d %H:%M:%S - ")


def log(error, terminating=False):
    exc_type, exc_obj, exc_tb = sys.exc_info()
    fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]

    if PRODUCTION:
        capture_exception(error)

    if terminating:
        print(gts(), exc_type, fname, exc_tb.tb_lineno, error, "CRITICAL")
    else:
        print(gts(), exc_type, fname, exc_tb.tb_lineno, error)


# decorators
def verify_args(func):
    def wrapper(*args, **kargs):
        if not request.args.get('contract_id'):
            abort(422)
        if request.args.get('api_key') != API_KEY:
            abort(401)
        try:
            return func(request.args, request.form, *args, **kargs)
        except Exception as e:
            log(e, True)
            abort(500)

    wrapper.__name__ = func.__name__
    return wrapper


def only_doctor_args(func):
    def wrapper(*args, **kargs):
        if not request.args.get('contract_id'):
            abort(422)
        if request.args.get('api_key') != API_KEY:
            abort(401)
        # if request.args.get('source') == 'patient':
        #    abort(401)
        try:
            return func(request.args, request.form, *args, **kargs)
        except Exception as e:
            log(e, True)
            abort(500)

    wrapper.__name__ = func.__name__
    return wrapper


def verify_json(func):
    def wrapper(*args, **kargs):
        if not request.json.get('contract_id') and "status" not in request.url:
            abort(422)
        if request.json.get('api_key') != API_KEY:
            abort(401)
        # return func(request.json, *args, **kargs)
        try:
            return func(request.json, *args, **kargs)
        except Exception as e:
            log(e, True)
            abort(500)

    wrapper.__name__ = func.__name__
    return wrapper


def get_ui(mode, contract, doctor_id):
    return render_template('index.html', mode=mode, contract_id=contract.id, doctor_id=doctor_id, clinic_id=contract.clinic_id,
                           api_host=MAIN_HOST.replace('8001', '8000'), local_host=LOCALHOST, agent_token=contract.agent_token,
                           agent_id=AGENT_ID, is_admin=str(bool(contract.is_admin)).lower(), lc=dir_last_updated('static'))


def delayed(delay, f, args):
    timer = threading.Timer(delay, f, args=args)
    timer.start()


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
