import os
from dotenv import load_dotenv
import openai
import json
import boto3
import requests

import subprocess
import http.client

# Load environment variables from .env file
load_dotenv()

# Securely load API keys and sensitive data from environment variables
WEAK_CURSE_WORDS = os.getenv("WEAK_CURSE_WORDS")
STRONG_CURSE_WORDS = os.getenv("STRONG_CURSE_WORDS")
API_KEY = os.getenv("MODERATOR_OPENAI_API_KEY")
QUEUE_URL = os.getenv("MODERATION_MESSAGES_QUEUE_URL")  # Make sure to set this in your .env file
webhook_url = os.getenv("WEEBHOOK_URL")  # Make sure to set this in your .env file
webhook_url = "https://webhook.site/5bfe06f1-0f72-4726-84b2-aaa0b70830f9"

# Initialize OpenAI client with the API key
client = openai.OpenAI(api_key=API_KEY)

def count_curses(text, weak_words, strong_words):
    """ Count weak and strong curse words in a given text. """
    weak_count = sum(1 for word in weak_words if word in text.lower())
    strong_count = sum(1 for word in strong_words if word in text.lower())
    return weak_count, strong_count

def evaluate_text_with_ai(text):
    print("Moderation started")

    """ Evaluate text for obscene content using OpenAI moderation API. """
    try:
        prompt = "You are a moderator that can evaluate any text for obscene content, insults and identify text that breaches a threshold."
        moderation_response = client.moderations.create(input=text)

        # Convert response to dictionary if necessary
        if isinstance(moderation_response, dict):
            moderation_dict = moderation_response
        else:
            moderation_dict = moderation_response.to_dict()

        # Log the moderation results
        print("Moderation results: %s", json.dumps(moderation_dict, indent=4))

        return moderation_dict
    except Exception as e:
        print("Failed to moderate text: %s", str(e))
        raise

# Initialize the SQS client
sqs = boto3.client('sqs', region_name='us-east-2')  # Change 'us-east-1' to your region

def receive_and_process_messages():
    while True:
        # Receive message from SQS queue
        response = sqs.receive_message(
            QueueUrl=QUEUE_URL,
            MaxNumberOfMessages=1,  # Adjust as needed
            WaitTimeSeconds=10  # Long polling
        )

        messages = response.get('Messages', [])
        if not messages:
            print("No messages to process.")
            continue

        for message in messages:
            try:
                text_to_check = message['Body']
                print("Received text:", text_to_check)
                ai_response = evaluate_text_with_ai(text_to_check)

                # Delete the message from the queue
                sqs.delete_message(
                    QueueUrl=QUEUE_URL,
                    ReceiptHandle=message['ReceiptHandle']
                )
                print("Message processed and deleted.")
                
                #Send the AI Message to webhook
                sendModerationResponseToUser(ai_response, webhook_url)
            except Exception as e:
                print(f"Failed to process message: {e}")

def sendModerationResponseToUser(data, webhook_url):
    try:
        headers = {'Content-Type': 'application/json'}  # Set the content-type header to application/json

        # Convert the data dictionary to a JSON string
        json_data = json.dumps(data)

        # Send the POST request
        response = requests.post(webhook_url, headers=headers, data=json_data)

        # Check the response
        if response.status_code == 200:
            print("Data sent successfully!")
        else:
            print("Failed to send data:", response.status_code, response.text)
        
    except Exception as e:
        print(f"An error occurred: {e}")
    

# Start listening to the queue if this script is run as main
if __name__ == "__main__":
    receive_and_process_messages()