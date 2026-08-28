#!/usr/bin/env python3
"""Crée l'index k-NN HNSW sur OpenSearch Serverless (appelé par Terraform null_resource)."""

from __future__ import annotations

import argparse
import json
import sys

import boto3
import requests
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest


def create_index(endpoint: str, index_name: str, dimensions: int, region: str) -> None:
    host = endpoint if endpoint.startswith("https://") else f"https://{endpoint}"
    url = f"{host}/{index_name}"

    body = {
        "settings": {"index": {"knn": True}},
        "mappings": {
            "properties": {
                "embedding": {
                    "type": "knn_vector",
                    "dimension": dimensions,
                    "method": {
                        "name": "hnsw",
                        "space_type": "cosinesimil",
                        "engine": "nmslib",
                        "parameters": {"ef_construction": 128, "m": 16},
                    },
                },
                "chunkText": {"type": "text"},
                "documentId": {"type": "keyword"},
                "title": {"type": "text"},
                "s3Key": {"type": "keyword"},
                "chunkIndex": {"type": "integer"},
                "allowedGroups": {"type": "keyword"},
            }
        },
    }

    session = boto3.Session()
    credentials = session.get_credentials().get_frozen_credentials()
    headers = {"Content-Type": "application/json"}

    request = AWSRequest(method="PUT", url=url, data=json.dumps(body), headers=headers)
    SigV4Auth(credentials, "aoss", region).add_auth(request)
    signed_headers = dict(request.headers.items())

    response = requests.put(url, data=json.dumps(body), headers=signed_headers, timeout=30)
    if response.status_code in (200, 201):
        print(f"Index '{index_name}' créé avec succès.")
        return
    if response.status_code == 400 and "resource_already_exists_exception" in response.text:
        print(f"Index '{index_name}' existe déjà — ignoré.")
        return
    print(f"Erreur création index: {response.status_code} {response.text}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--endpoint", required=True)
    parser.add_argument("--index", required=True)
    parser.add_argument("--dimensions", type=int, required=True)
    parser.add_argument("--region", default="eu-west-1")
    args = parser.parse_args()
    create_index(args.endpoint, args.index, args.dimensions, args.region)
