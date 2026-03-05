import { PandaSDK } from '../src';

const MySDK = PandaSDK.initialize({
  apiToken: 'API_TOKEN',
  email: 'EMAIL',
  company_id: 'YOUR_COMPANY_ID_AS_INTEGER',
  password: 'PASSWORD',
  queues: [{ queueName: 'demo', routingKey: '#' }],
  logging: {
    directory: './logs',
  },
});

MySDK.getRMQFeed((msg: any) => {
  console.log('Received message from RabbitMQ:', msg);
});
