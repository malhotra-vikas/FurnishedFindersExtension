// content.js
document.addEventListener('DOMContentLoaded', () => {
    logMessage('Content script loaded on: ' + window.location.href);

    if (window.location.href.includes('members/messages')) {
        logMessage("Starting to reply and print chat history");
    
        // Print everything in the div with id "divChatHistory"
        // Delay execution to ensure the content is fully loaded
        setTimeout(() => {
            printChatHistory();
        }, 2000);  // Adjust delay time as necessary
    
        logMessage("Done printing chat history");

        //insertReplyMessageAndCloseTab();

    }

    // Select the message list container
    const messageList = document.getElementById('messageList');

    if (messageList) {
        // Select all individual message containers
        const messageContainers = messageList.querySelectorAll('.card.mb-3.p-4');

        messageContainers.forEach((container) => {
            const titleElement = container.querySelector('.msg-username a');
            const timeElement = container.querySelector('.OtimeSpan');
            const descriptionElement = container.querySelector('.tenant-msg-description');

            const message = {
                title: titleElement ? titleElement.innerText.trim() : 'No title',
                time: timeElement ? timeElement.innerText.trim() : 'No time',
                description: descriptionElement ? descriptionElement.innerText.trim() : 'No description'
            };

            logMessage(message);
        });
    } else {
        console.error('Message list container not found!');
    }
});

function printChatHistory() {
    const chatHistoryDiv = document.getElementById('divChatHistory');

    if (chatHistoryDiv) {
        console.log('divChatHistory found:', chatHistoryDiv);

        // Select all elements with the class "msg-wrap" within the chat history
        const messageElements = chatHistoryDiv.querySelectorAll('.msg-wrap');
        console.log('Number of .msg-wrap elements found: ' + messageElements.length);

        let fullChatHistory = '';

        messageElements.forEach((element) => {
            // Extract the username
            const userName = element.querySelector('.uname a')?.innerText.trim() || 'Unknown User';

            // Extract the message content
            const messageContent = element.querySelector('.message-content')?.innerText.trim() || 'No message content';

            // Extract the message time
            const messageTime = element.querySelector('.m-time')?.innerText.trim() || 'No time';

            // Append the extracted information to the full chat history string
            fullChatHistory += `User: ${userName}\nTime: ${messageTime}\nMessage: ${messageContent}\n\n`;
        });

        console.log('Full Chat History:');
        console.log(fullChatHistory);  // Log the entire chat history
    } else {
        console.error('Chat history div not found!');
    }
}
// Delay the execution to allow time for the content to load
//setTimeout(printChatHistory, 5000);  // Delay of 5 seconds (5000 milliseconds)

