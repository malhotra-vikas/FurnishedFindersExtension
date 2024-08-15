### Moderatrions Lambda Setup

# Bundle with OpenAi
ca Lambdas
pip install openai --upgrade --platform manylinux2014_x86_64 --only-binary=:all: --target=./packages
pip install pydantic_core --platform manylinux2014_x86_64 --only-binary=:all: --upgrade --target=./packages

pip install pydantic_core openai --target ./packages --only-binary=:all:

zip -r cursewordEvaluteLambda.zip ./packages cursewordEvaluteLambda.py

Ensure that the ENV variables are setupo
1. PYTHONPATH = /var/task/packages
2. OPENAI_API_KEY


## Latest Install steps
1. python moderator.py runs in the terminal and polls for messages on the Queue. For each message, it runs the evaluate_text_with_ai and send the response to a Webhook
2. cursewordEvaluteLambda is a Lambda that send a message to the queue

Currently installed on M Consultants AWS