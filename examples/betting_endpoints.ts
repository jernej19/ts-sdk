import { PandaSDK } from '../src';

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

const matchData = MySDK.fetchMatch('979621');

matchData
  .then((data) => {
    console.log('Results for a single match: ');
    console.log(JSON.stringify(data));
  })
  .catch((error) => {
    console.error(error);
  });

const marketsData = MySDK.fetchMarkets('979621');

marketsData
  .then((data) => {
    console.log('Results for markets of a match: ');
    console.log(data);
  })
  .catch((error) => {
    console.error(error);
  });

const oneHourAgoISO = new Date(new Date().getTime() - 60 * 60 * 1000).toISOString();
const dateNow = new Date().toISOString();

const marketsRange = MySDK.fetchMatchesRange(oneHourAgoISO, dateNow);

marketsRange
  .then((data) => {
    console.log('Results for range of markets: ');
    console.log(data);
  })
  .catch((error) => {
    console.error(error);
  });
