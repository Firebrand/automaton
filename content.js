// Content script for Automaton Chrome Extension
// Handles execution of playbook actions on web pages

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'executePlaybook') {
    executePlaybook(request.playbook)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Playbook execution error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

/**
 * Executes a playbook by running each action in sequence with proper timing
 * @param {Object} playbook - The playbook object containing actions to execute
 * @returns {Promise} - Promise that resolves when all actions are completed
 */
async function executePlaybook(playbook) {
  console.log('Starting playbook execution:', playbook);
  
  const actions = playbook.actions;
  if (!actions || actions.length === 0) {
    throw new Error('No actions found in playbook');
  }
  
  // Sort actions by timestamp to ensure proper order
  const sortedActions = [...actions].sort((a, b) => a.timestamp - b.timestamp);
  
  let previousTimestamp = null;
  
  // Execute each action in sequence
  for (let i = 0; i < sortedActions.length; i++) {
    const action = sortedActions[i];
    
    // Calculate delay based on timestamp difference
    if (previousTimestamp !== null) {
      const delay = action.timestamp - previousTimestamp;
      if (delay > 0) {
        console.log(`Waiting ${delay}ms before next action...`);
        await sleep(delay);
      }
    }
    
    // Execute the current action
    console.log(`Executing action ${i + 1}/${sortedActions.length}:`, action);
    await executeAction(action);
    
    previousTimestamp = action.timestamp;
  }
  
  console.log('Playbook execution completed successfully');
}

/**
 * Executes a single action on the current page
 * @param {Object} action - The action object containing type, selector, and value
 * @returns {Promise} - Promise that resolves when the action is completed
 */
async function executeAction(action) {
  const { type, selector, value, inputType } = action;
  
  // Find the target element using the selector
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Element not found for selector: ${selector}`);
  }
  
  // Scroll element into view to ensure it's visible
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Wait a bit for scrolling to complete
  await sleep(100);
  
  // Execute the action based on its type
  switch (type) {
    case 'click':
      await executeClickAction(element, action);
      break;
      
    case 'input':
      await executeInputAction(element, value, inputType);
      break;
      
    case 'ckeditor':
      await executeCKEditorAction(element, value);
      break;
      
    default:
      throw new Error(`Unsupported action type: ${type}`);
  }
  
  // Small delay after each action to allow page to respond
  await sleep(50);
}

/**
 * Executes a click action on an element
 * @param {Element} element - The DOM element to click
 * @param {Object} action - The action object with additional details
 * @returns {Promise} - Promise that resolves when click is completed
 */
async function executeClickAction(element, action) {
  // Ensure element is enabled and visible
  if (element.disabled) {
    throw new Error(`Cannot click disabled element: ${action.selector}`);
  }
  
  // Highlight element briefly to show what's being clicked
  highlightElement(element);
  
  // Create and dispatch click events
  const mouseDownEvent = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  
  const mouseUpEvent = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  
  // Dispatch events in proper sequence
  element.dispatchEvent(mouseDownEvent);
  await sleep(10);
  element.dispatchEvent(mouseUpEvent);
  await sleep(10);
  element.dispatchEvent(clickEvent);
  
  console.log(`Clicked element: ${action.selector}`);
}

/**
 * Executes an input action on an element
 * @param {Element} element - The DOM element to input text into
 * @param {string} value - The text value to input
 * @param {string} inputType - The type of input (text, etc.)
 * @returns {Promise} - Promise that resolves when input is completed
 */
async function executeInputAction(element, value, inputType) {
  // Focus the element first
  element.focus();
  
  // Highlight element briefly to show what's being typed into
  highlightElement(element);
  
  // Clear existing value
  element.value = '';
  
  // Dispatch input events for each character to simulate typing
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    
    // Add character to element value
    element.value += char;
    
    // Create and dispatch input event
    const inputEvent = new Event('input', {
      bubbles: true,
      cancelable: true
    });
    
    element.dispatchEvent(inputEvent);
    
    // Small delay between characters to simulate human typing
    await sleep(50);
  }
  
  // Dispatch change event after all input is complete
  const changeEvent = new Event('change', {
    bubbles: true,
    cancelable: true
  });
  
  element.dispatchEvent(changeEvent);
  
  console.log(`Input "${value}" into element: ${element.tagName}`);
}

/**
 * Executes a CKEditor action on an element
 * @param {Element} element - The CKEditor editable element
 * @param {string} value - The HTML content to set in the editor
 * @returns {Promise} - Promise that resolves when the content is set
 */
async function executeCKEditorAction(element, value) {
  // Highlight element briefly to show what's being edited
  highlightElement(element);

    chrome.runtime.sendMessage({ 
      action: 'executeInMainWorld',
      tabId: chrome.runtime.id // or get the actual tab ID
  });
  // Small delay to allow CKEditor to process the change
  await sleep(1000);
}

/**
 * Highlights an element briefly to show user interaction
 * @param {Element} element - The DOM element to highlight
 */
function highlightElement(element) {
  const originalStyle = element.style.cssText;
  
  // Apply highlight styling
  element.style.cssText += `
    outline: 3px solid #ff6b6b !important;
    outline-offset: 2px !important;
    background-color: rgba(255, 107, 107, 0.1) !important;
    transition: all 0.3s ease !important;
  `;
  
  // Remove highlight after a short delay
  setTimeout(() => {
    element.style.cssText = originalStyle;
  }, 500);
}

/**
 * Utility function to create a delay/sleep
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after the specified delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
