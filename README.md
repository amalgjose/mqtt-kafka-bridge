# mqtt-kafka-bridge
A lightweight **Node.js service** that bridges **MQTT messages** to **Apache Kafka**.  
Designed for Industrial IoT and data streaming use cases, with **Prometheus metrics** for monitoring.

The MQTT-Kafka brige is a critical component in IIoT usecases. The data gets collected from sensors, PLCs, OPCs, Equipments etc via MQTT and sent to a central platform via MQTT. This data will be landed in a Kafka for further processing at a scale. I have personally used similar technique in several usecases. You can scale this further depending upon your requirement.

## Features
- Consume MQTT messages from any broker
- Batch messages before publishing to Kafka (configurable)
- Reliable requeue on Kafka send failure
- Exposes Prometheus-compatible metrics at `/metrics`
- Ready-to-use **Docker Compose** setup (Mosquitto + Kafka + Bridge)


## Configuration

Environment variables are loaded from `.env`:

```env
# MQTT
MQTT_BROKER=mqtt://mosquitto:1883
MQTT_TOPIC=iot/data

# Kafka
KAFKA_BROKER=kafka:9092
KAFKA_TOPIC=iiot_data

# Metrics server
METRICS_PORT=3000

# Batch settings
BATCH_SIZE=500
FLUSH_INTERVAL=100
```

## Deployment

The docker-compose deploys the complete stack including MQTT Broker, Apache Kafka and Zookeeper.
Execute the following to build the docker image and start the complete stack.
```
docker-compose up --build -d
```
## Example Usage
### Publish a test message:
```
docker exec -it mosquitto mosquitto_pub -t iot/data -m "Hello Kafka"
```
### Consume from Kafka:
```
docker exec -it kafka kafka-console-consumer.sh \
    --bootstrap-server kafka:9092 \
    --topic iiot_data \
    --from-beginning
```

