import json

# Load the fixed workflow
with open('workflow_fixed.json', 'r') as f:
    data = json.load(f)

# Fields to keep for update
allowed_keys = ['name', 'nodes', 'connections', 'settings', 'staticData', 'tags', 'pinData']

# Create a filtered dict
filtered_data = {k: v for k, v in data.items() if k in allowed_keys}

# Save the clean updated workflow
with open('workflow_clean.json', 'w') as f:
    json.dump(filtered_data, f, indent=2)

print("Cleaned workflow JSON for upload.")
