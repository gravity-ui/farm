# Farm — Base environment with docker provider

## Docker Container vs VM

Docker Farm can be run in two ways.

**Docker Container with attached docker engine**

The docker container will run commands using an external docker socket, thereby managing the containers on the host.

**VM with docker**

A VM based on a farm image with an independent Docker inside. Use with docker-proxy.

Use `FARM_DEPLOYMENT_MODE` to define mode: `vm` or `docker_container`.

> Docker proxy — container to proxy request to instance container by hash in address.

## Setup

- **Pull base Farm image or build from repository**

- **Copy example files to your project**
  - Prepare `farm-config.json` — Main Farm configuration.
  - Prepare `host-nginx-farm.conf` — Host Nginx rules to container (farm docker container only).
  - Prepare `farm-nginx.conf` — Main Farm Nginx rules.
  - Prepare `docker-proxy.conf` (for VM only).

- **Build own project Farm image with configurations:**

Check content of `./build-project-farm.sh`.

```bash
# Add execute permission
chmod +x ./build-project-farm.sh
```

Run `./build-project-farm.sh`.

- **Prepare host-level Nginx for routing request to Farm:**

Copy `host-nginx-farm.conf` to `/etc/nginx/site-enabled` and replace todo and actual Farm container port.

- **Run Farm image:**

Prepare content `startup.sh`.

```bash
# Add execute permission
chmod +x ./startup.sh
```

Run `./startup.sh`.

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
