# Automaton - Chrome Extension Playbook Runner

A Chrome extension that allows users to import and run automated playbooks on web pages. The extension can execute sequences of actions (clicks, inputs) with proper timing based on recorded timestamps.

## Features

- **Import Playbook**: Upload JSON files containing recorded user actions
- **Run Playbook**: Execute actions sequentially on the current web page
- **Timing Control**: Respects timestamp differences between actions for realistic playback
- **Visual Feedback**: Highlights elements during interaction
- **Error Handling**: Comprehensive validation and error reporting

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select this directory
4. The extension icon should appear in your Chrome toolbar

## Usage

1. Click the extension icon to open the popup
2. Click "Import Playbook" to select a JSON playbook file
3. Once imported, click "Run Playbook" to execute the actions on the current page

## Playbook Format

The extension expects JSON files with the following structure:

```json
{
  "version": "1.0",
  "created": "2025-07-17T01:42:00.610Z",
  "actions": [
    {
      "type": "input",
      "selector": "[id^=\"edit-label-0-value\"]",
      "timestamp": 1752716434723,
      "value": "Hello",
      "inputType": "text"
    },
    {
      "type": "click",
      "selector": "button.dropbutton__toggle",
      "timestamp": 1752716435842,
      "value": "",
      "inputType": "button"
    }
  ]
}
```

### Action Properties

- `type`: Action type (`input`, `click`)
- `selector`: CSS selector for the target element
- `timestamp`: Unix timestamp in milliseconds
- `value`: Value to input (for input actions) or empty string (for clicks)
- `inputType`: Type of input element (`text`, `button`, `submit`, etc.)

## Files Structure

- `manifest.json`: Chrome extension manifest
- `popup.html`: Extension popup interface
- `popup.js`: Popup logic and file handling
- `content.js`: Content script for executing actions on web pages
- `README.md`: This documentation file

## Technical Details

### Timing Implementation
The extension calculates delays between actions based on timestamp differences:
- Actions are sorted by timestamp to ensure proper execution order
- Waits are inserted between actions based on the time difference
- Minimum delays are added for page responsiveness

### Element Interaction
- Elements are scrolled into view before interaction
- Visual highlighting shows which elements are being interacted with
- Proper event dispatching simulates real user interactions
- Input actions simulate character-by-character typing

### Error Handling
- Validates playbook JSON structure before execution
- Checks for element existence before attempting interactions
- Provides detailed error messages for troubleshooting
- Graceful handling of disabled or hidden elements

## Development

The extension uses Chrome Extension Manifest V3 with:
- Content scripts for page interaction
- Message passing between popup and content scripts
- File API for JSON import functionality
- Modern async/await patterns for timing control

## Troubleshooting

- **Element not found**: Ensure CSS selectors in the playbook match the target page
- **Actions not executing**: Check that the page has fully loaded before running
- **Timing issues**: Verify timestamp format and ensure actions are in chronological order
- **Permission errors**: Make sure the extension has access to the current tab
