# Farm — Base environment with docker provider

- **Copy example files to your project**

- **Build own Farm image with project configurations:**

`build.sh`

```bash
docker . -f farm.dockerfile -t docker-farm:latest
```

- **Prepare host-level Nginx for routing request to Farm:**

> Replace todo and actual Farm container port

```nginx
server {
  ## todo: use when needed
  ## include common/ssl;

  ## Combined server_name pattern for main domain and subdomains
  server_name ~^(?<hash>.+\.)?your-farm\.host$;

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

- **Run Farm image:**

`startup.sh`

```bash
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
```

Parameters explanation:

- `--ulimit nofile=65536:65536` - Prepares container for docker-in-docker usage by setting file descriptor limits
- `--privileged` - Grants extended privileges to the container
- `-e ATTACHED_DOCKER_ENGINE=true` - Special mode for entrypoint configuration
- `-e DOCKER_PROXY_NGINX_CONF_SRC="$dockerProxyConfTarget"` - Host path to nginx proxy configuration
- `-v /var/run/docker.sock:/var/run/docker.sock` - Binds host Docker socket to container
- `-v $HOME/.docker/config.json:/root/.docker/config.json` - Mounts Docker auth config for farm usage

## IPv6 troubleshooting

When using an ipv6 environment, you may have problems accessing the external Internet from a container. Here are recommendations that can help:

> Ensure docker network `farm` is created with args ipv6 flags like in startup example or docker entrypoint script.

**Find your DNS server ipv6 addresses:**

```bash
nslookup -type=NS google.com
```

**Copy value from Server to docker config:**

```bash
sudo vim /etc/docker/daemon.json

{
    "iptables": false,
    "ip-forward": false,
    "ipv6": true,
    "dns": [
        "xxxx:yyyy:n:dddd::jjjj"
    ],
    "dns-opts": ["rotate", "timeout:1", "attempts:2"],
    "fixed-cidr": "",
    "fixed-cidr-v6": "fd00::/8"
}
```

```bash
service docker stop && ip link del docker0 && service docker start
ip6tables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sysctl -w net.ipv6.conf.all.forwarding=1
```

If Docker fails to start with the error:

> Failed to start docker.socket: The name org.freedesktop.PolicyKit1 was not provided by any .service files

You need to install the policykit-1 package:

```bash
sudo apt install policykit-1
```

**Install iptables-persistent package, during installation save only ipv6 rules:**

```bash
sudo ip6tables -t nat -A POSTROUTING \! -o docker0 -j MASQUERADE
```

> If the issue appears again, repeat the network configuration commands.
