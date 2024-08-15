import json
import os
import boto3
import base64

from datetime import datetime
import urllib.request
import urllib.parse

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('DelayedNotifications')  

# MailJet API credentials
MAILJET_API_KEY = os.environ['MAILJET_API_KEY']
#0e5ae949187df213d6b549e3f3244223

MAILJET_API_SECRET = os.environ['MAILJET_API_SECRET']
#17e02aabb69196cb23ef3d88102d218d

# Mapping of notification types to MailJet template IDs
TEMPLATE_ID_MAP = {
    'trial-expired': 6201628,  
    'trial-expired-2-day-reminder': 6201784,  
    'new-user': 6201244
}

# Function to write skipped emails to DynamoDB
def log_to_dynamodb(email, delayed_date):
    try:
        table.put_item(
            Item={
                'email': email,
                'delayedDate': delayed_date.strftime('%Y-%m-%d'),
                'timestamp': datetime.now().strftime('%Y-%m-%dT%H:%M:%S')  # Add timestamp for reference
            }
        )
        print(f"Logged skipped email to DynamoDB: {email} with delayed date {delayed_date}")
    except Exception as e:
        print(f"Error logging to DynamoDB: {e}")

def send_email_via_mailjet(to_email, template_id, variables):
    url = "https://api.mailjet.com/v3.1/send"
    
    # Correctly format the Authorization header
    auth_header = base64.b64encode(f"{MAILJET_API_KEY}:{MAILJET_API_SECRET}".encode('utf-8')).decode('utf-8')
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + auth_header
    }
    
    data = {
        'Messages': [
            {
                'From': {
                    'Email': 'david@usevera.ai',
                    'Name': 'David from Vera'
                },
                'To': [
                    {
                        'Email': to_email,
                        'Name': to_email.split('@')[0]  # Using the first part of the email as the name
                    }
                ],
                'TemplateID': template_id,
                'TemplateLanguage': True,
                'Variables': variables
            }
        ]
    }

    # Convert data to JSON and encode
    json_data = json.dumps(data).encode('utf-8')

    print("json_data being sent to MailJeyt is - ", json_data)
    
    # Create request object
    req = urllib.request.Request(url, data=json_data, headers=headers, method='POST')

    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print(f"Email sent successfully to {to_email}")
            else:
                print(f"Failed to send email. Status code: {response.status}")
    except urllib.error.URLError as e:
        print(f"Failed to send email. Error: {e.reason}")
        print(f"Failed to send email. Detailed Error: {e}")

# Function to scan DynamoDB and send emails
def scan_and_send_emails():
    today_str = datetime.now().strftime('%Y-%m-%d')
    print(f"Scanning for emails to send with delayedDate {today_str}")
    
    response = table.scan(
        FilterExpression=boto3.dynamodb.conditions.Attr('delayedDate').eq(today_str)
    )
    
    for item in response['Items']:
        email = item['email']
        notificationType = item['notification_type']
        template_id = TEMPLATE_ID_MAP.get(notificationType)
        if not template_id:
            print(f"Unknown notification type for email {email}. Skipping.")
            continue
        
        variables = {
            "username": email.split('@')[0]
        }
        
        send_email_via_mailjet(email, template_id, variables)
        
        # Optionally delete the item after processing
        table.delete_item(Key={'email': email})
        print(f"Processed and deleted notification for {email}")

def lambda_handler(event, context):
    print("Event Recieved as -", event)

    scan_and_send_emails()
    return {
        'statusCode': 200,
        'body': json.dumps('Processed delayed notifications.')
    }

