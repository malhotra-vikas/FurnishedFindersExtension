//const stripePaymentLink = "https://buy.stripe.com/test_bIY8zKcwI8Qb8c8eUU"
const stripePaymentLink = "https://buy.stripe.com/aEUeVadA11Oldu84gj"

document.addEventListener('DOMContentLoaded', function () {
    const subscriptionActive = true; // Set this based on your actual subscription logic

    const subscriptionMessage = document.getElementById('subscriptionStatus');
    if (subscriptionActive) {
        subscriptionMessage.innerHTML = 'Vera AI is ready to go!';
    } else {
        subscriptionMessage.innerHTML = 'Your trial expired. <a href="subscribe.html">Click here to subscribe</a>';
    }
});
