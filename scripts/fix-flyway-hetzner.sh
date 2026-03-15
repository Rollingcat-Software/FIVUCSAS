#!/bin/bash
echo "Stopping API container..."
docker stop fivucsas-identity-core-api
echo "Replacing JAR..."
cp /tmp/identity-core-api-1.0.0-MVP.jar /home/ahabg/identity-core-api/app.jar
echo "Rebuilding Docker image..."
cd /home/ahabg/identity-core-api
docker compose up -d --build identity-core-api
echo "Done. Wait ~60s for app to boot."
