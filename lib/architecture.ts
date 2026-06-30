// Architecture Spotter — static "which service completes / fixes this design?"
// scenarios. Trains architecture thinking with plain MCQs. No AI.

export type ArchScenario = {
  scenario: string
  options: string[]
  answer: number
  why: string
}

export const ARCH_SCENARIOS: ArchScenario[] = [
  {
    scenario: 'EC2 instances in private subnets must read/write an S3 bucket without sending traffic over the public internet. What completes this design?',
    options: ['NAT Gateway', 'S3 Gateway VPC Endpoint', 'Internet Gateway', 'Direct Connect'],
    answer: 1,
    why: 'A Gateway VPC Endpoint routes S3 traffic privately via the VPC route table — no internet path needed.',
  },
  {
    scenario: 'A read-heavy app on RDS is hitting a database bottleneck during traffic spikes. The compute tier already auto-scales. What should you add?',
    options: ['A larger single instance only', 'RDS Read Replicas', 'A second VPC', 'More Elastic IPs'],
    answer: 1,
    why: 'Read replicas offload read traffic from the primary, scaling reads horizontally.',
  },
  {
    scenario: 'A spiky producer overwhelms slower downstream workers, and messages are sometimes lost during bursts. What completes the design?',
    options: ['An SQS queue between them', 'A bigger EC2 instance', 'CloudFront', 'A second load balancer'],
    answer: 0,
    why: 'A queue buffers and decouples producer from consumers so nothing is lost during spikes.',
  },
  {
    scenario: 'Lambda functions connect directly to an RDS database and exhaust its connection limit under high concurrency. What fixes this?',
    options: ['Increase Lambda memory', 'Amazon RDS Proxy', 'Provisioned Concurrency', 'A NAT Gateway'],
    answer: 1,
    why: 'RDS Proxy pools and reuses database connections, preventing connection exhaustion from many Lambdas.',
  },
  {
    scenario: 'A horizontally-scaled, stateless web tier needs to share fast-access user session data across all instances. What should you add?',
    options: ['Store sessions on each EC2 disk', 'Amazon ElastiCache (Redis)', 'An S3 bucket per user', 'EBS Multi-Attach'],
    answer: 1,
    why: 'ElastiCache (or DynamoDB) provides a shared, low-latency session store for stateless instances.',
  },
  {
    scenario: 'A static website in S3 must load quickly for users worldwide and reduce repeated requests to the bucket. What completes it?',
    options: ['S3 Transfer Acceleration', 'CloudFront distribution', 'A larger S3 bucket', 'Route 53 only'],
    answer: 1,
    why: 'CloudFront caches content at edge locations for fast global delivery and fewer origin hits.',
  },
]
