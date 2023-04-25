from helpers import log
from managers.Manager import Manager
from models import Contract


class ContractManager(Manager):
    def __init__(self, *args):
        super(ContractManager, self).__init__(*args)

    def add(self, contract_id, clinic_id):
        contract = Contract.query.filter_by(id=contract_id).first()

        if not contract:
            contract = Contract(id=contract_id, clinic_id=clinic_id)
            self.db.session.add(contract)

        contract.is_active = True
        contract.clinic_id = clinic_id
        contract.agent_token = self.medsenger_api.get_agent_token(contract_id).get('agent_token')

        self.__commit__()

        return contract

    def remove(self, contract_id):
        try:
            contract = Contract.query.filter_by(id=contract_id).first()

            if not contract:
                raise Exception("No contract_id = {} found".format(contract_id))

            contract.is_active = False

            self.__commit__()
        except Exception as e:
            log(e)

    def add_message(self, contract_id, message_id):
        contract = Contract.query.filter_by(id=contract_id).first()

        if not contract:
            raise Exception("No contract_id = {} found".format(contract_id))

        if not contract.sent_messages:
            contract.sent_messages = [message_id]
        elif message_id not in contract.sent_messages:
            contract.sent_messages = contract.sent_messages + [message_id]

        self.__commit__()

        return contract.sent_messages

    def get_patient(self, contract_id):
        contract = Contract.query.filter_by(id=contract_id).first()

        if not contract:
            raise Exception("No contract_id = {} found".format(contract_id))

        result = self.medsenger_api.get_patient_info(contract_id)
        result.update({'sent_messages': contract.sent_messages})

        return result

    def get(self, contract_id, active=None):
        contract = Contract.query.filter_by(id=contract_id).first()

        if not contract:
            raise Exception("No contract_id = {} found".format(contract_id))

        return contract

    def get_active_ids(self):
        return [contract.id for contract in Contract.query.filter_by(is_active=True).all()]
