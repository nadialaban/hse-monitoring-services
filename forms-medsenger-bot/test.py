import re
contract = contract_manager.get(contract_id)
custom_params = {}
medicine_titles = self.medsenger_api.get_records(contract.id, "hormonal_contraception_medicine", limit=1)
if medicine_titles['values']:
    custom_params['title'] = medicine_titles['values'][0]['value']

medicine_times = self.medsenger_api.get_records(contract.id, "hormonal_contraception_start_time", limit=1)
if medicine_times['values'] and re.match(r'\d\d:\d\d', medicine_times['values'][0]['value']):
    custom_params['times'] = [medicine_times['values'][0]['value']]

medicine_manager.attach(80, contract, custom_params=custom_params)
