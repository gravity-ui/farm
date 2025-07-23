farmImageName="your-farm-image"
farmHome="$HOME/farm"
## When attach docker engine then need define DOCKER_PROXY_NGINX_CONF_SRC to docker-proxy.conf on host, cuz container entrypoint will start docker proxy from host-level.
## If your farm image has docker-proxy.conf inside, your may export it.
dockerProxyConfTarget=$farmHome/docker-proxy.conf
docker run --rm --entrypoint cat $farmImageName /opt/nginx/docker-proxy.conf > $dockerProxyConfTarget

## copied from docker entrypoint
DOCKER_NETWORK=${DOCKER_NETWORK:="farm"}
DOCKER_NETWORK_IPV6=${DOCKER_NETWORK_IPV6:="true"}
if [[ $DOCKER_NETWORK_IPV6 == "true"  ]]; then
DOCKER_NETWORK_SUBNET=${DOCKER_NETWORK_SUBNET:="ad00::/8"}
DOCKER_NETWORK_FLAGS=${DOCKER_NETWORK_FLAGS:="--driver=bridge --ipv6 --subnet=$DOCKER_NETWORK_SUBNET"}
fi
(docker network inspect $DOCKER_NETWORK &>/dev/null && echo "Network $DOCKER_NETWORK already created") || \
(docker network create $DOCKER_NETWORK_FLAGS $DOCKER_NETWORK && echo "Network $DOCKER_NETWORK created")
## <<<<

docker rm --force farm || echo "No actual farm container"
docker run \
-d \
--ulimit nofile=65536:65536 \
--privileged -it \
--env-file .env \
-e ATTACHED_DOCKER_ENGINE=true \
-e DOCKER_PROXY_NGINX_CONF_SRC="$dockerProxyConfTarget" \
--network=farm \
-v $farmHome:/farm \
-e FARM_DB_FILE_PATH="/farm/farm.db" \
-v /var/run/docker.sock:/var/run/docker.sock \
-v ~/.docker/config.json:/root/.docker/config.json \
-p 127.0.0.1:3000:80 \
--name farm \
$farmImageName

## Parameters explanation:
# - `--ulimit nofile=65536:65536` - Prepares container for docker-in-docker usage by setting file descriptor limits
# - `--privileged` - Grants extended privileges to the container
# - `-e ATTACHED_DOCKER_ENGINE=true` - Special mode for entrypoint configuration
# - `-e DOCKER_PROXY_NGINX_CONF_SRC="$dockerProxyConfTarget"` - Host path to nginx proxy configuration
# - `-v /var/run/docker.sock:/var/run/docker.sock` - Binds host Docker socket to container
# - `-v $HOME/.docker/config.json:/root/.docker/config.json` - Mounts Docker auth config for farm usage
