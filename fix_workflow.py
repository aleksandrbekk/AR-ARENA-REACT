import json

# Load the workflow
with open('workflow.json', 'r') as f:
    data = json.load(f)

# Find the Log Slide node
for node in data['nodes']:
    if node['name'] == 'Log Slide':
        # Current dangerous implementation:
        # "={\"chat_id\": {{ $json.chatId }}, \"text\": \"...\"}"
        
        # New safe implementation using full JS object stringification
        # We use a template string for the text property to handle newlines easily
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
        print("Fixed 'Log Slide' node.")
        break

# Save the updated workflow
with open('workflow_fixed.json', 'w') as f:
    json.dump(data, f, indent=2)
