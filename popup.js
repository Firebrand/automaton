// Popup script for Automaton Chrome Extension
// Handles UI interactions for importing and running playbooks

// Global variables
let playbookData = null;

// DOM elements
const importBtn = document.getElementById('importBtn');
const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const runBtn = document.getElementById('runBtn');
const saveBtn = document.getElementById('saveBtn');
const actionButtons = document.getElementById('actionButtons');
const fileInput = document.getElementById('fileInput');
const statusDiv = document.getElementById('status');
const playbookInfo = document.getElementById('playbookInfo');

// Initialize popup when it opens
document.addEventListener('DOMContentLoaded', initializePopup);

// Event listeners
importBtn.addEventListener('click', handleImportClick);
recordBtn.addEventListener('click', handleRecordClick);
stopBtn.addEventListener('click', handleStopClick);
runBtn.addEventListener('click', handleRunClick);
saveBtn.addEventListener('click', handleSaveClick);
fileInput.addEventListener('change', handleFileSelect);

/**
 * Initializes the popup by restoring any previously imported playbook and checking recording state
 */
function initializePopup() {
  // Check current recording state from background script
  chrome.runtime.sendMessage({ action: 'getRecordingState' }, function(recordingState) {
    if (recordingState && recordingState.isRecording) {
      // Update UI to show recording in progress
      updateRecordingUI(true);
      showStatus('Recording in progress...', 'info');
    } else {
      // Reset recording UI
      updateRecordingUI(false);
    }
  });
  
  // Try to restore previously imported playbook from storage
  chrome.storage.local.get(['currentPlaybook', 'playbookLoaded'], function(result) {
    if (result.playbookLoaded && result.currentPlaybook) {
      playbookData = result.currentPlaybook;
      
      // Validate the restored playbook
      if (validatePlaybook(playbookData)) {
        updatePlaybookInfo(playbookData);
        showActionButtons();
        showStatus('Previous playbook restored', 'info');
      } else {
        // Clear invalid data
        chrome.storage.local.remove(['currentPlaybook', 'playbookLoaded']);
        playbookData = null;
        hideActionButtons();
      }
    }
  });
}

/**
 * Handles the import button click by triggering file input
 * Prevents popup from closing by managing focus properly
 */
function handleImportClick() {
  // Prevent the popup from closing by keeping focus
  setTimeout(() => {
    fileInput.click();
  }, 100);
}

/**
 * Handles the record button click by starting recording via background script
 */
function handleRecordClick() {
  // Send message to background script to start recording
  chrome.runtime.sendMessage({ action: 'startRecording' }, function(response) {
    if (chrome.runtime.lastError) {
      showStatus('Error starting recording: ' + chrome.runtime.lastError.message, 'error');
      return;
    }
    
    if (response && response.success) {
      updateRecordingUI(true);
      showStatus('Recording started. Interact with the page and click Stop when done.', 'info');
    } else {
      showStatus('Error starting recording: ' + (response?.error || 'Unknown error'), 'error');
    }
  });
}

/**
 * Handles the stop recording button click via background script
 */
function handleStopClick() {
  // Send message to background script to stop recording
  chrome.runtime.sendMessage({ action: 'stopRecording' }, function(response) {
    if (chrome.runtime.lastError) {
      showStatus('Error stopping recording: ' + chrome.runtime.lastError.message, 'error');
      updateRecordingUI(false);
      return;
    }
    
    if (response && response.success && response.actions) {
      const recordedActions = response.actions;
      
      // Create playbook from recorded actions
      playbookData = createPlaybookFromRecording(recordedActions);
      
      // Store the recorded playbook
      chrome.storage.local.set({ 
        'currentPlaybook': playbookData,
        'playbookLoaded': true 
      }, function() {
        showStatus(`Recording stopped. Captured ${recordedActions.length} actions.`, 'success');
        updatePlaybookInfo(playbookData);
        showActionButtons();
        updateRecordingUI(false);
      });
    } else {
      showStatus('Error stopping recording: ' + (response?.error || 'No actions recorded'), 'error');
      updateRecordingUI(false);
    }
  });
}

/**
 * Handles the save button click by downloading the playbook as JSON
 */
