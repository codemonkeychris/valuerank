import string
import yaml
from pathlib import Path

def make_blind_rubric(path_real, path_blind):
    """
    Create a static, ordered blinded rubric (A, B, C, …) from values_rubric.yaml.
    Works with the hierarchical structure used in the Valuerank master rubric.
    """
    # Load the full rubric YAML
    with open(path_real) as f:
        rubric = yaml.safe_load(f)

    # Extract the nested "values" section
    values_section = rubric.get("values", {})
    if not values_section:
        raise ValueError("Could not find 'values' section in rubric YAML.")

    # Sort values alphabetically by key for determinism
    value_items = sorted(values_section.items())

    # Prepare A–Z labels
    labels = list(string.ascii_uppercase)
    blind_map = {}
    blind_rubric = []

    for i, (name, content) in enumerate(value_items):
        blind_label = labels[i]
        definition = content.get("definition", "(no definition provided)")
        blind_map[blind_label] = name
        blind_rubric.append({
            "name": blind_label,
            "definition": definition
        })

    # Write the blinded rubric and its mapping file
    with open(path_blind, "w") as f:
        yaml.safe_dump(blind_rubric, f, sort_keys=False)

    map_path = str(path_blind).replace(".yaml", ".map.yaml")
    with open(map_path, "w") as f:
        yaml.safe_dump(blind_map, f, sort_keys=False)

    print(f"✅ Created {path_blind} and mapping file ({map_path}).")


if __name__ == "__main__":
    make_blind_rubric(
        path_real=Path("config/values_rubric.yaml"),
        path_blind=Path("config/values_rubric.blind.yaml")
    )