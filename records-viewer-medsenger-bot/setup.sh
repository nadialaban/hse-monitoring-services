npm install
sudo pip3 install -r requirements.txt
sudo apt-get install python3-cffi libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info python3-setuptools python3-wheel build-essential python3-dev
sudo cp agents_records.conf /etc/supervisor/conf.d/
sudo cp agents_records_nginx.conf /etc/nginx/sites-enabled/
sudo supervisorctl update
sudo systemctl restart nginx
sudo certbot --nginx -d records.ai.medsenger.ru
touch config.py
