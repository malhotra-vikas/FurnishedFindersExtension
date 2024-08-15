import json
import os
import boto3
import logging

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)  # You can adjust this to DEBUG if needed

# Initialize the SQS client
sqs = boto3.client("sqs", region_name="us-east-2")  # Change 'us-east-1' to your region

# Securely load API keys and sensitive data from environment variables
WEAK_CURSE_WORDS = os.getenv("WEAK_CURSE_WORDS")
STRONG_CURSE_WORDS = os.getenv("STRONG_CURSE_WORDS")
QUEUE_URL = os.getenv(
    "MODERATION_MESSAGES_QUEUE_URL"
)  # Make sure to set this in your .env file


def send_message_to_queue(message_body):
    status = ""
    
    try:
        response = sqs.send_message(
            QueueUrl=QUEUE_URL,
            MessageBody=message_body,
            MessageGroupId="YourMessageGroupID",  # Add this line to specify the message group ID
        )
        logger.info("Message sent to SQS Queue: %s", response.get("MessageId"))
        return "Message Queued for Moderation", 200
    except boto3.exceptions.Boto3Error as e:
        logger.error("AWS SDK error: %s", str(e))
        return "Message failed to Queue", 500
    except Exception as e:
        logger.error("Failed to send message to SQS: %s", str(e))
        return "Message failed to Queue", 500


def lambda_handler(event, context):
    body = json.loads(event.get("body", "{}"))
    moderationText = body.get("text", "")

    message_body = json.dumps({"text": moderationText})
    status_message, status_code = send_message_to_queue(message_body)
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"message": status_message}),
    }