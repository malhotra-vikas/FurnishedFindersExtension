import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('VeraUsers')

def lambda_handler(event, context):
    # Handle CORS preflight request
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    if event['httpMethod'] == 'GET':
        email = event['queryStringParameters'].get('email')
        print("in GET email is", email)
        
        if not email:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': json.dumps('Missing email')
            }
        try:
            response = table.get_item(Key={'email': email})
            print("IN GET REsposne for email", response)
            if 'Item' in response:
                return {
                    'statusCode': 200,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    },
                    'body': json.dumps(response['Item'])
                }
            else:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    },
                    'body': json.dumps('User not found')
                }
        except ClientError as e:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': json.dumps(f"Error retrieving user: {e.response['Error']['Message']}")
            }
    elif event['httpMethod'] == 'POST':
        body = event.get('body')
        if body is None:
            return {
                'statusCode': 400,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
                'body': json.dumps('Missing body in request')
            }
        print("body is", body)
        
        # Parse the JSON body
        try:
            data = json.loads(body)
            email = data.get('email')
            subscription_status = data.get('subscription_status')
            timestamp = data.get('timestamp', '')
            credits = data.get('credits')
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
                'body': json.dumps('Invalid JSON')
            }
        if not email:
            return {
                'statusCode': 400,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
                'body': json.dumps('Missing email')
            }
        try:
            table.put_item(
                Item={
                    'email': email,
                    'last access': timestamp,
                    'subscription_status': subscription_status,
                    'credits': credits
                }
            )
            return {
                'statusCode': 200,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
                'body': json.dumps('Email stored successfully')
            }
        except ClientError as e:
            return {
                'statusCode': 500,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
                'body': json.dumps(f"Error storing email: {e.response['Error']['Message']}")
            }
    elif event['httpMethod'] == 'PUT': 
        body = event.get('body')
        if body is None:
            return {
                'statusCode': 400,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
                'body': json.dumps('Missing body in request')
            }
        print("body is", body)
        
        # Parse the JSON body
        try:
            data = json.loads(body)
            email = data.get('email')
            timestamp = data.get('timestamp')
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
                'body': json.dumps('Invalid JSON')
            }
        if not email:
            return {
                'statusCode': 400,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
                'body': json.dumps('Missing email')
            }
        try:
            response = table.get_item(Key={'email': email})
            print("IN PUT REsposne for email", response)
            if 'Item' in response:
                item = response['Item']
                credits = int(item['credits']) - 1
                print("IN PUT Credits for email", credits)
                subscription_status = item['subscription_status']
                print("IN PUT Item for email", item)
                print("IN PUT Credits for email", credits)
                # Update the item in the table
                update_response = table.update_item(
                    Key={'email': email},
                    UpdateExpression="set credits = :c, #la = :timestamp, subscription_status = :ss",
                    ExpressionAttributeValues={
                        ':c': str(credits),  # Ensure this is converted to string if your table expects a string
                        ':timestamp': timestamp,
                        ':ss': subscription_status
                    },
                    ExpressionAttributeNames={
                        '#la': 'last access'  # Using an expression attribute name to avoid conflict with reserved words
                    },
                    ReturnValues="UPDATED_NEW"
                )
                print("Update response:", update_response)
            return {
                'statusCode': 200,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
                'body': json.dumps('Email stored successfully')
            }
        except ClientError as e:
            return {
                'statusCode': 500,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
                'body': json.dumps(f"Error storing email: {e.response['Error']['Message']}")
            }            
    else:
        return {
            'statusCode': 405,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps('Method not allowed')
        }
