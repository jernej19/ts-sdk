import { PandaSDK } from '../src';

// Load the limits config file

const MySDK = PandaSDK.initialize({
  apiToken: 'YOUR_API_TOKEN',
  email: 'YOUR_EMAIL',
  company_id: 999999,
  password: 'YOUR_PASSWORD',
  queueName: 'YOUR_QUEUE_NAME',
  oddsFormat: 'decimal',
  logging: {
    directory: './logs',
  },
  realTimeBetLogConfig: {
    vhost: 'YOUR_RTBL_VHOST',
    email: 'YOUR_EMAIL',
    password: 'YOUR_PASSWORD',
  },
});

MySDK.getRMQFeed(
  (msg) => {
    console.log(msg);
  },
  { addLimits: true },
);
