# Setup

1. Requires chromium installed

`sudo apt-get install chromium-browser`

2. Setup required packages

`yarn install`

3. Create .env file in the root

```
WEBHOOK_URL=https://discord.com/api/webhooks/SECRET
NHS_NUMBER=723263xxxx
DOB=dd/mm/yyyy
INTERVAL=4
PERIOD=hours
```

4. Create some kind of webhook to post messages to and include in .env (Optional)

5. Adjust the period and interval in .env if necessary, default is 1 hours between checks (Optional)

6. Run `yarn start`
