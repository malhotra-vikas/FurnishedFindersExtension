import json
import uuid
import boto3

# Initialize SQS client
sqs = boto3.client("sqs")

# Environment variable for the SQS queue URL
SQS_QUEUE_URL = (
    "https://sqs.us-east-2.amazonaws.com/181270453232/emailNotification.fifo"
)

def lambda_handler(event, context):
    print("Event is", event)
    print("Event httpMethod is", event["httpMethod"])

    # Handle CORS preflight request
    if event["httpMethod"] == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": "",
        }
    
    body = event["body"]
    if body is None:
        return {
            "statusCode": 400,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type",
            "body": json.dumps("Missing body in request"),
        }
    print("body is", body)

    try:
        # Extract parameters from the API Gateway event
        body = json.loads(event["body"])
        notification_type = body.get("notificationType")
        email = body.get("email")
        delayedTrigger = body.get("delayDate")

        print("Adding notifs for - ", email)
        print("Adding notif type  - ", notification_type)
        print("Adding delayedTrigger as  - ", delayedTrigger)

        # Validate notificationType
        if notification_type not in [
            "new-user",
            "trial-expired",
            "trial-expired-2-day-reminder",
        ]:
            return {
                "statusCode": 400,
                "body": json.dumps("Invalid notificationType"),
            }

        # Generate a UUID for the message
        message_uuid = str(uuid.uuid4())

        # Prepare the message attributes
        message_body = {
            "UUID": message_uuid,
            "notificationType": notification_type,
            "email": email,
            "delayedTrigger": delayedTrigger
        }

        # Send the message to the SQS queue
        response = sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps(message_body),
            MessageGroupId="emailNotifications",  # Required for FIFO queues
            MessageDeduplicationId=message_uuid,  # Required for FIFO queues
        )
        print("Message sent successfully for - ", email)

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "message": "Message sent successfully",
                    "messageId": response["MessageId"],
                }
            ),
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps(f"Error sending message: {str(e)}"),
        }
