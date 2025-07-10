# Farm — Base environment with docker provider

**Build own Farm image with project configurations:**

```bash
docker build base-environments/test-docker-provider-farm -f base-environments/test-docker-provider-farm/test-docker-farm.Dockerfile -t test-docker-farm:latest
```

**Prepare host-level Nginx for routing request to Farm:**

> Replace todo and actual Farm container port

```nginx
server {
  ## todo: use when needed
  ## include common/ssl;

  ## Combined server_name pattern for main domain and subdomains
  server_name ~^(?<hash>.+\.)?demo-farm-host\.local$;

  location / {
    proxy_pass http://127.0.0.1:3000;

    proxy_buffer_size 16k;
    proxy_buffers 8 16k;
    proxy_busy_buffers_size 16k;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
    proxy_redirect off;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

**Run Farm image:**

`startup.sh`

```bash
farmImageName="your-farm-image"
## When attach docker engine then need define DOCKER_PROXY_NGINX_CONF_SRC to docker-proxy.conf on host, cuz container entrypoint will start docker proxy from host-level.
## If your farm image has docker-proxy.conf inside, your may export it.
dockerProxyConfTarget=/farm/docker-proxy.conf
docker run --rm --entrypoint cat $farmImageName /opt/nginx/docker-proxy.conf > $dockerProxyConfTarget

docker run \
--rm \
-d \
--ulimit nofile=65536:65536 \
--privileged -it \
--env-file .env \
-e ATTACHED_DOCKER_ENGINE=true \
-e DOCKER_PROXY_NGINX_CONF_SRC="$dockerProxyConfTarget" \
--network=farm \
-v /farm:/farm \
-e FARM_DB_FILE_PATH="/farm/farm.db" \
-v /var/run/docker.sock:/var/run/docker.sock \
-v ~/.docker/config.json:/root/.docker/config.json \
-p 127.0.0.1:3000:80 \
--name farm \
$farmImageName
```
