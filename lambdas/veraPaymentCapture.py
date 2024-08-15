import json
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timezone

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('VeraUsers')

def lambda_handler(event, context):
    try:
        # Parse the Stripe event
        stripe_event = json.loads(event['body'])
        
        # Handle the event type
        if stripe_event['type'] == 'checkout.session.completed':
            session = stripe_event['data']['object']
            
            # Extract email and payment information
            email = session['customer_details']['email']
            payment_id = session['payment_intent']
            subscription_status = 'active'  # or any other status you want to set
            credits = 100
            subscription_date = datetime.now(timezone.utc).strftime('%m/%d/%Y')  # format to mm/dd/yyyy

            print(" subscription_status is being set to ", subscription_status)
            print(" subscription_date is being set to ", subscription_date)
            print(" credits is being set to ", credits)

            # Update the DynamoDB table
            table.update_item(
                Key={'email': email},
                UpdateExpression='SET payment_id = :payment_id, subscription_status = :subscription_status, credits = :credits, subscription_date = :subscription_date',
                ExpressionAttributeValues={
                    ':payment_id': payment_id,
                    ':subscription_status': subscription_status,
                    ':credits': credits,
                    ':subscription_date': subscription_date
                }
            )
            return {
                'statusCode': 200,
                'body': json.dumps('Payment info updated successfully')
            }
        else:
            return {
                'statusCode': 400,
                'body': json.dumps('Unhandled event type')
            }
    except ClientError as e:
        print("Exception in ", e)
        return {
            'statusCode': 500,
            'body': json.dumps(f"Error updating DynamoDB: {e.response['Error']['Message']}")
        }
    except Exception as e:
        print("Exception in ", e)
        return {
            'statusCode': 500,
            'body': json.dumps(f"Error processing Stripe event: {str(e)}")
        }
