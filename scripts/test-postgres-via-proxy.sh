#!/bin/bash

# Test PostgreSQL connection via flyctl proxy
# This script will establish a tunnel to the PostgreSQL instances

echo "=== Testing Staging PostgreSQL (gs-stream-db-staging) ==="
echo "Run this command in another terminal:"
echo "flyctl proxy 5433:5432 -a kyzl60xwk9xrpj9g"
echo ""
echo "Then connect with:"
echo "psql postgresql://fly-user:bvON2p0LTYUcdYFitOncR370@localhost:5433/fly-db"
echo ""

echo "=== Testing Production PostgreSQL (gs-stream-db) ==="
echo "Run this command in another terminal:"
echo "flyctl proxy 5434:5432 -a d2gznoqmkl70pkm8"
echo ""
echo "Then connect with:"
echo "psql postgresql://fly-user:sno9wgaQbaTG5s3dO6pzCkGS@localhost:5434/fly-db"
