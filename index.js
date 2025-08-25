require('dotenv').config();
const mqtt = require('mqtt');
const { Kafka } = require('kafkajs');
const express = require('express');
const client = require('prom-client');

// Load configuration
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://localhost";
const MQTT_TOPIC = process.env.MQTT_TOPIC || "iot/data";
const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "iiot_data";

// Initialize Prometheus Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Define Custom Metrics
const receivedMessages = new client.Counter({
    name: 'mqtt_messages_received_total',
    help: 'Total number of MQTT messages received',
});

const kafkaMessagesSent = new client.Counter({
    name: 'kafka_messages_sent_total',
    help: 'Total number of messages sent to Kafka',
});

const kafkaSendErrors = new client.Counter({
    name: 'kafka_send_errors_total',
    help: 'Total number of Kafka send errors',
});

// Register metrics
register.registerMetric(receivedMessages);
register.registerMetric(kafkaMessagesSent);
register.registerMetric(kafkaSendErrors);

// Kafka Producer Config
const kafka = new Kafka({ brokers: [KAFKA_BROKER], clientId: 'mqtt-to-kafka-bridge' });
const producer = kafka.producer();

const mqttClient = mqtt.connect(MQTT_BROKER);
const messageQueue = [];
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "500", 10);
const FLUSH_INTERVAL = parseInt(process.env.FLUSH_INTERVAL || "100", 10);

(async () => { await producer.connect(); console.log("Kafka Producer connected"); })();

mqttClient.on('connect', () => {
    console.log(`Connected to MQTT broker at ${MQTT_BROKER}`);
    mqttClient.subscribe(MQTT_TOPIC, (err) => {
        if (!err) console.log(`Subscribed to MQTT topic: ${MQTT_TOPIC}`);
    });
});

mqttClient.on('message', (topic, message) => {
    receivedMessages.inc();
    messageQueue.push({ value: message.toString(), timestamp: Date.now() });

    if (messageQueue.length >= BATCH_SIZE) flushMessages();
});

async function flushMessages() {
    if (messageQueue.length === 0) return;

    const batch = messageQueue.splice(0, BATCH_SIZE);
    console.log(`Sending batch of ${batch.length} messages to Kafka...`);

    try {
        await producer.send({ topic: KAFKA_TOPIC, messages: batch });
        kafkaMessagesSent.inc(batch.length);
    } catch (error) {
        console.error("Kafka batch send error:", error);
        kafkaSendErrors.inc();
        messageQueue.unshift(...batch);
    }
}

setInterval(flushMessages, FLUSH_INTERVAL);

// Monitoring Server with Express.js
const app = express();
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

app.listen(3000, () => console.log("Metrics server running on port 3000"));

const shutdown = async () => {
    console.log("\nShutting down...");
    await flushMessages();
    await producer.disconnect();
    mqttClient.end();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
