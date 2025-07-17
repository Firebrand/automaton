chrome.runtime.onMessage.addListener((message, sender) => {
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
    }
});