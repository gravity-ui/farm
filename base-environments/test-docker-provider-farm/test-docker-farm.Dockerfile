FROM ghcr.io/gravity-ui/farm:docker-provider-VERSION

COPY ./nginx.conf /etc/nginx/
COPY ./docker-proxy.conf /opt/nginx/

COPY ./farm-config.json /opt/
ENV FARM_ENV_PATH="/opt/farm-config.json"
ENV FARM_DB_FILE_PATH="/opt/app/db/farm.db"

CMD ["/bin/bash", "-c", "$farmEntrypoint"]
