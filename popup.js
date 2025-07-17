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

// Event listeners
importBtn.addEventListener('click', handleImportClick);
runBtn.addEventListener('click', handleRunClick);
fileInput.addEventListener('change', handleFileSelect);

/**
 * Handles the import button click by triggering file input
 */
function handleImportClick() {
  fileInput.click();
}

/**
 * Handles file selection and parsing of the playbook JSON
 * @param {Event} event - The file input change event
 */
function handleFileSelect(event) {
  const file = event.target.files[0];
  
  if (!file) {
    showStatus('No file selected', 'error');
    return;
  }
  
  // Validate file type
  if (!file.name.endsWith('.json')) {
    showStatus('Please select a JSON file', 'error');
    return;
  }
  
  // Read and parse the file
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const jsonContent = e.target.result;
      playbookData = JSON.parse(jsonContent);
      
      // Validate playbook structure
      if (!validatePlaybook(playbookData)) {
        showStatus('Invalid playbook format', 'error');
        return;
      }
      
      // Update UI to show successful import
      showStatus('Playbook imported successfully!', 'success');
      updatePlaybookInfo(playbookData);
      runBtn.disabled = false;
      
    } catch (error) {
      showStatus('Error parsing JSON file: ' + error.message, 'error');
      playbookData = null;
      runBtn.disabled = true;
    }
  };
  
  reader.onerror = function() {
    showStatus('Error reading file', 'error');
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
