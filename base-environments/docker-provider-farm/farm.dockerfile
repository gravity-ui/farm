FROM ghcr.io/gravity-ui/farm:_VERSION_-docker-provider

COPY ./farm-nginx.conf /etc/nginx/nginx.conf
COPY ./docker-proxy.conf /opt/nginx/

COPY ./farm-config.json /opt/
ENV FARM_ENV_PATH="/opt/farm-config.json"
ENV FARM_DB_FILE_PATH="/opt/app/db/farm.db"

CMD ["/bin/bash", "-c", "$farmEntrypoint"]
