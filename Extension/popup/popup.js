// Replace with your OpenAI API key
const serp_apikey = "650fff0e2d9fa913680d78b803940d8ad3a1465260e0ab540a016fd7d9ae0155"
//const stripePaymentLink = "https://buy.stripe.com/test_bIY8zKcwI8Qb8c8eUU"
const stripePaymentLink = "https://buy.stripe.com/aEUeVadA11Oldu84gj"

const apiGatewayUrl = "https://q6bi91a3x8.execute-api.us-east-2.amazonaws.com/default/StoreVeraUsers"

const veraServerURL = "http://52.15.34.155:3000/api/search?quote="

document.addEventListener('DOMContentLoaded', function () {
    // Authenticate the user with Google
    authenticateUser();

});

async function sendNotification(notificationType, email) {
    const url = 'https://q6bi91a3x8.execute-api.us-east-2.amazonaws.com/default/NotificationQueueAppender';

    let payload

    if (notificationType === "trial-expired-2-day-reminder") {
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

        payload = {
            notificationType: notificationType,
            email: email,
            delayDate: twoDaysFromNow.toISOString().split('T')[0] // Format as YYYY-MM-DD
        };
    } else {
        payload = {
            notificationType: notificationType,
            email: email,
        };
    }
    console.log("Calling ", url + " with payload - ", payload)

    try {
        const response = await fetch(url, {
            method: 'POST',
            mode: 'no-cors', // Important: This enables no-cors mode
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });


        // You cannot read or check the response in no-cors mode
        console.log('Message sent successfully (no-cors mode, response cannot be read).');
        return { status: 'success', message: 'Request sent in no-cors mode.' };
        
    } catch (error) {
        console.error('Error sending message:', error);
        return { status: 'error', message: 'Failed to send request.' };
    }
}

async function storeUserEmail(email) {
    const trialCredits = '5';

    fetch(apiGatewayUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, timestamp: new Date().toISOString(), subscription_status: "New User", credits: trialCredits })
    })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

function authenticateUser() {
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
        const authStatusElement = document.getElementById('auth-status');
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
        } else {
            // Retrieve the user's profile information
            getUserInfo();
        }
    });
}

