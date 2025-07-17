chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'executeInMainWorld') {
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            world: 'MAIN',
            func: () => {
                // Polling function to wait for CKEditor instance
                function waitForEditor() {
                    const editable = document.querySelector('.ck-editor__editable');
                    if (editable && editable.ckeditorInstance) {
                        editable.ckeditorInstance.setData('Why <strong>hello</strong> there!');
                    } else {
                        setTimeout(waitForEditor, 100);
                    }
                }
                waitForEditor();
            }
        });
    }
});