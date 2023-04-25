sudo cp ./configs/video_client.nginx.conf /etc/nginx/sites-enabled
sudo cp ./configs/video_client.supervisor.conf /etc/supervisor/conf.d
sudo supervisorctl reread
sudo supervisorctl update
sudo nginx -s reload
sudo certbot --nginx -d vc.medsenger.ru
