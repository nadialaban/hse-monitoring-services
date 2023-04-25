npm install
sudo pip3 install --upgrade -r requirements.txt
sudo apt-get install python3-cffi libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info python3-setuptools python3-wheel build-essential python3-dev
sudo cp agents_library.conf /etc/supervisor/conf.d/
sudo cp agents_library_nginx.conf /etc/nginx/sites-enabled/
sudo supervisorctl update
sudo systemctl restart nginx
sudo certbot --nginx -d library.ai.medsenger.ru
touch config.py
