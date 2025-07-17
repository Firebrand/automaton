// Background script for Automaton Chrome Extension
// Handles persistent recording state and communication between popup and content scripts

// Recording state that persists when popup closes
let recordingState = {
  isRecording: false,
  recordingTabId: null,
  startTime: null,
  actions: []
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'executeInMainWorld') {
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            world: 'MAIN',
            args: [message.selector, message.value],
            func: (selector, value) => {
                // Polling function to wait for CKEditor instance
                function waitForEditor() {
                    const editable = document.querySelector(selector);
                    if (editable && editable.ckeditorInstance) {
                        editable.ckeditorInstance.setData(value);
                    } else {
                        // If specific selector doesn't work, try generic CKEditor selector
                        const ckEditable = document.querySelector('.ck-editor__editable');
                        if (ckEditable && ckEditable.ckeditorInstance) {
                            ckEditable.ckeditorInstance.setData(value);
                        } else {
                            setTimeout(waitForEditor, 100);
                        }
                    }
                }
                waitForEditor();
            }
        });
        return;
    }
    
    // Handle recording state requests from popup
    if (message.action === 'getRecordingState') {
        sendResponse(recordingState);
        return;
    }
    
    if (message.action === 'startRecording') {
        // Get current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                recordingState.isRecording = true;
                recordingState.recordingTabId = tabs[0].id;
                recordingState.startTime = Date.now();
                recordingState.actions = [];
                
                // Send message to content script to start recording
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'startRecording'
                }, (response) => {
                    sendResponse({ success: true, recordingState });
                });
            } else {
                sendResponse({ success: false, error: 'No active tab found' });
            }
        });
        return true; // Will respond asynchronously
    }
    
    if (message.action === 'stopRecording') {
        if (!recordingState.isRecording || !recordingState.recordingTabId) {
            sendResponse({ success: false, error: 'Not currently recording' });
            return;
        }
        
        // Send message to content script to stop recording
        chrome.tabs.sendMessage(recordingState.recordingTabId, {
            action: 'stopRecording'
        }, (response) => {
            if (response && response.success) {
                recordingState.actions = response.actions || [];
                recordingState.isRecording = false;
                
                const finalState = { ...recordingState };
                
                // Reset recording state
                recordingState = {
                    isRecording: false,
                    recordingTabId: null,
                    startTime: null,
                    actions: []
                };
                
                sendResponse({ success: true, actions: finalState.actions });
            } else {
                recordingState.isRecording = false;
                sendResponse({ success: false, error: response?.error || 'Failed to stop recording' });
            }
        });
        return true; // Will respond asynchronously
    }
    
    // Handle action recording from content script
    if (message.action === 'recordAction' && sender.tab) {
        if (recordingState.isRecording && sender.tab.id === recordingState.recordingTabId) {
            recordingState.actions.push(message.actionData);
        }
        return;
    }
});