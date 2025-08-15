FARM_DEPLOYMENT_MODE=${FARM_DEPLOYMENT_MODE:="docker_container"}
farmImageName="your-farm-image"
farmHome="$HOME/farm"

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
--restart unless-stopped \
--ulimit nofile=65536:65536 \
--privileged -it \
--env-file .env \
-e FARM_DEPLOYMENT_MODE=$FARM_DEPLOYMENT_MODE \
--network=$DOCKER_NETWORK \
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
# - `-v /var/run/docker.sock:/var/run/docker.sock` - Binds host Docker socket to container
# - `-v $HOME/.docker/config.json:/root/.docker/config.json` - Mounts Docker auth config for farm usage
