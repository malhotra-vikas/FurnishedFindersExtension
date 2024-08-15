// popup.js
document.getElementById('extractMessages').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];

        chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content.js']
        }, () => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
            } else {
                logMessage('Script injected successfully.');
            }
        });
    });
});

function logMessage(message) {
    chrome.runtime.sendMessage({ action: 'log', message: message });
}
