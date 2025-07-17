// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'RUN_PLAYBOOK') {
    runPlaybook(request.playbook)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Error running playbook:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Required for async response
  }
});

/**
 * Executes a series of actions from a playbook with proper timing between actions
 * @param {Object} playbook - The playbook object containing actions to execute
 */
async function runPlaybook(playbook) {
  const { actions } = playbook;
  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    throw new Error('No actions found in playbook');
  }

  // Sort actions by timestamp to ensure correct order
  const sortedActions = [...actions].sort((a, b) => a.timestamp - b.timestamp);
  
  // Notify the popup of the total number of actions
  chrome.runtime.sendMessage({
    type: 'PLAYBOOK_STARTED',
    total: sortedActions.length
  });

  // Execute each action with the correct timing
  let lastTimestamp = sortedActions[0].timestamp;
  
  for (let i = 0; i < sortedActions.length; i++) {
    const action = sortedActions[i];
    const delay = i === 0 ? 0 : action.timestamp - lastTimestamp;
    
    // Wait for the specified delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Execute the action
    try {
      await executeAction(action);
      
      // Notify the popup that an action was completed
      chrome.runtime.sendMessage({
        type: 'ACTION_COMPLETED',
        index: i,
        total: sortedActions.length
      });
      
    } catch (error) {
      console.error(`Error executing action ${i}:`, action, error);
      
      // Notify the popup of the error
      chrome.runtime.sendMessage({
        type: 'PLAYBOOK_ERROR',
        error: `Action ${i + 1} failed: ${error.message}`
      });
      
      throw error; // Stop execution on error
    }
    
    lastTimestamp = action.timestamp;
  }
  
  // Notify the popup that all actions are complete
  chrome.runtime.sendMessage({
    type: 'PLAYBOOK_COMPLETE',
    total: sortedActions.length
  });
}

/**
 * Executes a single action on the page
 * @param {Object} action - The action to execute
 */
async function executeAction(action) {
  const { type, selector, value, inputType } = action;
  
  // Find the target element
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  
  // Scroll the element into view
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Execute the appropriate action type
  switch (type.toLowerCase()) {
    case 'click':
      await clickElement(element);
      break;
      
    case 'input':
      await inputValue(element, value, inputType);
      break;
      
    default:
      throw new Error(`Unsupported action type: ${type}`);
  }
  
  // Add a small delay after each action to allow the page to update
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Simulates a click on an element
 * @param {HTMLElement} element - The element to click
 */
async function clickElement(element) {
  // Focus the element first
  element.focus();
  
  // Create and dispatch mouse events to simulate a real click
  const mouseDownEvent = new MouseEvent('mousedown', {
    view: window,
    bubbles: true,
    cancelable: true
  });
  
  const mouseUpEvent = new MouseEvent('mouseup', {
    view: window,
    bubbles: true,
    cancelable: true
  });
  
  const clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true
  });
  
  element.dispatchEvent(mouseDownEvent);
  element.dispatchEvent(mouseUpEvent);
  element.dispatchEvent(clickEvent);
  
  // If it's a form element, also trigger a change event
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
    const changeEvent = new Event('change', {
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(changeEvent);
  }
}

/**
 * Sets a value on an input element
 * @param {HTMLElement} element - The input element
 * @param {string} value - The value to set
 * @param {string} inputType - The type of input (text, button, etc.)
 */
async function inputValue(element, value, inputType) {
  if (!element) {
    throw new Error('Element not found');
  }
  
  // Focus the element
  element.focus();
  
  // Set the value directly
  element.value = value;
  
  // Trigger input and change events to simulate real user input
  const inputEvent = new Event('input', {
    bubbles: true,
    cancelable: true
  });
  
  const changeEvent = new Event('change', {
    bubbles: true,
    cancelable: true
  });
  
  element.dispatchEvent(inputEvent);
  element.dispatchEvent(changeEvent);
  
  // For contenteditable elements
  if (element.isContentEditable) {
    element.textContent = value;
    element.dispatchEvent(inputEvent);
  }
}
