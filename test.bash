#!/usr/bin/env bash

echo "Running cURL"

curl -H "Content-Type: application/json" -X POST -d @request.json http://localhost:8080/stats

curl http://localhost:8080/stats

echo ""
