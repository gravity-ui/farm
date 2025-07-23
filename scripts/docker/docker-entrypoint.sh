set -euo pipefail

## Check & define vars

FARM_DEPLOYMENT_MODE=${FARM_DEPLOYMENT_MODE:="docker_container"}

DOCKER_NETWORK=${DOCKER_NETWORK:="farm"}
DOCKER_NETWORK_IPV6=${DOCKER_NETWORK_IPV6:="true"}

if [[ $DOCKER_NETWORK_IPV6 == "true"  ]]; then
DOCKER_NETWORK_SUBNET=${DOCKER_NETWORK_SUBNET:="ad00::/8"}
DOCKER_FIXED_CIDR_V6=${DOCKER_FIXED_CIDR_V6:="fc00::/8"}
DOCKER_NETWORK_FLAGS=${DOCKER_NETWORK_FLAGS:="--driver=bridge --ipv6 --subnet=$DOCKER_NETWORK_SUBNET"}
fi

DOCKER_PROXY_CONTAINER=${DOCKER_PROXY_CONTAINER:="farm-docker-proxy"}
DOCKER_PROXY_NGINX_TAG=${DOCKER_PROXY_NGINX_TAG:="latest"}
DOCKER_PROXY_PORT=${DOCKER_PROXY_PORT:="3004"}
DOCKER_PROXY_NGINX_CONF_SRC=${DOCKER_PROXY_NGINX_CONF_SRC:="/opt/nginx/docker-proxy.conf"}
DOCKER_RUNNING_CHECK_INTERVAL=${DOCKER_RUNNING_CHECK_INTERVAL:="3"}
DOCKER_REGISTRY=${DOCKER_REGISTRY:="ghcr.io"}

function checkAndStartDocker() {
    service docker status || service docker start && sleep $DOCKER_RUNNING_CHECK_INTERVAL
}

if [[ $FARM_DEPLOYMENT_MODE == "vm" ]]; then
echo "Starting docker..."
checkAndStartDocker
fi

if [[ -z "$DOCKER_LOGIN" || -z "$DOCKER_PWD" ]]; then
    echo "Warning: DOCKER_LOGIN or DOCKER_PWD not defined, skipping docker login"
else
    echo $DOCKER_PWD | docker login --username $DOCKER_LOGIN --password-stdin $DOCKER_REGISTRY
    if [[ $FARM_DEPLOYMENT_MODE == "vm" ]]; then
    ## on restart container docker service may down after starting by unknown reason, check and try again
    checkAndStartDocker
    fi
fi

## prepare docker network
if [[ $DOCKER_NETWORK_IPV6 == "true" && $FARM_DEPLOYMENT_MODE == "vm"  ]]; then
    if [[ -z "$DOCKER_NETWORK_IPV6_DNS_ADDRESS" ]]; then
        echo "Error: DOCKER_NETWORK_IPV6_DNS_ADDRESS environment variable is not set" >&2
        exit 1
    fi

    cat << EOF > /etc/docker/daemon.json
{
    "iptables": false,
    "ip-forward": false,
    "ipv6": true,
    "dns": [
        "$DOCKER_NETWORK_IPV6_DNS_ADDRESS"
    ],
    "dns-opts": ["rotate", "timeout:1", "attempts:2"],
    "fixed-cidr": "",
    "fixed-cidr-v6": "$DOCKER_FIXED_CIDR_V6"
}
EOF

service docker stop && ip link del docker0 && service docker start
ip6tables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sysctl -w net.ipv6.conf.all.forwarding=1
ip6tables -t nat -A POSTROUTING \! -o docker0 -j MASQUERADE

fi

## create network if not exists
(docker network inspect $DOCKER_NETWORK &>/dev/null && echo "Network $DOCKER_NETWORK already created") || \
(docker network create $DOCKER_NETWORK_FLAGS $DOCKER_NETWORK && echo "Network $DOCKER_NETWORK created")

if [[ ! -e "/etc/nginx/nginx.conf" ]]; then
    echo "Define /etc/nginx/nginx.conf config with farm routes"
    exit 1;
fi

nginx -t -c /etc/nginx/nginx.conf

if [[ $FARM_DEPLOYMENT_MODE == "vm" ]]; then
    if [[ ! -e "/opt/nginx/docker-proxy.conf" ]]; then
        echo "Config /opt/nginx/docker-proxy.conf not found"
        exit 1;
    fi

    nginx -t -c /opt/nginx/docker-proxy.conf

    docker run --rm -d \
    --name=$DOCKER_PROXY_CONTAINER \
    -p 127.0.0.1:${DOCKER_PROXY_PORT}:80/tcp \
    --network=$DOCKER_NETWORK \
    -v $DOCKER_PROXY_NGINX_CONF_SRC:/etc/nginx/nginx.conf \
    nginx:${DOCKER_PROXY_NGINX_TAG} bash -c "/usr/sbin/nginx -g 'daemon off;'" || docker start $DOCKER_PROXY_CONTAINER
fi

## Run Nginx
service nginx start &
echo "Nginx started"

## Run Farm
echo "Starting farm..."
npm start
