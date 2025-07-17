// Background script for the Playbook Runner extension

// Listen for when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Playbook Runner extension installed');
  
  // Initialize storage with default values if needed
  chrome.storage.local.get(['playbook'], (result) => {
    if (!result.playbook) {
      chrome.storage.local.set({ playbook: null });
    }
  });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // This is a simple pass-through for now, but can be extended
  // to handle more complex background tasks in the future
  
  // Forward messages from content script to popup
  if (['ACTION_COMPLETED', 'PLAYBOOK_COMPLETE', 'PLAYBOOK_ERROR', 'PLAYBOOK_STARTED'].includes(request.type)) {
    // The message will be received by the popup if it's open
    chrome.runtime.sendMessage(request);
  }
  
  // Required for async response
  return true;
});
