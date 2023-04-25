docker pull kurento/kurento-media-server:latest
docker run -d --restart unless-stopped \
    --name kurento \
    -e KURENTO_LOGS_PATH=/var/log/kurento \
    -v ~/records:/records \
    -v ~/kurento-logs:/var/log/kurento \
    -p 8888:8888/tcp \
    -p 5000-5050:5000-5050/udp \
    -e KMS_MIN_PORT=5000 \
    -e KMS_MAX_PORT=5050 \
    kurento/kurento-media-server:latest