# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automaton is a Chrome Extension (Manifest V3) that automates web interactions by importing and executing JSON playbooks containing recorded user actions. The extension supports clicks, text inputs, and rich text editor (CKEditor) interactions.

## Key Architecture

### Core Components
- **popup.js**: Extension UI - handles playbook import, persistence via Chrome Storage API, and execution triggers
- **content.js**: Executes playbook actions on web pages - handles DOM interactions, timing, and visual feedback
- **background.js**: Service worker for special CKEditor interactions requiring MAIN world execution

### Message Flow
1. Popup imports playbook → saves to Chrome Storage
2. User clicks "Run" → popup sends message to content script
3. Content script executes actions sequentially
4. For CKEditor actions → content script messages background → background executes in MAIN world

## Development Commands

No build process - this is a pure Chrome extension:
- **Install**: Load unpacked in chrome://extensions/ with Developer Mode enabled
- **Test**: Manual testing by importing and running playbooks
- **Debug**: Chrome DevTools console in popup and content script contexts

## Working with Playbook Actions

### Supported Action Types
```json
{
  "type": "input",     // Text input
  "type": "click",     // Button/element click  
  "type": "ckeditor"   // Rich text editor
}
```

### Adding New Action Types
1. Update validation in popup.js `validatePlaybook()`
2. Add handler in content.js `executeAction()` switch statement
3. For complex interactions needing page context, add handler in background.js

## Key Implementation Details

- **Timing**: Currently uses fixed 1-second delays between actions (see content.js:26-27)
- **CKEditor**: Requires special handling via chrome.scripting.executeScript in MAIN world
- **Element Selection**: Uses `document.querySelector()` with CSS selectors from playbook
- **Input Simulation**: Character-by-character typing with proper input/change events
- **Error Handling**: Comprehensive try-catch blocks with user-friendly messages

## Chrome Extension APIs Used

- `chrome.tabs`: Tab interaction and script execution
- `chrome.runtime`: Message passing between contexts
- `chrome.storage.local`: Playbook persistence
- `chrome.scripting`: MAIN world execution for CKEditor

## Testing Approach

Test with the included playbook.json:
1. Load extension
2. Import playbook.json via popup
3. Navigate to a page with matching selectors
4. Execute and verify all action types work correctly

## Common Issues

- **Popup closes during file selection**: Focus management implemented in popup.js
- **CKEditor not working**: Ensure background.js message handling is correct
- **Elements not found**: Check CSS selectors match the target page structure