# PandaSDK

PandaSDK is made to interact with Pandascore Sportsbook. You can use various methods related to matches, markets, events, and more. You will be able to connect to our trading feed easily, get odds change, and use our Matches API.

# Features

- RabbitMQ feed integration - connect to the PandaScore AMQPS feed and receive structured JSON events.

- Automatic reconnection & recovery — built-in heartbeat monitoring and recovery calls to fetch anything missed during disconnections.

- Typed DTOs — first-class TypeScript types for feed payloads and HTTP responses.

- HTTP clients — a MatchesClient with convenient methods for markets/matches recovery by timestamp/range.

- Extensive logging — file + console logging with contextual metadata.

## Table of Contents

- [PandaSDK](#pandasdk)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Usage](#usage)
    - [Getting Pandascore feed](#getting-pandascore-feed)
    - [Publishing RTBL Bet](#publishing-rtbl-bet)
    - [Getting a match detail](#getting-a-match-detail)
    - [Getting markets for a match](#getting-markets-for-a-match)
    - [Getting markets changed during a time range](#getting-markets-changed-during-a-time-range)

## Installation

You can install the SDK via npm:

```bash
npm install @pandascore/odds-sdk
```

Or via yarn:

```bash
yarn add @pandascore/odds-sdk
```

## Configuration

Before using the SDK, you need to configure it with your credentials:

```typescript
import { PandaSDK } from '@pandascore/odds-sdk';

const MySDK = PandaSDK.initialize({
  apiToken: 'your-api-token',
  company_id: 123,                   // your PandaScore company ID
  email: 'you@example.com',
  password: 'secret',
  queues: [
    { queueName: 'my-queue', routingKey: '#' }, // add more bindings as needed
  ],
  oddsFormat: ['american', 'fractional'], // optional; decimal odds are sent by default
  logging: {
    directory: './PandaScore_logs',  // optional; file logs are written here
  },
  realTimeBetLogConfig: {           // optional config
    vhost: 'vhost-123',
    email: 'you@example.com',
    password: 'secret',
    hostname: 'feed.example.com',
  },
});
```

## Usage

### Getting Pandascore feed

To get all our messages, you can use:

```typescript
MySDK.getRMQFeed((msg) => {
  console.log('Received message from RabbitMQ:', msg);
});
```

### Publishing RTBL Bet

(Optional if you are subscribed to the package) To publish an RTBL bet:

```typescript
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
```

### Getting a match detail

You can use `fetchMatch` to get detail for a single match.

```typescript
const matchData = MySDK.fetchMatch('979621');

matchData
  .then((data) => {
    console.log('Results for a single match: ');
    console.log(JSON.stringify(data));
  })
  .catch((error) => {
    console.error(error);
  });
```

### Getting markets for a match

You can use `fetchMarkets` to get all markets of a match.

```typescript
const marketsData = MySDK.fetchMarkets('979621');

marketsData
  .then((data) => {
    console.log('Results for markets of a match: ');
    console.log(data);
  })
  .catch((error) => {
    console.error(error);
  });
```

### Getting markets changed during a time range

You can use `fetchMatchesRange` to get all markets updated during a specified time range.

```typescript
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
```

### Examples

You can find more example in the package source code.
