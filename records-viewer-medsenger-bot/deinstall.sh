sudo rm /etc/supervisor/conf.d/agents_records.conf
sudo rm /etc/nginx/sites-enabled/agents_records_nginx.conf
sudo supervisorctl update
sudo systemctl restart nginx
