// Confusion Trainer — curated, static comparisons of commonly-confused AWS
// services, plus quick "which fits?" scenario drills. No AI; pure content.

export type Confusion = {
  id: string
  title: string
  a: { name: string; tagline: string }
  b: { name: string; tagline: string }
  key: string                                   // the one-line distinction
  drills: { scenario: string; answer: 'a' | 'b'; why: string }[]
}

export const CONFUSIONS: Confusion[] = [
  {
    id: 'sqs-sns',
    title: 'SQS vs SNS',
    a: { name: 'SQS', tagline: 'Pull-based queue. Buffers work so one consumer fleet processes each message at its own pace.' },
    b: { name: 'SNS', tagline: 'Push-based pub/sub. Fans one message out to many subscribers instantly.' },
    key: 'SQS = buffer/decouple work (one worker pulls). SNS = broadcast now to many (push).',
    drills: [
      { scenario: 'Smooth out a variable workload so workers process tasks at their own pace.', answer: 'a', why: 'Queues buffer and decouple — classic SQS.' },
      { scenario: 'Send the same event to email, a Lambda, and an HTTP endpoint at once.', answer: 'b', why: 'Fan-out to many subscribers = SNS.' },
      { scenario: 'Guarantee each order is processed exactly once by a single worker fleet.', answer: 'a', why: 'SQS (FIFO) for ordered, exactly-once processing.' },
    ],
  },
  {
    id: 'eventbridge-sns',
    title: 'EventBridge vs SNS',
    a: { name: 'EventBridge', tagline: 'Event bus with content-based routing/filtering, schemas, and AWS + SaaS sources.' },
    b: { name: 'SNS', tagline: 'Simple, very high-throughput pub/sub fan-out with minimal routing logic.' },
    key: 'EventBridge = smart routing/filtering across AWS & SaaS. SNS = simple, fast fan-out.',
    drills: [
      { scenario: 'Route events to different targets based on their content/attributes.', answer: 'a', why: 'Content-based filtering is EventBridge.' },
      { scenario: 'Fan out a notification to thousands of subscribers with highest throughput.', answer: 'b', why: 'High-volume simple fan-out = SNS.' },
      { scenario: 'Ingest events from a third-party SaaS app into AWS.', answer: 'a', why: 'EventBridge has SaaS partner event sources.' },
    ],
  },
  {
    id: 'eventbridge-s3events',
    title: 'EventBridge vs S3 Event Notifications',
    a: { name: 'EventBridge', tagline: 'Richer S3 event routing: filtering, more event types, multiple/advanced targets, replay.' },
    b: { name: 'S3 Event Notifications', tagline: 'Direct, simple S3 → Lambda/SQS/SNS on object events; limited filtering.' },
    key: 'Need filtering / many targets / advanced routing → EventBridge. Simple "on upload, do X" → S3 Notifications.',
    drills: [
      { scenario: 'On every object upload, trigger one Lambda — simplest possible setup.', answer: 'b', why: 'Direct S3 event notification to Lambda.' },
      { scenario: 'Route S3 events to several targets with content filtering and replay.', answer: 'a', why: 'Advanced routing/filtering = EventBridge.' },
    ],
  },
  {
    id: 'cloudfront-ta',
    title: 'CloudFront vs S3 Transfer Acceleration',
    a: { name: 'CloudFront', tagline: 'CDN that caches content at edge locations for fast global delivery (downloads).' },
    b: { name: 'S3 Transfer Acceleration', tagline: 'Speeds up long-distance uploads TO S3 via edge locations + AWS backbone.' },
    key: 'CloudFront = fast delivery/downloads (caching). Transfer Acceleration = fast long-distance uploads to S3.',
    drills: [
      { scenario: 'Users worldwide upload large files to an S3 bucket faster.', answer: 'b', why: 'Accelerating uploads to S3 = Transfer Acceleration.' },
      { scenario: 'Serve a website\'s images and videos to global users with low latency.', answer: 'a', why: 'Caching/delivery at edge = CloudFront.' },
    ],
  },
  {
    id: 'reserved-provisioned-concurrency',
    title: 'Reserved vs Provisioned Concurrency (Lambda)',
    a: { name: 'Reserved Concurrency', tagline: 'Caps/guarantees a function\'s max concurrent executions. Does NOT reduce cold starts.' },
    b: { name: 'Provisioned Concurrency', tagline: 'Pre-initializes warm execution environments → eliminates cold starts (extra cost).' },
    key: 'Reserved = control/limit concurrency. Provisioned = pre-warmed instances that kill cold starts.',
    drills: [
      { scenario: 'Eliminate cold-start latency for a latency-sensitive function.', answer: 'b', why: 'Pre-warmed = Provisioned Concurrency.' },
      { scenario: 'Stop one function from consuming all account concurrency.', answer: 'a', why: 'Capping/reserving a slice = Reserved Concurrency.' },
    ],
  },
  {
    id: 'dynamodb-rds',
    title: 'DynamoDB vs RDS',
    a: { name: 'DynamoDB', tagline: 'Serverless NoSQL; single-digit-ms at any scale; flexible schema; access-pattern driven.' },
    b: { name: 'RDS', tagline: 'Managed relational (SQL): joins, transactions, complex queries, fixed schema.' },
    key: 'Relational/joins/complex queries → RDS. Massive scale, simple key access, serverless → DynamoDB.',
    drills: [
      { scenario: 'Millions of key-value lookups/sec with predictable low latency, no servers.', answer: 'a', why: 'Scale + key access + serverless = DynamoDB.' },
      { scenario: 'Reporting with JOINs across normalized tables and ACID transactions.', answer: 'b', why: 'Relational queries/transactions = RDS.' },
    ],
  },
  {
    id: 'alb-nlb',
    title: 'ALB vs NLB',
    a: { name: 'ALB', tagline: 'Layer 7 (HTTP/HTTPS): path/host routing, redirects, WAF — for web apps & microservices.' },
    b: { name: 'NLB', tagline: 'Layer 4 (TCP/UDP): ultra-high throughput, lowest latency, static IP.' },
    key: 'HTTP routing (path/host) → ALB. Raw TCP/UDP, millions of req/sec, static IP, lowest latency → NLB.',
    drills: [
      { scenario: 'Route /api to one target group and /images to another.', answer: 'a', why: 'Path-based HTTP routing = ALB.' },
      { scenario: 'Handle millions of requests/sec at ultra-low latency with a static IP.', answer: 'b', why: 'Extreme L4 performance + static IP = NLB.' },
    ],
  },
  {
    id: 'sg-nacl',
    title: 'Security Group vs Network ACL',
    a: { name: 'Security Group', tagline: 'Stateful, instance-level firewall. Allow rules only; return traffic auto-allowed.' },
    b: { name: 'Network ACL', tagline: 'Stateless, subnet-level. Supports allow AND deny; must allow return traffic explicitly.' },
    key: 'Instance-level, stateful, allow-only → Security Group. Subnet-level, stateless, supports DENY → NACL.',
    drills: [
      { scenario: 'Block one specific malicious IP at the subnet level.', answer: 'b', why: 'Explicit DENY at subnet level = NACL.' },
      { scenario: 'Allow web traffic to an EC2 instance; return traffic should just work.', answer: 'a', why: 'Stateful auto-allows return traffic = Security Group.' },
    ],
  },
]
