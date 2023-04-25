from helpers import log
from managers.Manager import Manager
from models import Contract


class ContractManager(Manager):
    def __init__(self, *args):
        super(ContractManager, self).__init__(*args)

    def add(self, contract_id):
        contract = Contract.query.filter_by(id=contract_id).first()

        if not contract:
            contract = Contract(id=contract_id)
            self.db.session.add(contract)

        contract.is_active = True
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

    def get(self, contract_id, active=None):
        contract = Contract.query.filter_by(id=contract_id).first()

        if not contract:
            raise Exception("No contract_id = {} found".format(contract_id))

        return contract

    def not_exists(self, contract_id):
        contract = Contract.query.filter_by(id=contract_id).first()

        return not contract

    def add_params(self, contract_id, params):
        try:
            contract = Contract.query.filter_by(id=contract_id).first()

            if not contract:
                raise Exception("No contract_id = {} found".format(contract_id))

            if not contract.params:
                contract.params = params
            else:
                contract.params.update(params)

            self.__commit__()
            return contract
        except Exception as e:
            log(e)

    def get_active_ids(self):
        return [contract.id for contract in Contract.query.filter_by(is_active=True).all()]
