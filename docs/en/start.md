# Farm

A self-hosted service for deploying applications from pull requests.

# How does it work?

**CI**

- Create a Pull Request
- Send a webhook to FarmAPI to create a new instance

**Farm**

- Downloads the code
- Builds the instance
- Launches the instance

**CI**

- Request the current instance status from FarmAPI
- Get the instance URL when it's ready
- Use the built instance to run E2E tests

<img src="../assets/network-schema-01.svg" alt="Network Schema" width="500"/>

General resource access schema.
The final version may be slightly more complex, depending on the selected configuration.

## Providers

Farm supports the following providers:

- Docker
- k8s

Infrastructure complexity and scaling capabilities depend on the chosen provider.

**Docker**

When using the Docker provider, the farm can only run on a single virtual machine. The load balancer, farm service, and built instances will share the resources of one virtual machine.

This is an economical and simple option for small teams.

It is recommended to limit the number of parallel builds or to run only one build at a time.

Current limitations:

- Partial BuildKit support (some features may not work)
- File and directory mounting features are not supported (including secrets and similar functionality).

**k8s**

With k8s, farm components, including instances and their build processes, run independently. This allows the farm to scale horizontally.


# Getting Started

We recommend starting by deploying one of the test farm configurations, and then configuring the farm for your own projects.
