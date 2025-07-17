# Playbook Runner Chrome Extension

A Chrome extension that allows you to record and replay user interactions on web pages using a JSON playbook format.

## Features

- **Import Playbook**: Load a JSON playbook containing recorded interactions
- **Run Playbook**: Execute the loaded playbook on the current page
- **Precise Timing**: Actions are executed with the same timing as they were recorded
- **Multiple Action Types**: Supports clicks and text input
- **Real-time Feedback**: See the progress of playbook execution

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the directory containing the extension files

## Usage

1. Navigate to the web page where you want to run the playbook
2. Click the Playbook Runner extension icon in the Chrome toolbar
3. Click "Import Playbook" and select your `playbook.json` file
4. Click "Run Playbook" to execute the recorded actions

## Playbook Format

The playbook should be a JSON file with the following structure:

```json
{
  "version": "1.0",
  "actions": [
    {
      "type": "click",
      "selector": "button#submit",
      "inputType": "button",
      "timestamp": 1234567890,
      "value": ""
    },
    {
      "type": "input",
      "selector": "input#username",
      "inputType": "text",
      "timestamp": 1234567990,
      "value": "testuser"
    }
  ]
}
```

## Development

### File Structure

- `manifest.json`: Extension configuration
- `popup.html`/`popup.js`: Extension popup UI and logic
- `content.js`: Content script that runs in the context of web pages
- `background.js`: Background script for extension lifecycle management
- `playbook.json`: Example playbook file

### Building

No build step is required. Simply load the extension in Chrome as described in the Installation section.

## License

MIT