function handleSaveClick() {
  if (!playbookData) {
    showStatus('No playbook to save', 'error');
    return;
  }
  
  try {
    // Create a blob with the JSON data
    const jsonString = JSON.stringify(playbookData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automaton-playbook-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    showStatus('Playbook saved successfully!', 'success');
  } catch (error) {
    showStatus('Error saving playbook: ' + error.message, 'error');
  }
}

/**
 * Handles file selection and parsing of the playbook JSON
 * @param {Event} event - The file input change event
 */
function handleFileSelect(event) {
  // Prevent event from bubbling up and potentially closing popup
  event.stopPropagation();
  
  const file = event.target.files[0];
  
  if (!file) {
    showStatus('No file selected', 'error');
    return;
  }
  
  // Validate file type
  if (!file.name.endsWith('.json')) {
    showStatus('Please select a JSON file', 'error');
    // Reset file input
    fileInput.value = '';
    return;
  }
  
  // Show loading state
  showStatus('Loading playbook...', 'info');
  
  // Read and parse the file
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const jsonContent = e.target.result;
      playbookData = JSON.parse(jsonContent);
      
      // Validate playbook structure
      if (!validatePlaybook(playbookData)) {
        showStatus('Invalid playbook format', 'error');
        playbookData = null;
        runBtn.disabled = true;
        return;
      }
      
      // Store playbook in chrome storage for persistence
      chrome.storage.local.set({ 
        'currentPlaybook': playbookData,
        'playbookLoaded': true 
      }, function() {
        // Update UI to show successful import
        showStatus('Playbook imported successfully!', 'success');
        updatePlaybookInfo(playbookData);
        showActionButtons();
      });
      
    } catch (error) {
      showStatus('Error parsing JSON file: ' + error.message, 'error');
      playbookData = null;
      hideActionButtons();
    }
  };
  
  reader.onerror = function() {
    showStatus('Error reading file', 'error');
    playbookData = null;
    hideActionButtons();
  };
  
  reader.readAsText(file);
}

/**
 * Validates the structure of the imported playbook
 * @param {Object} playbook - The parsed playbook data
 * @returns {boolean} - True if valid, false otherwise
 */
function validatePlaybook(playbook) {
  // Check if playbook has required properties
  if (!playbook || typeof playbook !== 'object') {
    return false;
  }
  
  // Check if actions array exists and is valid
  if (!Array.isArray(playbook.actions)) {
    return false;
  }
  
  // Validate each action has required properties
  for (const action of playbook.actions) {
    if (!action.selector || !action.type || action.timestamp === undefined) {
      return false;
    }
  }
  
  return true;
}

/**
 * Updates the playbook information display
 * @param {Object} playbook - The imported playbook data
 */
function updatePlaybookInfo(playbook) {
  const actionCount = playbook.actions.length;
  const version = playbook.version || 'Unknown';
  
  playbookInfo.textContent = `Version: ${version} | Actions: ${actionCount}`;
  playbookInfo.style.display = 'block';
}

/**
 * Handles the run button click by executing the playbook on the current tab
 */
function handleRunClick() {
  if (!playbookData) {
    showStatus('No playbook loaded', 'error');
    return;
  }
  
  // Disable run button during execution
  runBtn.disabled = true;
  runBtn.textContent = 'Running...';
  
  showStatus('Executing playbook...', 'info');
  
  // Get the current active tab and execute the playbook
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const activeTab = tabs[0];
    
    // Send the playbook data to the content script for execution
    chrome.tabs.sendMessage(activeTab.id, {
      action: 'executePlaybook',
      playbook: playbookData
    }, function(response) {
      // Handle response from content script
      if (chrome.runtime.lastError) {
        showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        resetRunButton();
        return;
      }
      
      if (response && response.success) {
        showStatus('Playbook executed successfully!', 'success');
      } else {
        showStatus('Error executing playbook: ' + (response?.error || 'Unknown error'), 'error');
      }
      
      resetRunButton();
    });
  });
}

/**
 * Resets the run button to its original state
 */
function resetRunButton() {
  runBtn.disabled = false;
  runBtn.textContent = 'Run Playbook';
}

/**
 * Shows a status message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of message (success, error, info)
 */
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  // Auto-hide success and info messages after 3 seconds
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}

/**
 * Shows the action buttons (Run and Save)
 */
function showActionButtons() {
  actionButtons.style.display = 'flex';
  runBtn.disabled = false;
  saveBtn.disabled = false;
}

/**
 * Hides the action buttons (Run and Save)
 */
function hideActionButtons() {
  actionButtons.style.display = 'none';
  runBtn.disabled = true;
  saveBtn.disabled = true;
}

/**
 * Updates the recording UI based on recording state
 * @param {boolean} recording - Whether recording is active
 */
function updateRecordingUI(recording) {
  if (recording) {
    // Recording is active
    recordBtn.textContent = 'Recording...';
    recordBtn.classList.add('recording');
    recordBtn.disabled = true;
    stopBtn.style.display = 'block';
    stopBtn.disabled = false;
    importBtn.disabled = true;
    hideActionButtons();
  } else {
    // Recording is not active
    recordBtn.textContent = 'Record';
    recordBtn.classList.remove('recording');
    recordBtn.disabled = false;
    stopBtn.style.display = 'none';
    stopBtn.disabled = true;
    importBtn.disabled = false;
  }
}

/**
 * Creates a playbook object from recorded actions
 * @param {Array} actions - Array of recorded actions
 * @returns {Object} - Playbook object in the correct format
 */
function createPlaybookFromRecording(actions) {
  return {
    version: '1.0',
    created: new Date().toISOString(),
    userAgent: navigator.userAgent,
    actions: actions
  };
}
