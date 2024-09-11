// background.js
chrome.runtime.onInstalled.addListener(() => {
    // Run the function initially when the extension is installed/loaded
    startPeriodicTask();
});

chrome.runtime.onStartup.addListener(() => {
    // Also run when the Chrome restarts
    startPeriodicTask();
});

function startPeriodicTask() {
    setInterval(() => {
        logMessage('Timer snooze over. Running the Extension');

        // Obtain all tabs with the specific URL
        chrome.tabs.query({url: "https://www.furnishedfinder.com/members/Tenant-Message*"}, function(tabs) {
            if (tabs.length > 0) {
                const tabId = tabs[0].id;
                chrome.scripting.executeScript({
                    target: {tabId: tabId},
                    files: ['content.js']
                }, () => {
                    // Check for errors in executing the script
                    if (chrome.runtime.lastError) {
                        console.error('Script injection failed:', chrome.runtime.lastError.message);
                    } else {
                        // Close the tab after the script is executed
                        chrome.tabs.remove(tabId, () => {
                            if (chrome.runtime.lastError) {
                                console.error('Failed to close tab:', chrome.runtime.lastError.message);
                            } else {
                                console.log('Tab closed successfully.');
                            }
                        });
                    }
                });
            } else {
                // If no tab is open, create a new tab and inject the script
                chrome.tabs.create({ url: "https://www.furnishedfinder.com/members/Tenant-Message" }, function(tab) {
                    chrome.scripting.executeScript({
                        target: {tabId: tab.id},
                        files: ['content.js']
                    });
                });
            }
        });
    }, 120000);  
}

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
