# -*- coding: utf-8 -*-
"""Validate the V2 ledger relationships without network access."""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JSON = os.path.join(ROOT, "data", "data.json")
REQUIRED = {"providers", "products", "windows", "current_state", "events", "observations", "signals", "forecasts"}


def main():
    with open(DATA_JSON, encoding="utf-8") as handle:
        data = json.load(handle)
    errors = []
    if data.get("schema_version") != "2.0":
        errors.append("schema_version must be 2.0")
    missing = REQUIRED - set(data)
    if missing:
        errors.append("missing top-level fields: " + ", ".join(sorted(missing)))
    product_ids = {item["id"] for item in data.get("products", [])}
    provider_ids = {item["id"] for item in data.get("providers", [])}
    for product in data.get("products", []):
        if product.get("provider_id") not in provider_ids:
            errors.append(f"product {product['id']} has an unknown provider")
    for collection in ("windows", "current_state", "events", "observations", "signals", "forecasts"):
        for item in data.get(collection, []):
            if item.get("product_id") not in product_ids:
                errors.append(f"{collection} contains unknown product {item.get('product_id')}")
    recovery = {(item["product_id"], item["target"].get("type")) for item in data.get("forecasts", [])}
    for pid in product_ids:
        if (pid, "normal_recovery") not in recovery or (pid, "global_reset") not in recovery:
            errors.append(f"{pid} is missing a recovery or hazard forecast")
    if errors:
        print("[verify] FAILED")
        for item in errors:
            print(" - " + item)
        sys.exit(1)
    print(f"[verify] OK · {len(product_ids)} products · {len(data['events'])} events · {len(data['forecasts'])} forecasts")


if __name__ == "__main__":
    main()
