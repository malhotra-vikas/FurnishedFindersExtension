// background.js
chrome.action.onClicked.addListener((tab) => {
    logMessage('Extension icon clicked, opening Furnished Finder...');
    chrome.tabs.create({ url: "https://www.furnishedfinder.com/members/Tenant-Message" });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'log') {
        if (sender.tab) {
            console.log('Log from tab:', sender.tab.id, request.message);
        } else {
            console.log('Log from a non-tab context:', request.message);
        }
    } else if (request.action === 'openTab') {
        chrome.tabs.create({ url: request.url });
    } else if (request.action === 'closeTab') {
        if (sender.tab) {
            chrome.tabs.remove(sender.tab.id);
        } else {
            console.error('Cannot close tab: sender.tab is undefined');
        }
    }
});


function logMessage(message) {
    chrome.runtime.sendMessage({ action: 'log', message: message });
}
