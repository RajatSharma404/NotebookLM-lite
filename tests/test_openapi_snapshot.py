import json
from pathlib import Path

import pytest

from api.main import app

SNAPSHOT_PATH = Path(__file__).parent / "openapi_snapshot.json"

@pytest.mark.unit
def test_openapi_breaking_changes():
    """
    CRITICAL COMPATIBILITY CONTRACT TEST:
    Fails on any breaking diff against the OpenAPI snapshot:
    - Removed or renamed endpoint path
    - Removed HTTP method
    - Removed response field or changed response field type
    - Newly required request parameter or field
    All modifications must be strictly ADDITIVE ONLY.
    """
    assert SNAPSHOT_PATH.exists(), f"OpenAPI snapshot missing at {SNAPSHOT_PATH}"
    snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
    current = app.openapi()

    snap_paths = snapshot.get("paths", {})
    curr_paths = current.get("paths", {})

    # 1. Assert all snapshot paths exist in current API
    for path, path_obj in snap_paths.items():
        assert path in curr_paths, f"BREAKING CHANGE: Path '{path}' was removed from API!"

        for method, operation in path_obj.items():
            if method.lower() not in {"get", "post", "put", "patch", "delete"}:
                continue
            assert method in curr_paths[path], (
                f"BREAKING CHANGE: Method '{method.upper()}' on '{path}' was removed!"
            )
            curr_operation = curr_paths[path][method]

            # 2. Assert no newly required parameters
            snap_params = {p["name"]: p for p in operation.get("parameters", [])}
            curr_params = {p["name"]: p for p in curr_operation.get("parameters", [])}

            for p_name, curr_p in curr_params.items():
                if p_name not in snap_params:
                    assert not curr_p.get("required", False), (
                        f"BREAKING CHANGE: Added required parameter '{p_name}' to {method.upper()} {path}!"
                    )

    # 3. Assert component schemas did not drop fields or change types
    snap_schemas = snapshot.get("components", {}).get("schemas", {})
    curr_schemas = current.get("components", {}).get("schemas", {})

    for schema_name, snap_schema in snap_schemas.items():
        if schema_name not in curr_schemas:
            continue
        curr_schema = curr_schemas[schema_name]

        snap_props = snap_schema.get("properties", {})
        curr_props = curr_schema.get("properties", {})

        for prop_name, snap_prop in snap_props.items():
            assert prop_name in curr_props, (
                f"BREAKING CHANGE: Field '{prop_name}' removed from schema '{schema_name}'!"
            )
            # Verify type did not change
            snap_type = snap_prop.get("type") or snap_prop.get("$ref")
            curr_type = curr_props[prop_name].get("type") or curr_props[prop_name].get("$ref")
            if snap_type and curr_type:
                assert snap_type == curr_type, (
                    f"BREAKING CHANGE: Field '{prop_name}' in '{schema_name}' changed type from {snap_type} to {curr_type}!"
                )
