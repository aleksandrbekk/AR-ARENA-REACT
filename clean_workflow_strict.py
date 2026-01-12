import json

# Load the fixed workflow
with open('workflow_fixed.json', 'r') as f:
    data = json.load(f)

# Minimal fields for update
allowed_keys = ['name', 'nodes', 'connections', 'settings']

# Create a filtered dict
filtered_data = {k: v for k, v in data.items() if k in allowed_keys}

# Save the strict clean updated workflow
with open('workflow_strict.json', 'w') as f:
    json.dump(filtered_data, f, indent=2)

print("Strict cleaned workflow JSON for upload.")
