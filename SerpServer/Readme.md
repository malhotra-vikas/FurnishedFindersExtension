This server runs the SERP APIs for accuracy check.
COnnect to the EC2. Go to the SerpServer folder and run node veraserver.js

1. npm install express node-fetch
2. npm install axios
3. npm install cors
4. npm install forever -g

Start the server by -- 
1. forever start -l forever.log -o veraserver-out.log -e veraserver-err.log -a --minUptime 2000 --spinSleepTime 4000 veraserver.js

2. forever list (to list running files)

Ensuring the server is restarted wne EC2 restarts
1. Copy veraserver.service to /etc/systemd/system
2. sudo systemctl daemon-reload       # Reload systemd to include the new service
3. sudo systemctl enable veraserver   # Enable the service to start at boot
4. sudo systemctl start veraserver    # Start the service right now

Check the status of your service to ensure it's active and running:
1. sudo systemctl status veraserver



http://localhost:3000/api/search?quote=your_search_term_here


Connect to EC2
ssh -i "vera.pem" ec2-user@ec2-52-15-34-155.us-east-2.compute.amazonaws.com
cd SerpServer

Setup on EC2

Install Node.js: You can install Node.js on Amazon Linux using the following commands:
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

sudo yum install -y nodejs

Install PM2 (optional but recommended for production):
2. sudo npm install pm2@latest -g

Upload Your Code: Use SCP or a Git repository to transfer your application code to the EC2 instance.
3. git clone https://github.com/malhotra-vikas/VeraAI

Navigate to Your Project:
cd /home/ec2-user/VeraAI/SerpServer

Install Dependencies:
npm install express node-fetch
npm install axios
npm install cors

Start Your Application:
node veraserver.js

Or using PM2:
pm2 start app.js --name "your-app-name"

Open a Web Browser and navigate to http://your-instance-public-dns:3000/api/search
