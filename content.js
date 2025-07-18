// Content script for Automaton Chrome Extension
// Handles execution of playbook actions on web pages and recording user interactions

// Recording state
let isRecording = false;
let recordedActions = [];
let recordingStartTime = null;

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
  
  if (request.action === 'startRecording') {
    startRecording();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'stopRecording') {
    const actions = stopRecording();
    sendResponse({ success: true, actions: actions });
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
    // if (previousTimestamp !== null) {
    //   const delay = action.timestamp - previousTimestamp;
    //   if (delay > 0) {
    //     console.log(`Waiting ${delay}ms before next action...`);
    //     await sleep(delay);
    //   }
    // }
    
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
  const { type, selector, value, elementType } = action;
  
  // Find the target element using the selector
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Element not found for selector: ${selector}`);
  }
  
  // // Scroll element into view to ensure it's visible
  // element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // // Wait a bit for scrolling to complete
  // await sleep(100);
  
  // Execute the action based on its type
  switch (type) {
    case 'click':
      await executeClickAction(element, action);
      break;
      
    case 'input':
      await executeInputAction(element, value, elementType);
      break;
      
    case 'ckeditor':
      await executeCKEditorAction(element, selector, value);
      break;
      
    default:
      throw new Error(`Unsupported action type: ${type}`);
  }
  
  // Small delay after each action to allow page to respond
  await sleep(600);
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
 * @param {string} elementType - The type of element (text, etc.)
 * @returns {Promise} - Promise that resolves when input is completed
 */
async function executeInputAction(element, value, elementType) {
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
async function executeCKEditorAction(element, selector, value) {
  // Highlight element briefly to show what's being edited
  highlightElement(element);

  chrome.runtime.sendMessage({ 
    action: 'executeInMainWorld',
    selector: selector,
    value: value
  });
  // Small delay to allow CKEditor to process the change
  await sleep(100);
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

/**
 * Starts recording user interactions
 */
function startRecording() {
  if (isRecording) {
    return;
  }
  
  isRecording = true;
  recordedActions = [];
  recordingStartTime = Date.now();
  
  console.log('Recording started, isRecording:', isRecording);
  
  // Add event listeners for different types of interactions
  document.addEventListener('mousedown', handleRecordedMouseDown, true); // For elements where click is prevented
  document.addEventListener('input', handleRecordedInput, true);
  document.addEventListener('change', handleRecordedChange, true);
  
  // Add listener for CKEditor interactions
  observeCKEditorChanges();
}

/**
 * Stops recording user interactions
 * @returns {Array} - Array of recorded actions
 */
function stopRecording() {
  if (!isRecording) {
    return [];
  }
  
  isRecording = false;
  
  console.log('Recording stopped. Captured', recordedActions.length, 'actions');
  
  // Remove event listeners
  document.removeEventListener('mousedown', handleRecordedMouseDown, true);
  document.removeEventListener('input', handleRecordedInput, true);
  document.removeEventListener('change', handleRecordedChange, true);
  
  // Stop CKEditor observation
  stopCKEditorObservation();
  
  const actions = [...recordedActions];
  recordedActions = [];
  recordingStartTime = null;
  
  return actions;
}


/**
 * Handles recorded mousedown events
 * @param {Event} event - The mousedown event
 */
function handleRecordedMouseDown(event) {
  console.log('handleRecordedMouseDown called, isRecording:', isRecording);
  if (!isRecording) {
    console.log('Not recording, returning early (mousedown)');
    return;
  }
  
  const element = event.target;
  const elementType = element.type?.toLowerCase() || '';
  const validTypes = ['button', 'submit'];
  
  console.log('Mousedown detected:', {
    tagName: element.tagName,
    type: element.type,
    id: element.id,
    className: element.className,
    value: element.value
  });
  
  // Only proceed if the element has a defined type that's in our valid types list
  if (!elementType || !validTypes.includes(elementType)) {
    console.log('Skipping mousedown - invalid type:', elementType);
    return;
  }
  
  const selector = generateSelector(element);
  if (!selector) return;
  
  const action = {
    elementType,
    selector: selector,
    timestamp: Date.now(),
    type: 'click',
    value: element.textContent?.trim() || element.value || ''
  };
  
  recordedActions.push(action);
  
  // Send action to background script for persistent storage
  chrome.runtime.sendMessage({
    action: 'recordAction',
    actionData: action
  });
  
  console.log('Recorded mousedown as click:', action);
}

/**
 * Handles recorded input events
 * @param {Event} event - The input event
 */
function handleRecordedInput(event) {
  if (!isRecording) return;
  
  const element = event.target;

  const selector = generateSelector(element);

  console.log('Input detected:', {
    tagName: element.tagName,
    type: element.type,
    id: element.id,
    className: element.className,
    value: element.value
  });
  
  if (!selector) return;
  
  // Skip if this is a CKEditor element (handled separately)
  if (element.classList.contains('ck-editor__editable')) {
    return;
  }
  
  // Debounce input events to avoid recording every keystroke
  clearTimeout(element._inputTimeout);
  element._inputTimeout = setTimeout(() => {
    const action = {
      elementType: element.type || 'text',
      selector: selector,
      timestamp: Date.now(),
      type: 'input',
      value: element.value || ''
    };
    
    // Remove any previous input action for the same element
    recordedActions = recordedActions.filter(a => 
      !(a.type === 'input' && a.selector === selector)
    );
    
    recordedActions.push(action);
    
    // Send action to background script for persistent storage
    chrome.runtime.sendMessage({
      action: 'recordAction',
      actionData: action
    });
    
    console.log('Recorded input:', action);
  }, 500); // 500ms debounce
}

/**
 * Handles recorded change events
 * @param {Event} event - The change event
 */
function handleRecordedChange(event) {
  if (!isRecording) return;
  
  const element = event.target;

  console.log('Change detected:', {
    tagName: element.tagName,
    type: element.type,
    id: element.id,
    className: element.className,
    value: element.value
  });
  
  
  // Handle select elements
  if (element.tagName === 'SELECT') {
    const selector = generateSelector(element);
    if (!selector) return;
    
    const action = {
      elementType: 'select',
      selector: selector,
      timestamp: Date.now(),
      type: 'input',
      value: element.value
    };
    
    recordedActions.push(action);
    
    // Send action to background script for persistent storage
    chrome.runtime.sendMessage({
      action: 'recordAction',
      actionData: action
    });
    
    console.log('Recorded select change:', action);
  }
}

/**
 * Observes CKEditor changes
 */
let ckEditorObserver = null;
function observeCKEditorChanges() {
  console.log('🔍 Starting CKEditor observation...');
  
  // Look for CKEditor instances
  const ckEditors = document.querySelectorAll('.ck-editor__editable');
  console.log(`📝 Found ${ckEditors.length} existing CKEditor instances`);
  
  ckEditors.forEach((editor, index) => {
    console.log(`📝 Adding multiple event listeners to CKEditor ${index + 1}:`, editor);
    // Add multiple event listeners for CKEditor content changes
    editor.addEventListener('input', handleCKEditorInput);
    editor.addEventListener('keyup', handleCKEditorInput);
    editor.addEventListener('paste', handleCKEditorInput);
    editor.addEventListener('blur', handleCKEditorInput);
    editor.addEventListener('focus', (e) => console.log('🎯 CKEditor focused:', e.target));
    
    // Also use MutationObserver for this specific editor
    const editorObserver = new MutationObserver((mutations) => {
      console.log('🔄 CKEditor content mutation detected:', mutations.length, 'mutations');
      handleCKEditorInput({ target: editor, type: 'mutation' });
    });
    
    editorObserver.observe(editor, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // Store observer reference for cleanup
    editor._mutationObserver = editorObserver;
  });
  
  // Also observe for new CKEditor instances that might be added dynamically
  console.log('👀 Setting up MutationObserver for dynamic CKEditor detection...');
  ckEditorObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const newEditors = node.querySelectorAll('.ck-editor__editable');
          if (newEditors.length > 0) {
            console.log(`🆕 Detected ${newEditors.length} new CKEditor instances`);
            newEditors.forEach((editor, index) => {
              console.log(`📝 Adding multiple event listeners to new CKEditor ${index + 1}:`, editor);
              // Add multiple event listeners for CKEditor content changes
              editor.addEventListener('input', handleCKEditorInput);
              editor.addEventListener('keyup', handleCKEditorInput);
              editor.addEventListener('paste', handleCKEditorInput);
              editor.addEventListener('blur', handleCKEditorInput);
              editor.addEventListener('focus', (e) => console.log('🎯 New CKEditor focused:', e.target));
              
              // Also use MutationObserver for this specific editor
              const editorObserver = new MutationObserver((mutations) => {
                console.log('🔄 New CKEditor content mutation detected:', mutations.length, 'mutations');
                handleCKEditorInput({ target: editor, type: 'mutation' });
              });
              
              editorObserver.observe(editor, {
                childList: true,
                subtree: true,
                characterData: true
              });
              
              // Store observer reference for cleanup
              editor._mutationObserver = editorObserver;
            });
          }
        }
      });
    });
  });
  
  ckEditorObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ CKEditor observation setup complete');
}

/**
 * Stops CKEditor observation
 */
function stopCKEditorObservation() {
  if (ckEditorObserver) {
    ckEditorObserver.disconnect();
    ckEditorObserver = null;
  }
  
  // Remove event listeners from CKEditor instances
  const ckEditors = document.querySelectorAll('.ck-editor__editable');
  ckEditors.forEach(editor => {
    editor.removeEventListener('input', handleCKEditorInput);
  });
}

/**
 * Handles CKEditor input events
 * @param {Event} event - The input event from CKEditor
 */
function handleCKEditorInput(event) {
  console.log(`🎯 CKEditor ${event.type || 'unknown'} event triggered!`, {
    eventType: event.type,
    isRecording: isRecording,
    target: event.target,
    targetClass: event.target.className,
    targetId: event.target.id
  });
  
  if (!isRecording) {
    console.log('❌ Not recording, ignoring CKEditor input');
    return;
  }
  
  const element = event.target;
  console.log('📝 Processing CKEditor element:', element);
  
  const selector = generateSelector(element);
  console.log('🎯 Generated selector for CKEditor:', selector);
  
  if (!selector) {
    console.log('❌ No selector generated, aborting CKEditor recording');
    return;
  }
  
  console.log('⏱️ Setting up CKEditor debounce timer...');
  // Debounce CKEditor events
  clearTimeout(element._ckEditorTimeout);
  element._ckEditorTimeout = setTimeout(() => {
    console.log('🚀 CKEditor debounce timer fired, creating action...');
    
    const action = {
      elementType: 'ckeditor',
      selector: selector,
      timestamp: Date.now(),
      type: 'ckeditor',
      value: element.innerHTML || ''
    };
    
    console.log('📋 CKEditor action created:', action);
    
    // Remove any previous CKEditor action for the same element
    const beforeLength = recordedActions.length;
    recordedActions = recordedActions.filter(a => 
      !(a.type === 'ckeditor' && a.selector === selector)
    );
    const afterLength = recordedActions.length;
    
    if (beforeLength !== afterLength) {
      console.log(`🗑️ Removed ${beforeLength - afterLength} previous CKEditor actions`);
    }
    
    recordedActions.push(action);
    console.log(`📚 Total recorded actions: ${recordedActions.length}`);
    
    // Send action to background script for persistent storage
    chrome.runtime.sendMessage({
      action: 'recordAction',
      actionData: action
    });
    
    console.log('✅ Recorded CKEditor input:', action);
  }, 1000); // 1s debounce for CKEditor
}

/**
 * Generates a CSS selector for an element
 * @param {Element} element - The DOM element
 * @returns {string} - CSS selector string
 */
function generateSelector(element) {
  if (!element || element === document) return null;
  
  // Try ID first, but handle randomized suffixes after double dashes
  if (element.id) {
    // Check if ID has randomized suffix after double dashes
    if (element.id.includes('--')) {
      const stableId = element.id.split('--')[0];
      // Use partial ID matching for the stable part
      const selector = `[id^="${stableId}--"]`;
      return selector;
    } else {
      return `#${element.id}`;
    }
  }
  
  // Try unique attributes that might be useful
  const uniqueAttrs = ['data-drupal-selector', 'name', 'class'];
  
  for (const attr of uniqueAttrs) {
    const value = element.getAttribute(attr);
    if (value) {
      // For ID-like attributes, use them directly
      if (attr === 'data-drupal-selector' || attr === 'name') {
        const selector = `[${attr}="${value}"]`;
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
      
      // For class, try to find a unique combination
      if (attr === 'class') {
        const classes = value.split(' ').filter(c => c.trim());
        for (const cls of classes) {
          const selector = `.${cls}`;
          if (document.querySelectorAll(selector).length === 1) {
            return selector;
          }
        }
      }
    }
  }
  
  // Try to use partial ID matching for dynamic IDs (but skip if already handled double dashes above)
  if (element.id && element.id.includes('-') && !element.id.includes('--')) {
    const idParts = element.id.split('-');
    for (let i = 0; i < idParts.length; i++) {
      const partialId = idParts.slice(0, i + 1).join('-');
      const selector = `[id^="${partialId}"]`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }
  
  // Fallback to tag name with position
  const tagName = element.tagName.toLowerCase();
  const parent = element.parentElement;
  
  if (parent) {
    const siblings = Array.from(parent.children).filter(child => 
      child.tagName.toLowerCase() === tagName
    );
    
    if (siblings.length === 1) {
      return `${generateSelector(parent)} > ${tagName}`;
    } else {
      const index = siblings.indexOf(element);
      return `${generateSelector(parent)} > ${tagName}:nth-child(${index + 1})`;
    }
  }
  
  return tagName;
}
