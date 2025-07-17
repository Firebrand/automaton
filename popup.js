// DOM Elements
const importBtn = document.getElementById('importBtn');
const fileInput = document.getElementById('fileInput');
const runBtn = document.getElementById('runBtn');
const statusEl = document.getElementById('status');
const fileInfoEl = document.getElementById('fileInfo');
const fileNameEl = document.getElementById('fileName');
const actionCountEl = document.getElementById('actionCount');

// Track the current playbook
let currentPlaybook = null;

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Check if we have a stored playbook
  chrome.storage.local.get(['playbook'], (result) => {
    if (result.playbook) {
      currentPlaybook = result.playbook;
      updateUIForPlaybook(currentPlaybook);
    }
  });
});

// Handle Import button click
importBtn.addEventListener('click', () => {
  fileInput.click();
});

// Handle file selection
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const playbook = JSON.parse(e.target.result);
      
      // Validate the playbook structure
      if (!playbook.actions || !Array.isArray(playbook.actions)) {
        throw new Error('Invalid playbook format: missing actions array');
      }
      
      // Store the playbook in chrome.storage
      currentPlaybook = playbook;
      chrome.storage.local.set({ playbook }, () => {
        updateUIForPlaybook(playbook);
        updateStatus('Playbook loaded successfully');
      });
      
    } catch (error) {
      console.error('Error parsing playbook:', error);
      updateStatus('Error: Invalid playbook file');
    }
  };
  
  reader.onerror = () => {
    updateStatus('Error reading file');
  };
  
  reader.readAsText(file);
});

// Handle Run button click
runBtn.addEventListener('click', async () => {
  if (!currentPlaybook) return;
  
  updateStatus('Running playbook...');
  runBtn.disabled = true;
  
  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script to run the playbook
    chrome.tabs.sendMessage(tab.id, { 
      type: 'RUN_PLAYBOOK', 
      playbook: currentPlaybook 
    }, (response) => {
      if (chrome.runtime.lastError) {
        updateStatus('Error: ' + chrome.runtime.lastError.message);
      } else if (response && response.success) {
        updateStatus('Playbook execution started');
      } else {
        updateStatus('Failed to start playbook');
      }
      runBtn.disabled = false;
    });
    
  } catch (error) {
    console.error('Error running playbook:', error);
    updateStatus('Error: ' + error.message);
    runBtn.disabled = false;
  }
});

// Update UI when a playbook is loaded
function updateUIForPlaybook(playbook) {
  if (!playbook) {
    fileInfoEl.style.display = 'none';
    runBtn.disabled = true;
    return;
  }
  
  fileInfoEl.style.display = 'block';
  fileNameEl.textContent = playbook.name || 'Unnamed Playbook';
  actionCountEl.textContent = playbook.actions ? playbook.actions.length : 0;
  runBtn.disabled = false;
}

// Update status message with auto-clear
timeoutId = null;
function updateStatus(message, duration = 3000) {
  statusEl.textContent = message;
  
  if (timeoutId) clearTimeout(timeoutId);
  if (duration > 0) {
    timeoutId = setTimeout(() => {
      statusEl.textContent = '';
    }, duration);
  }
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ACTION_COMPLETED') {
    updateStatus(`Completed action ${request.index + 1} of ${request.total}`);
  } else if (request.type === 'PLAYBOOK_COMPLETE') {
    updateStatus('Playbook execution completed', 5000);
    runBtn.disabled = false;
  } else if (request.type === 'PLAYBOOK_ERROR') {
    updateStatus(`Error: ${request.error}`, 5000);
    runBtn.disabled = false;
  }
  
  // Required for async response
  return true;
});
