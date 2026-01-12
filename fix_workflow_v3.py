import json

# Load the broken workflow
with open('workflow_broken.json', 'r') as f:
    data = json.load(f)

# The fix v3: Use $input.all() directly
new_js_code = """
const uploadedItems = $input.all();
const originalItems = $('Filter Valid').all();
const results = [];

// n8n preserves order, so index i in uploadedItems corresponds to index i in Filter Valid items
for (let i = 0; i < uploadedItems.length; i++) {
  const uploaded = uploadedItems[i].json;
  // Safety check for index existence
  const original = originalItems[i] ? originalItems[i].json : {};

  if (uploaded.secure_url) {
    results.push({
      json: {
        slideIndex: original.slideIndex,
        imageUrl: uploaded.secure_url,
        chatId: original.chatId,
        caption: original.caption,
        product: original.product,
        totalSlides: original.totalSlides
      }
    });
  }
}

return results;
"""

found = False
for node in data['nodes']:
    if node['name'] == 'Collect URLs':
        node['parameters']['jsCode'] = new_js_code
        print("Fixed 'Collect URLs' node with $input.all() logic.")
        found = True
        break

if not found:
    print("Error: 'Collect URLs' node not found!")

# Verify Log Slide fix
for node in data['nodes']:
    if node['name'] == 'Log Slide':
        new_expression = (
            "={{ JSON.stringify({ "
            "chat_id: $json.chatId, "
            "text: `🔍 Слайд ${$json.slideIndex}/${$json.totalSlides}:\\n"
            "${$json.error ? '❌ ' + $json.errorMsg : '✅ OK'}\\n"
            "ref: ${$json.debugInfo.refType || 'NONE'}, size: ${$json.debugInfo.base64SizeKB || 0}KB\\n"
            "mode: ${$json.debugInfo.mode || 'N/A'}\\n"
            "binaryKeys: ${JSON.stringify($json.debugInfo.fetchedBinaryKeys || [])}`, "
            "disable_notification: true "
            "}) }}"
        )
        node['parameters']['jsonBody'] = new_expression
        print("Re-applied 'Log Slide' fix.")
        break

# Clean up fields for API update
allowed_keys = ['name', 'nodes', 'connections', 'settings']
filtered_data = {k: v for k, v in data.items() if k in allowed_keys}

# Save
with open('workflow_fixed_v3.json', 'w') as f:
    json.dump(filtered_data, f, indent=2)
