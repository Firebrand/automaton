// Popup script for Automaton Chrome Extension
// Handles UI interactions for importing and running playbooks

// Global variable to store the imported playbook data
let playbookData = null;

// DOM elements
const importBtn = document.getElementById('importBtn');
const runBtn = document.getElementById('runBtn');
const fileInput = document.getElementById('fileInput');
const statusDiv = document.getElementById('status');
const playbookInfo = document.getElementById('playbookInfo');

// Initialize popup when it opens
document.addEventListener('DOMContentLoaded', initializePopup);

// Event listeners
importBtn.addEventListener('click', handleImportClick);
runBtn.addEventListener('click', handleRunClick);
fileInput.addEventListener('change', handleFileSelect);

/**
 * Initializes the popup by restoring any previously imported playbook
 */
function initializePopup() {
  // Try to restore previously imported playbook from storage
  chrome.storage.local.get(['currentPlaybook', 'playbookLoaded'], function(result) {
    if (result.playbookLoaded && result.currentPlaybook) {
      playbookData = result.currentPlaybook;
      
      // Validate the restored playbook
      if (validatePlaybook(playbookData)) {
        updatePlaybookInfo(playbookData);
        runBtn.disabled = false;
        showStatus('Previous playbook restored', 'info');
      } else {
        // Clear invalid data
        chrome.storage.local.remove(['currentPlaybook', 'playbookLoaded']);
        playbookData = null;
        runBtn.disabled = true;
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
        runBtn.disabled = false;
      });
      
    } catch (error) {
      showStatus('Error parsing JSON file: ' + error.message, 'error');
      playbookData = null;
      runBtn.disabled = true;
    }
  };
  
  reader.onerror = function() {
    showStatus('Error reading file', 'error');
    playbookData = null;
    runBtn.disabled = true;
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
