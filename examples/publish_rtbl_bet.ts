import { PandaSDK, BetData } from '../src';

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

async function main() {
  try {
    await MySDK.connectToRabbitMQ();
    await MySDK.createChannel();

    const betData: BetData = {
      event_type: 'bet_placed',
      bet: {
        id: 'id-of-the-bet',
        type: 'single',
        user_id: 'user-if',
        cash_amount: 100,
        currency: 'USD',
        placed_at: new Date().toISOString(),
        selections: [
          {
            provider: 'PandaScore',
            provider_market_id: 'market-id',
            provider_selection_position: 1,
            decimal_odds: 1.5,
          },
        ],
      },
    };

    MySDK.publishBet(
      betData,
      (error) => console.error('Error:', error.message),
      (data) => console.log('Success:', data),
    );
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

main();