function insertReplyMessageAndCloseTab() {

    // Define a function that attempts to find the textarea and insert the message
    function attemptInsert(retryCount = 0) {
        const replyTextBox = document.getElementById('NewReply');
        const sendButton = document.getElementById('btnSend');
        const chatHistoryDiv = document.getElementById('divChatHistory');
        const messageElements = chatHistoryDiv ? chatHistoryDiv.querySelectorAll('.message-content') : [];

        logMessage('Number of messages elements found: ' + messageElements.length);
        let bookingRequestInfoMatch = false
        let inquiryRequestInfoMatch = false
        let alternateBookingRequestInfoMatch = false

        // Check if there are any message elements before trying to access them
        if (messageElements.length > 0) {
            // Access the last message element and retrieve its text content
            const lastMessage = messageElements[messageElements.length - 1].textContent.trim();
            logMessage('Printing the most recent message: ' + lastMessage);

            bookingRequestInfoMatch = lastMessage.includes("sent a Booking Request and is interested in booking your property")
            logMessage('Is bookingRequest: ' + bookingRequestInfoMatch);

            inquiryRequestInfoMatch = lastMessage.includes("following traveler has inquired about your property")
            logMessage('Is inquiryRequestInfoMatch: ' + inquiryRequestInfoMatch);

            alternateBookingRequestInfoMatch = lastMessage.includes("They will be traveling to")
            logMessage('Is alternateBookingRequestInfoMatch: ' + alternateBookingRequestInfoMatch);
        } else {
            // Log a message if no message elements were found
            logMessage('No messages found.');
        }

        if (replyTextBox && sendButton && (bookingRequestInfoMatch || alternateBookingRequestInfoMatch)) {
            replyTextBox.value = "Hi there!\n\nThank you for reaching out to StayRN with your booking request. We specialize in providing comfortable, fully furnished housing for travel nurses and healthcare professionals in the Denver Metro area. Our team is dedicated to making your stay as seamless and enjoyable as possible.\n\nWe have received your message and will get back to you shortly to assist you further.\n\nWarm regards,\nThe StayRN Team";

            logMessage('Message inserted successfully.');

            // Simulate a click on the "Send" button
            sendButton.click();
            logMessage('Send button clicked.');

            // Close the tab after the message is inserted
            chrome.runtime.sendMessage({ action: 'closeTab' });
        } else if (replyTextBox && sendButton && inquiryRequestInfoMatch) {
            replyTextBox.value = "Hi there!\n\nThank you for reaching out to StayRN with your inquiry. We specialize in providing comfortable, fully furnished housing for travel nurses and healthcare professionals in the Denver Metro area. Our team is dedicated to making your stay as seamless and enjoyable as possible.\n\nWe have received your message and will get back to you shortly to assist you further.\n\nWarm regards,\nThe StayRN Team";

            logMessage('Message inserted successfully.');

            // Simulate a click on the "Send" button
            sendButton.click();
            logMessage('Send button clicked.');

            // Close the tab after the message is inserted
            chrome.runtime.sendMessage({ action: 'closeTab' });
        } else if (replyTextBox && sendButton && (!inquiryRequestInfoMatch && !bookingRequestInfoMatch && !alternateBookingRequestInfoMatch)) {
            chrome.runtime.sendMessage({ action: 'closeTab' });            
        } else {
            if (retryCount < 5) {
                console.debug('Reply text box not found or no messages present. Retrying...');
                setTimeout(() => attemptInsert(retryCount + 1), 500);
            } else {
                console.debug('Failed to insert reply after several attempts.');
            }
        }

        if (messageElements.length > 1) {
            // Close the tab after the message is inserted
//            chrome.runtime.sendMessage({ action: 'closeTab' });            
        }        
    }
    setTimeout(attemptInsert, 1000);

}


function extractMessagesAndOpenTabs() {
    logMessage('Extracting Messages and Opening Tabs');

    const messageElements = document.querySelectorAll('.card.mb-3.p-4'); // Update this selector if needed
    const messageLinks = [];

    messageElements.forEach((messageElement) => {
        const link = messageElement.querySelector('.msg-username a')?.href;
        if (link) {
            messageLinks.push(link);
        }
    });

    // Open each message link in a new tab
    messageLinks.forEach((link) => {
        chrome.runtime.sendMessage({ action: 'openTab', url: link });
    });
    logMessage('Extracted all Messages and opened Tabs');

}

logMessage('Current URL: ' + window.location.href);

// Check if this is a message page by identifying a unique element on the page
if (window.location.href.includes('members/Tenant-Message')) {
    logMessage("Starting to open all message tabs")
    extractMessagesAndOpenTabs();
    logMessage("Opened all Tabs")
} else if (window.location.href.includes('members/messages')) {
    logMessage("Starting to reply and print chat history");

    // Print everything in the div with id "divChatHistory"
    printChatHistory();
    logMessage("Done printing chat history");

    insertReplyMessageAndCloseTab();
} else {
    logMessage("OLD Starting to reply")
    //insertReplyMessageAndCloseTab();
    logMessage("OLD Closed Tabs")
}


function logMessage(message) {
    chrome.runtime.sendMessage({ action: 'log', message: message });
}

