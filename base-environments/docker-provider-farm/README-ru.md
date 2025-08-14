# Farm — Базовое окружение с docker провайдером

## Docker Container vs VM

Farm с Docker можно запустить двумя способами.

**Docker Container с подключенным docker engine**

Docker контейнер будет выполнять команды, используя внешний сокет docker'а, тем самым управляя контейнерами на хосте.

**VM с docker**

Виртуальная машина на основе образа farm с независимым Docker внутри. Используется с docker-proxy.

Используйте `FARM_DEPLOYMENT_MODE` для определения режима: `vm` или `docker_container`.

> Docker proxy — контейнер для проксирования запросов к контейнеру инстанса по хешу в адресе.

## Настройка

- **Получите базовый образ Farm или соберите из репозитория**

- **Скопируйте примеры файлов в ваш проект**
  - Подготовьте `farm-config.json` — Основная конфигурация Farm.
  - Подготовьте `host-nginx-farm.conf` — Правила Nginx хоста для контейнера (при использовании как docker контейнера).
  - Подготовьте `farm-nginx.conf` — Основные правила Nginx Farm.
  - Подготовьте `docker-proxy.conf` (при использовании как VM).
  - Подготовьте файл `.env` (при использовании как docker контейнера).
  - Подготовьте файл `farm.dockerfile`.

- **Соберите образ Farm вашего проекта с конфигурациями:**

Проверьте содержимое `./build-project-farm.sh`.

```bash
# Добавьте права на выполнение
chmod +x ./build-project-farm.sh
```

Запустите `./build-project-farm.sh`.

- **Подготовьте Nginx на уровне хоста для маршрутизации запросов в Farm:**

Скопируйте `host-nginx-farm.conf` в `/etc/nginx/site-enabled` и замените todo и актуальный порт контейнера Farm.

- **Запустите образ Farm:**

Подготовьте содержимое `startup.sh`.

```bash
# Добавьте права на выполнение
chmod +x ./startup.sh
```

Запустите `./startup.sh`.

## Устранение неполадок с IPv6

При использовании окружения ipv6 у вас могут возникнуть проблемы с доступом в внешний Интернет из контейнера. Вот рекомендации, которые могут помочь:

> Убедитесь, что docker сеть `farm` создана с флагами ipv6, как в примере startup или скрипте docker entrypoint.

**Найдите ipv6 адреса ваших DNS серверов:**

```bash
nslookup -type=NS google.com
```

**Скопируйте значение из Server в docker конфигурацию:**

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

Если Docker не запускается с ошибкой:

> Failed to start docker.socket: The name org.freedesktop.PolicyKit1 was not provided by any .service files

Вам нужно установить пакет policykit-1:

```bash
sudo apt install policykit-1
```

**Установите пакет iptables-persistent, во время установки сохраните только правила ipv6:**

```bash
sudo ip6tables -t nat -A POSTROUTING \! -o docker0 -j MASQUERADE
```

> Если проблема возникнет снова, повторите команды настройки сети.