async function checkUserSubscription(email) {
    try {
        const response = await fetch(`${apiGatewayUrl}?email=${email}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        // User does not exist, create user
        if (data == "User not found") {
            await storeUserEmail(email);
            await sendNotification("new-user", email)
        } else {
            console.log("data.subscription_status is - ", data.subscription_status)
            // User exists. // In Trial
            if (data.subscription_status !== 'active') {
                const userCredits = parseInt(data.credits, 10); // Convert userCredits to an integer

                if (userCredits == 0) { // In Trial. Credits Available.
                    console.log('Free Trial exipred');

                    // Notif for Trial Expired    
                    await sendNotification("trial-expired", email)

                    hideLoadingScreen(); // Hide the loading screen
                    
                    // Notif for 2 days post Trial Expired Notif
                    await sendNotification("trial-expired-2-day-reminder", email)


                    // Apply blur effect
                    //document.querySelector('.content').classList.add('blurred');

                    // Redirect to Stripe payment link
                    //const paymentLink = stripePaymentLink;
                    //chrome.tabs.create({ url: paymentLink });
                    // Redirect to intermediate Subscription page
                    const subscriptionPageUrl = chrome.runtime.getURL('new-subscription.html');
                    console.log('subscriptionPageUrl is', subscriptionPageUrl);

                    // Navigate to the subscription page within the same popup window
                    window.location.href = subscriptionPageUrl + "?prefilled_email=" + encodeURIComponent(email);

                    //window.open(subscriptionPageUrl, 'Vera Subscriptions', 'width=450,height=800');

                } else {
                    console.log('Free Trial in effect and active. Credits available ', userCredits);
                    decrementUserCredits(email)
                }
            }

            // User exists. // On Standard Plan
            if (data.subscription_status == 'active') {
                console.log('Subscription is active');
                const userCredits = parseInt(data.credits, 10); // Convert userCredits to an integer
                const subscriptionDate = data.subscription_date
                console.log('subscriptionDate is ', subscriptionDate);

                const nextBillingDate = getNextBillingDate(subscriptionDate)
                console.log('nextBillingDate is ', nextBillingDate);

                if (userCredits <= 0) { // In Trial. Credits Available.
                    console.log('Used up all credits in standard plan');

                    const ranOutOfCreditsPageUrl = chrome.runtime.getURL('ran-out-of-credits.html');
                    console.log('ranOutOfCreditsPageUrl is', ranOutOfCreditsPageUrl);

                    // Navigate to the subscription page within the same popup window
                    window.location.href = ranOutOfCreditsPageUrl + "?prefilled_date=" + encodeURIComponent(nextBillingDate);
                }

                decrementUserCredits(email)
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function getNextBillingDate(subscriptionDate) {
    const dateParts = subscriptionDate.split('/'); // assuming mm/dd/yyyy format
    let month = parseInt(dateParts[0], 10);
    let day = parseInt(dateParts[1], 10);
    let year = parseInt(dateParts[2], 10);

    const subscriptionDay = new Date(year, month - 1, day); // JavaScript months are 0-indexed
    let nextBillingDate = new Date(year, month, day);

    // Check if the current date is past the subscription day in the current month
    if (new Date() >= nextBillingDate) {
        // Move to the next month
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    // Handle the edge case for months with fewer days
    while (nextBillingDate.getMonth() === (subscriptionDay.getMonth() + 1) % 12 && nextBillingDate.getDate() !== subscriptionDay.getDate()) {
        nextBillingDate.setDate(nextBillingDate.getDate() - 1);
    }

    return nextBillingDate.toLocaleDateString(); // returns the date in mm/dd/yyyy format by default
}
function getUserInfo() {
    chrome.identity.getAuthToken({ interactive: false }, function (token) {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError);
            return;
        }

        // Construct the API request
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);


        xhr.onload = function () {
            if (xhr.status === 200) {
                // Parse the user info JSON
                const userInfo = JSON.parse(xhr.responseText);
                const emailElement = document.getElementById('user-email');
                if (userInfo.email) {
                    //emailElement.textContent = `${userInfo.email}`;
                    checkUserSubscription(userInfo.email);
                } else {
                    emailElement.textContent = 'Email not available';
                }
            } else {
                console.error(`Failed to fetch user info: ${xhr.statusText}`);
            }
        };

        xhr.onerror = function () {
            console.error('Network error');
        };

        xhr.send();
    });

    initializePopupContent()
}

// Function to extract domain from URL for easier comparison
function extractDomain(url) {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
}

function updateSourceUrl(pageUrl) {
    const urlElement = document.getElementById('url');
    urlElement.innerHTML = ''; // Clear existing content

    // Create the bullet image element

    // Create the anchor element for the URL
    const urlLink = document.createElement('a');
    urlLink.href = pageUrl;
    if (pageUrl.length > 35) {
        urlLink.textContent = pageUrl.substring(0, 35) + '...'; // Limit text to 30 characters and add ellipsis
    } else {
        urlLink.textContent = pageUrl; // Set the full source text if it's 30 characters or less
    }
    //urlLink.textContent = pageUrl;
    urlLink.target = '_blank'; // Open link in a new tab

    // Append the bullet image and URL link to the div
    urlElement.appendChild(urlLink);
}

function initializePopupContent() {
    // Retrieve the selected text from storage
    chrome.storage.local.get(['selectedText', 'url'], async function (result) {
        let selectedText = result.selectedText;
        const pageUrl = result.url;

        if (selectedText) {
            // Clean the selectedText from storage
            chrome.storage.local.remove('selectedText', function () {
                console.log('Selected text has been cleared from storage.');
            });
            console.log("Running verification for - ", selectedText)

            const sentences = selectedText.split('.')
            if (sentences && sentences.length === 1) {
                selectedText = selectedText.trim()
            } else {
                selectedText = sentences[0].trim()
            }

            const wordInSentences = selectedText.split(' ')
            let selectedTextFoDisplay = selectedText

            // Populate the popup with dynamic data
            updateSourceUrl(pageUrl)
            console.log("Updated pageUrl as - ", pageUrl)

            //        document.getElementById('url').innerText = pageUrl;

            if (wordInSentences.length > 25) {
                // Join the first 25 words and add an ellipsis
                selectedTextFoDisplay = wordInSentences.slice(0, 25).join(' ') + '...';
            } else {
                selectedTextFoDisplay = selectedText
            }
            document.getElementById('quote').innerText = '"' + selectedTextFoDisplay + '"';;

            // Call the function to update the popup with dynamic data
            updateDynamicData(selectedText);

        } else {
            console.log('No text selected or text is empty.');
            hideLoadingScreen(); // Hide the loading screen
        }
    });
}

async function updateDynamicData(selectedText) {
    // Load necessary data
    const [matchedCategory, categoryDataResponse] = await Promise.all([
        evaluateCategory(selectedText),
        fetch('../categoryDictionary.json')
    ]);
    const categoryData = await categoryDataResponse.json();

    // Determine allowed sites based on the matched category
    const allowedSitesSet = new Set();
    const allowedSitesMap = new Map();
    let categorySitesWeight = 0
    let categorySitesCount = 0

    let categoryInMatch = ""

    for (const [category, details] of Object.entries(categoryData)) {
        let matchedAtLeastOneCategory = false;

        if (category === matchedCategory && !matchedAtLeastOneCategory) {

            for (const siteName of Object.values(details)) {
                allowedSitesSet.add(extractDomain(siteName.URL));
                const domain = extractDomain(siteName.URL);
                allowedSitesMap.set(domain, siteName.Weight);
                categorySitesWeight = categorySitesWeight + siteName.Weight
                categorySitesCount = categorySitesCount + 1;

            }
            if (category === matchedCategory) matchedAtLeastOneCategory = true;
            categoryInMatch = matchedCategory
        }
    }

    console.log("allowedSitesSet is ", allowedSitesSet)

    const jsonData = await evaluateAccuracy(selectedText, [...allowedSitesSet]);
    console.log("evaluateAccuracy JSON Data is ", jsonData)

    let verifiedSitesCount = 0, collatedSnippet = "";

    const verifiedSourceSet = new Set();
    let jsonDataLength = 0
    let verifiedSitesWeight = 0

    let boosterAdded = false
    let boosterScoreAddition = 0;

    if (jsonData && jsonData.length > 0) {
        jsonDataLength = jsonData.length
        jsonData.forEach(({ link, snippet }) => {
            let boosterWeightPointer = 0
            const resultDomain = extractDomain(link);
            if (allowedSitesSet.has(resultDomain)) {
                verifiedSitesCount++;
                collatedSnippet += snippet + "  ";
                verifiedSourceSet.add(link);
                boosterWeightPointer = allowedSitesMap.get(resultDomain)

                verifiedSitesWeight = verifiedSitesWeight + allowedSitesMap.get(resultDomain)
                console.log("boosterWeightPointer for link = ", link, " is ", boosterWeightPointer)

                if (boosterWeightPointer >= 0.7) {
                    console.log("Booster Handling for link = ", link)
                    console.log("Booster Handling for this link's weight = ", boosterWeightPointer)

                    if (!boosterAdded) {
                        console.log("Adding booster for 50%")
                        boosterAdded = true
                        boosterScoreAddition = boosterScoreAddition + 50
                    } else {
                        boosterScoreAddition = boosterScoreAddition + 10
                    }
                }
            }
        });
    }
    console.log("The collatedSnippet is ", collatedSnippet)
    console.log("The verifiedSourceSet = ", verifiedSourceSet)
    console.log("The verifiedSiteWeight is = ", verifiedSitesWeight)
    console.log("The categorySitesWeight is = ", categorySitesWeight)
    console.log("The categoryInMatch is = ", categoryInMatch)
    console.log("The total categorySites Count is = ", categorySitesCount)
    console.log("The boosterScoreAddition is = ", boosterScoreAddition)


    // Summarize snippets and update UI
    const summary = await summarizeSnippets(collatedSnippet);
    updateUI(verifiedSitesCount, jsonDataLength, summary, verifiedSourceSet, categorySitesWeight, verifiedSitesWeight, categorySitesCount, boosterScoreAddition);
}

// Function to update the source list in the UI
function updateSourceList(verifiedSources, categorySitesCount) {
    const sourceListElement = document.getElementById('source-list');
    if (sourceListElement) {
        sourceListElement.innerHTML = ''; // Clear existing entries
    }
    let sourceCount = 0

    verifiedSources.forEach(source => {
        sourceCount = sourceCount + 1
        const div = document.createElement('div');
        div.className = 'verascreen-group'

        const span = document.createElement('span')
        span.className = 'verascreen-text10'

        // Create an anchor element to make the source clickable
        const a = document.createElement('a');
        a.href = source; // Set the href to the source URL or any action you want to trigger
        // Check if the source text is longer than 30 characters
        if (source.length > 30) {
            a.textContent = source.substring(0, 30) + '...'; // Limit text to 30 characters and add ellipsis
        } else {
            a.textContent = source; // Set the full source text if it's 30 characters or less
        }
        a.target = "_blank"; // Ensures the link opens in a new window/tab

        span.appendChild(a); // Append the anchor to the span

        const img = document.createElement('img');
        img.src = "../public/external/results/dot29289-9u2-200h.png"
        img.className = 'verascreen-dot2'

        div.appendChild(img)
        div.appendChild(span)


        if (sourceListElement) {
            sourceListElement.appendChild(div);
        }

        const element = document.querySelector('.verascreen-text28');
        tempTop = computeTop(sourceCount)
        element.style.top = tempTop + 'px';

        // Wait for the next frame so that the style updates are rendered.
        requestAnimationFrame(() => {
            // Get the bounding client rectangle of the element.
            const elementRect = element.getBoundingClientRect();

            // Use the top value from the bounding rectangle.
            const elementTop = elementRect.top;
            const elementBottom = elementRect.bottom;
        });

    });

    // Update verified sources count
    //const verifiedCountElement = document.getElementById('verified-count');
    //const categorySitesCountElement = document.getElementById('total-sources-count');

    //verifiedCountElement.textContent = verifiedSources.size;
    //categorySitesCountElement.textContent = categorySitesCount;
}

// Example function to compute top based on some condition
function computeTop(sourceCount) {
    console.log("sourceCount is - ", sourceCount)
    computedTop = 0
    if (sourceCount<3) {
        computedTop = 550
    } else {
        computedTop = 550 + 35*(sourceCount-2)
    }
    console.log("computedTop is - ", computedTop)

    return computedTop

}

function updateUI(verifiedCount, totalCount, summary, verifiedSourceSet, categorySitesWeight, verifiedSitesWeight, categorySitesCount, boosterScoreAddition) {

    if (verifiedSourceSet.size > 0) {
        updateSourceList(verifiedSourceSet, categorySitesCount);
    } else {
        console.log("No verified sources found.");
    }

    let accuracyScore

    if (categorySitesWeight == 0) {
        accuracyScore = 0
    } else {
        accuracyScore = totalCount > 0 ? Math.round((verifiedSitesWeight / categorySitesWeight) * 100) : 0;
        accuracyScore = accuracyScore + boosterScoreAddition
    }

    if (accuracyScore > 100) {
        accuracyScore = 99
    }

    console.log("Accuracy Score computed as ", accuracyScore)
    if (accuracyScore == 0) {

        hideLoadingScreen(); // Hide the loading screen

        const errorPageUrl = chrome.runtime.getURL('error-index.html');
        console.log('errorPageUrl is', errorPageUrl);

        // Navigate to the subscription page within the same popup window
        window.location.href = errorPageUrl;
    }

    document.getElementById('accuracy-score').innerText = `${accuracyScore}%`;
    document.getElementById('summary').innerHTML = `<b>${verifiedCount}</b> verified source(s). ${summary}`;

    updateScoreCircle(accuracyScore);
    hideLoadingScreen(); // Hide the loading screen

}

function updateScoreCircle(score) {
    const degrees = (score / 100) * 360; // Convert score to degrees
    const circle = document.querySelector('.circle');

    if (score >= 80) {
        circle.style.background = `conic-gradient(green 0deg, green ${degrees}deg, white ${degrees}deg, white 360deg)`;
    } else if (score >= 50) {
        circle.style.background = `conic-gradient(yellow 0deg, yellow ${degrees}deg, white ${degrees}deg, white 360deg)`;
    } else {
        circle.style.background = `conic-gradient(red 0deg, red ${degrees}deg, white ${degrees}deg, white 360deg)`;
    }


    const scoreCircleCSS = document.getElementById('accuracy-score').parentNode;
    //scoreCircleCSS.style.borderColor = score >= 80 ? '#4caf50' : score >= 50 ? '#ffeb3b' : '#f44336';
}

// Function to hide the loading screen
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.style.display = 'none';
}

// Function to update the loading percentage
function updateLoadingPercentage() {
    const loadingPercentage = document.getElementById('loading-percentage');
    let percentage = 0;
    const interval = setInterval(() => {
        percentage += 1;
        loadingPercentage.textContent = `${percentage}%`;
        if (percentage === 100) {
            clearInterval(interval);
        }
    }, 20); // Adjust the interval time to control speed
}

function decrementUserCredits(email) {

    fetch(apiGatewayUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, timestamp: new Date().toISOString() })
    })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

async function evaluateCategory(quote) {
    // Load JSON data from the local extension directory
    const responseJSON = await fetch('../categoryDictionary.json');
    const categoryData = await responseJSON.json();

    // Extract all URLs from the JSON data
    const allowedSites = [];
    const allCategories = [];
    for (const category in categoryData) {
        allCategories.push(category);
    }

    try {
        // OpenAI API endpoint
        const url = 'https://api.openai.com/v1/chat/completions';

        let prompt = `What is the category of this statemnent:\n\n${quote}\n\nPick one Category from among these categories: ${allCategories.join(', ')}. Only return the name of the Category`;

        console.debug("OpenAI API prompt: ", prompt);

        const body = JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful assistant that can find the right category that and text belong to" },
                { role: "user", content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.2 // Reduce randomness for more consistent results            
        });

        console.debug("OpenAI API Body: ", JSON.stringify(body, null, 2));

        // Request headers
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openai_apiKey}`
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        let matchedCategory
        console.debug("OpenAI API responseData: ", JSON.stringify(responseData, null, 2));

        if (responseData && responseData.choices) {
            matchedCategory = responseData.choices[0].message.content
            // Remove Markdown code block syntax to isolate the JSON string
            matchedCategory = matchedCategory.replace(/```json\n|\n```/g, '');

            console.debug("OpenAI API verifiedResponseData String: ", matchedCategory);
        }

        return matchedCategory;

    } catch (error) {
        console.error("Error fetching OpenAI API response:", error);
        return 'Error summarizing the text.';
    }
}
async function summarizeSnippets(collatedSnippet) {
    if (!collatedSnippet.trim()) {
        console.debug("No content to summarize.");
        return "No additional information available."; // Or any appropriate default message
    }

    const url = 'https://api.openai.com/v1/chat/completions';

    let prompt = `Summarize this with no more than 15 words:\n\n${collatedSnippet}`;

    console.debug("OpenAI API prompt: ", prompt);

    const body = JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "You are a helpful assistant that summarizes information in 30 words." },
            { role: "user", content: prompt }
        ],
        max_tokens: 200
    });

    console.debug("OpenAI API Body: ", JSON.stringify(body, null, 2));

    // Request headers
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openai_apiKey}`
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    let verifiedResponseData
    let jsonData
    console.debug("OpenAI API responseData: ", JSON.stringify(responseData, null, 2));

    if (responseData && responseData.choices) {
        verifiedResponseData = responseData.choices[0].message.content
        // Remove Markdown code block syntax to isolate the JSON string
        verifiedResponseData = verifiedResponseData.replace(/```json\n|\n```/g, '');

        console.debug("OpenAI API verifiedResponseData String: ", verifiedResponseData);
    }

    if (jsonData) [
        console.debug("OpenAI API jsonData to process : ", JSON.stringify(jsonData, null, 2))
    ]

    return verifiedResponseData;
}
async function evaluateByOpenAI(quote, allowedSites) {
    const url = 'https://api.openai.com/v1/chat/completions';

    let prompt = `Verify authenticity of this statement:\n\n${quote}\n\nInclude the count of sites where the information was verified as well as how many sites you checked. Only use these sites: ${allowedSites.join(', ')}`;

    console.debug("OpenAI API prompt: ", prompt);

    const body = JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "You are a helpful assistant that verifies information by citing multiple sources. You only return a JSON response" },
            { role: "user", content: `Verify authenticity of this statement:: Supreme Court appears to side with Biden admin in abortion case, according to draft briefly posted on website. Include the count of sites where the information was verified as well as how many sites you checked. Include the count of sites where the information was verified as well as how many sites you checked. ` },
            {
                role: "system", content: `{
    "checkedSites": [
        "site url",
        "site url",
        "site url",
        "site url"
    ],
    "verificationDetails": [
        {
            "source": "SOme Site 1",
            "verified": "True"
            "details": "Reports indicate that the Supreme Court seems poised to side with the Biden administration on a key abortion-related case concerning the Emergency Medical Treatment and Labor Act (EMTALA)."
        },
        {
            "source": "SOme Site 2",
            "verified": "False"
        },
        {
            "source": "SOme Site 3",
            "verified": "True"
            "details": "Highlighted that the Supreme Court appeared likely to support the Biden administration in this dispute."
        }
    ],
    "sitesChecked": 6,
    "sitesVerified": 4,
    "summary": "The Supreme Court appears to side with Biden admin in a key abortion case. Information verified across multiple credible sources."
}`},
            { role: "user", content: prompt }
        ],
        max_tokens: 1200
    });

    console.debug("OpenAI API Body: ", JSON.stringify(body, null, 2));

    // Request headers
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openai_apiKey}`
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    let verifiedResponseData
    let jsonData
    console.debug("OpenAI API responseData: ", JSON.stringify(responseData, null, 2));

    if (responseData && responseData.choices) {
        verifiedResponseData = responseData.choices[0].message.content
        // Remove Markdown code block syntax to isolate the JSON string
        verifiedResponseData = verifiedResponseData.replace(/```json\n|\n```/g, '');

        console.debug("OpenAI API verifiedResponseData String: ", verifiedResponseData);

        jsonData = JSON.parse(verifiedResponseData);
    }

    if (jsonData) [
        console.debug("OpenAI API jsonData to process : ", JSON.stringify(jsonData, null, 2))
    ]

    return jsonData;
}

async function evaluateBySERP(quote, allowedSites) {
    // Construct the full URL with encoded parameters
    //    const url = `${baseUrl}?${encodeParams(params)}`;
    const url = `${veraServerURL}${encodeURIComponent(quote)}`;

    console.log('URL being fetched:', url);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }
        let jsonData
        const data = await response.json();
        const newsResults = data.news_results;

        if (newsResults && newsResults.length > 0) {
            jsonData = newsResults
        } else {
            jsonData = null
        }

        return jsonData;  // Return the data directly
    } catch (error) {
        console.error('Error:', error);
        throw error;  // Rethrow to be handled by caller
    }
}

async function evaluateAccuracy(quote, allowedSites) {
    let results

    try {

        results = await evaluateBySERP(quote, allowedSites)

        // let jsonData = evaluateByOpenAI(quote, allowedSites)
    } catch (error) {
        results = null
        console.error("Error fetching OpenAI API response:", error);
    }
    return results;  // Return the results directly from SERP
}
