// Built-in "trigger word" dictionary for AWS SAA-C03 style questions.
//
// The exam is largely a vocabulary test: certain phrases reliably decide the
// answer. Every trigger carries four things, so a highlight actually teaches
// something instead of just being coloured:
//
//   category  — WHAT KIND of signal it is (cost / security / …). Each category
//               has its own colour, so you can see at a glance whether a
//               question is really about cost, availability, or ops overhead.
//   strength  — how much it decides. "least operational overhead" is decisive;
//               "monitor" is background noise. Decisive triggers are bold with
//               a solid underline, supporting ones dotted, context ones plain.
//   services  — what it points to.
//   trap      — the distractor it rules OUT. This is the part students miss.
//
// Notes for editing:
// - Phrases are matched case-insensitively, on word boundaries.
// - Include hyphen AND space variants separately ("real-time" / "real time").
// - Longer phrases win at the same spot ("most cost-effective" beats
//   "cost-effective"), so add the specific variant as its own entry.

export type TriggerCategory =
  | 'cost' | 'ops' | 'availability' | 'performance' | 'security'
  | 'integration' | 'storage' | 'data' | 'network' | 'migration'

export type TriggerStrength = 'strong' | 'medium' | 'weak'

export type Trigger = {
  phrase: string
  category: TriggerCategory
  strength: TriggerStrength
  hint: string        // what the phrase signals
  services?: string   // what it points you to
  trap?: string       // the wrong answer it rules out
}

// Colour + label per category. Class strings are written out in full (never
// built by string concatenation) so Tailwind's scanner keeps them.
export const CATEGORY_META: Record<TriggerCategory, {
  label: string; chip: string; mark: string; rule: string
}> = {
  cost:         { label: 'Cost',             chip: 'bg-emerald-100 text-emerald-800', mark: 'bg-emerald-100 text-emerald-900', rule: 'decoration-emerald-500' },
  ops:          { label: 'Ops overhead',     chip: 'bg-violet-100 text-violet-800',   mark: 'bg-violet-100 text-violet-900',   rule: 'decoration-violet-500' },
  availability: { label: 'Availability',     chip: 'bg-blue-100 text-blue-800',       mark: 'bg-blue-100 text-blue-900',       rule: 'decoration-blue-500' },
  performance:  { label: 'Performance',      chip: 'bg-orange-100 text-orange-800',   mark: 'bg-orange-100 text-orange-900',   rule: 'decoration-orange-500' },
  security:     { label: 'Security',         chip: 'bg-rose-100 text-rose-800',       mark: 'bg-rose-100 text-rose-900',       rule: 'decoration-rose-500' },
  integration:  { label: 'Integration',      chip: 'bg-teal-100 text-teal-800',       mark: 'bg-teal-100 text-teal-900',       rule: 'decoration-teal-500' },
  storage:      { label: 'Storage',          chip: 'bg-indigo-100 text-indigo-800',   mark: 'bg-indigo-100 text-indigo-900',   rule: 'decoration-indigo-500' },
  data:         { label: 'Data & analytics', chip: 'bg-fuchsia-100 text-fuchsia-800', mark: 'bg-fuchsia-100 text-fuchsia-900', rule: 'decoration-fuchsia-500' },
  network:      { label: 'Networking',       chip: 'bg-sky-100 text-sky-800',         mark: 'bg-sky-100 text-sky-900',         rule: 'decoration-sky-500' },
  migration:    { label: 'Migration',        chip: 'bg-amber-100 text-amber-800',     mark: 'bg-amber-100 text-amber-900',     rule: 'decoration-amber-500' },
}

export const STRENGTH_META: Record<TriggerStrength, { label: string; blurb: string; className: string }> = {
  strong: { label: 'Decisive',   blurb: 'This phrase usually picks the answer on its own.', className: 'font-semibold underline decoration-2 underline-offset-2' },
  medium: { label: 'Supporting', blurb: 'Narrows the field — combine it with the other triggers.', className: 'underline decoration-dotted underline-offset-2' },
  weak:   { label: 'Context',    blurb: 'Sets the scene. Rarely decides anything by itself.', className: '' },
}

// The inline highlight styling for one trigger.
export function markClass(t: Trigger): string {
  const c = CATEGORY_META[t.category]
  return `rounded px-0.5 cursor-pointer ${c.mark} ${c.rule} ${STRENGTH_META[t.strength].className}`
}

export const TRIGGERS: Trigger[] = [
  // ── Cost ────────────────────────────────────────────────────────────────
  { phrase: 'most cost-effective', category: 'cost', strength: 'strong', hint: 'Cheapest option that still meets every stated requirement.', services: 'Spot, S3 lifecycle/Glacier, serverless, Savings Plans', trap: 'Rules out over-engineered answers that add capacity you were never asked for.' },
  { phrase: 'cost-effective', category: 'cost', strength: 'strong', hint: 'Optimize cost — but only among options that actually work.', services: 'Managed/serverless, lifecycle to cheaper tiers', trap: 'The cheapest answer that misses a requirement is still wrong.' },
  { phrase: 'cost effective', category: 'cost', strength: 'strong', hint: 'Optimize cost — but only among options that actually work.', services: 'Managed/serverless, lifecycle to cheaper tiers' },
  { phrase: 'least expensive', category: 'cost', strength: 'strong', hint: 'Pure cost play.', services: 'Spot, Glacier, serverless' },
  { phrase: 'reduce costs', category: 'cost', strength: 'strong', hint: 'Cut spend on an existing setup.', services: 'Spot, Savings Plans/Reserved, lifecycle to IA/Glacier, right-sizing' },
  { phrase: 'minimize cost', category: 'cost', strength: 'strong', hint: 'Cut spend on an existing setup.', services: 'Spot, Savings Plans, lifecycle' },
  { phrase: 'lower cost', category: 'cost', strength: 'medium', hint: 'Cost matters, but it is not the only constraint.' },
  { phrase: 'pay only for what you use', category: 'cost', strength: 'strong', hint: 'Consumption pricing — no idle capacity.', services: 'Lambda, Fargate, S3, DynamoDB on-demand, Aurora Serverless' },
  { phrase: 'steady state', category: 'cost', strength: 'strong', hint: 'Predictable, always-on load → commit and save.', services: 'Reserved Instances, Savings Plans', trap: 'Spot is wrong here — steady state wants a commitment discount, not interruptible capacity.' },
  { phrase: 'predictable', category: 'cost', strength: 'medium', hint: 'Known load → commitment pricing.', services: 'Reserved Instances, Savings Plans' },
  { phrase: 'unpredictable', category: 'cost', strength: 'medium', hint: 'Spiky/unknown load → pay-per-use or auto scaling.', services: 'Lambda, Fargate, Auto Scaling, DynamoDB on-demand', trap: 'Reserved Instances are wrong — you cannot commit to load you cannot predict.' },
  { phrase: 'interruption', category: 'cost', strength: 'strong', hint: 'Work that can be interrupted and retried → Spot is safe.', services: 'EC2 Spot, Spot Fleet' },
  { phrase: 'can tolerate', category: 'cost', strength: 'medium', hint: 'Often a hint that Spot (or a cheaper, weaker tier) is acceptable.', services: 'EC2 Spot' },

  // ── Operational overhead ────────────────────────────────────────────────
  { phrase: 'least operational overhead', category: 'ops', strength: 'strong', hint: 'The single most decisive phrase on the exam: pick the most managed option.', services: 'Lambda, Fargate, S3, DynamoDB, Aurora Serverless', trap: 'Any answer with EC2 instances you patch/scale yourself is almost certainly wrong.' },
  { phrase: 'lowest operational overhead', category: 'ops', strength: 'strong', hint: 'Pick the most managed / serverless option.', services: 'Lambda, Fargate, managed services', trap: 'Self-managed EC2 answers are out.' },
  { phrase: 'minimal operational overhead', category: 'ops', strength: 'strong', hint: 'Pick the most managed / serverless option.', services: 'Lambda, Fargate, managed services', trap: 'Self-managed EC2 answers are out.' },
  { phrase: 'least operational effort', category: 'ops', strength: 'strong', hint: 'Pick the most managed / serverless option.', services: 'Lambda, Fargate, managed services' },
  { phrase: 'least management overhead', category: 'ops', strength: 'strong', hint: 'Pick the most managed / serverless option.', services: 'Managed/serverless services' },
  { phrase: 'least administrative overhead', category: 'ops', strength: 'strong', hint: 'Pick the most managed / serverless option.', services: 'Managed/serverless services' },
  { phrase: 'without managing servers', category: 'ops', strength: 'strong', hint: 'Serverless, explicitly.', services: 'Lambda, Fargate, S3, DynamoDB, API Gateway', trap: 'Anything mentioning EC2 instances is out.' },
  { phrase: 'no servers to manage', category: 'ops', strength: 'strong', hint: 'Serverless, explicitly.', services: 'Lambda, Fargate, S3, DynamoDB', trap: 'Anything mentioning EC2 instances is out.' },
  { phrase: 'serverless', category: 'ops', strength: 'strong', hint: 'No infrastructure to run or patch.', services: 'Lambda, Fargate, S3, DynamoDB, API Gateway, Aurora Serverless' },
  { phrase: 'fully managed', category: 'ops', strength: 'strong', hint: 'AWS runs it for you.', services: 'RDS/Aurora, Fargate, MSK, OpenSearch, ElastiCache' },
  { phrase: 'managed service', category: 'ops', strength: 'medium', hint: 'Prefer the AWS-run option over DIY on EC2.' },
  { phrase: 'minimal changes to the application', category: 'ops', strength: 'strong', hint: 'Lift-and-shift — do NOT re-architect.', services: 'EC2, RDS, EFS, Storage Gateway', trap: 'Rules out answers that rewrite the app for Lambda/containers, however elegant.' },
  { phrase: 'no code changes', category: 'ops', strength: 'strong', hint: 'Lift-and-shift — do NOT re-architect.', services: 'EC2, RDS, EFS', trap: 'Rules out re-platforming answers.' },
  { phrase: 'without changing the application', category: 'ops', strength: 'strong', hint: 'Lift-and-shift — do NOT re-architect.', trap: 'Rules out re-platforming answers.' },
  { phrase: 'automatically', category: 'ops', strength: 'weak', hint: 'Prefer the option that needs no human step.' },
  { phrase: 'manually', category: 'ops', strength: 'medium', hint: 'Usually describes the WRONG answer — the exam prefers automation.' },

  // ── Availability & resilience ───────────────────────────────────────────
  { phrase: 'highly available', category: 'availability', strength: 'strong', hint: 'Survive the loss of one AZ.', services: 'Multi-AZ, ELB + Auto Scaling across AZs', trap: 'Single-AZ or single-instance answers are out — even if cheaper.' },
  { phrase: 'high availability', category: 'availability', strength: 'strong', hint: 'Survive the loss of one AZ.', services: 'Multi-AZ, ELB + Auto Scaling across AZs', trap: 'Single-AZ answers are out.' },
  { phrase: 'fault tolerant', category: 'availability', strength: 'strong', hint: 'Keep working through a failure, with no data loss.', services: 'Multi-AZ, SQS for decoupling, multi-Region' },
  { phrase: 'fault tolerance', category: 'availability', strength: 'strong', hint: 'Keep working through a failure.', services: 'Multi-AZ, multi-Region, SQS' },
  { phrase: 'single point of failure', category: 'availability', strength: 'strong', hint: 'Something in the current design is standalone — remove it.', services: 'Multi-AZ, ELB, Auto Scaling group' },
  { phrase: 'disaster recovery', category: 'availability', strength: 'strong', hint: 'Recover from losing a whole Region.', services: 'Cross-Region replication, pilot light, warm standby, Route 53 failover' },
  { phrase: 'multiple availability zones', category: 'availability', strength: 'strong', hint: 'Explicitly Multi-AZ.', services: 'Multi-AZ RDS, ASG across AZs, ELB' },
  { phrase: 'across availability zones', category: 'availability', strength: 'strong', hint: 'Explicitly Multi-AZ.', services: 'Multi-AZ, ELB + Auto Scaling' },
  { phrase: 'multi-region', category: 'availability', strength: 'strong', hint: 'Survive losing an entire Region.', services: 'CRR, Aurora Global, DynamoDB Global Tables, Route 53' },
  { phrase: 'rpo', category: 'availability', strength: 'strong', hint: 'Recovery Point Objective — how much DATA you may lose. Near-zero → continuous replication.', services: 'Aurora Global, DynamoDB Global Tables, CRR' },
  { phrase: 'rto', category: 'availability', strength: 'strong', hint: 'Recovery Time Objective — how long you may be DOWN. Near-zero → warm standby / active-active.', services: 'Warm standby, multi-Region active-active' },
  { phrase: 'pilot light', category: 'availability', strength: 'strong', hint: 'DR pattern: core data replicated, servers off until needed. Cheap, slower RTO.' },
  { phrase: 'warm standby', category: 'availability', strength: 'strong', hint: 'DR pattern: a scaled-down copy always running. Costlier, faster RTO.' },
  { phrase: 'resilient', category: 'availability', strength: 'medium', hint: 'Multi-AZ, decoupling, auto scaling.' },
  { phrase: 'resiliency', category: 'availability', strength: 'medium', hint: 'Multi-AZ, decoupling, auto scaling.' },
  { phrase: 'durability', category: 'availability', strength: 'medium', hint: 'Data must not be lost (distinct from availability).', services: 'S3 (11 nines), cross-Region replication' },
  { phrase: 'without downtime', category: 'availability', strength: 'strong', hint: 'The cutover itself must not interrupt service.', services: 'Multi-AZ failover, blue/green, DMS ongoing replication' },
  { phrase: 'minimal downtime', category: 'availability', strength: 'strong', hint: 'Migration/failover must be near-seamless.', services: 'DMS with CDC, Multi-AZ, blue/green' },

  // ── Performance & latency ───────────────────────────────────────────────
  { phrase: 'lowest latency', category: 'performance', strength: 'strong', hint: 'Get the data closer to the user, or into memory.', services: 'CloudFront, Global Accelerator, ElastiCache, DAX, read replicas' },
  { phrase: 'low latency', category: 'performance', strength: 'strong', hint: 'Edge or cache.', services: 'CloudFront, ElastiCache, DAX' },
  { phrase: 'single-digit millisecond', category: 'performance', strength: 'strong', hint: 'DynamoDB’s signature phrase.', services: 'DynamoDB' },
  { phrase: 'microsecond', category: 'performance', strength: 'strong', hint: 'Microseconds means an in-memory cache in front of DynamoDB.', services: 'DAX', trap: 'Plain DynamoDB gives milliseconds, not microseconds.' },
  { phrase: 'sub-millisecond', category: 'performance', strength: 'strong', hint: 'In-memory.', services: 'ElastiCache, DAX, MemoryDB' },
  { phrase: 'in-memory', category: 'performance', strength: 'strong', hint: 'A caching layer.', services: 'ElastiCache (Redis/Memcached), DAX' },
  { phrase: 'real-time', category: 'performance', strength: 'strong', hint: 'Streaming, processed as it arrives.', services: 'Kinesis Data Streams, Amazon MSK', trap: 'Firehose is NEAR-real-time (buffered) — not the same thing.' },
  { phrase: 'real time', category: 'performance', strength: 'strong', hint: 'Streaming, processed as it arrives.', services: 'Kinesis Data Streams, MSK' },
  { phrase: 'near-real-time', category: 'performance', strength: 'medium', hint: 'Buffered delivery is fine — seconds of delay allowed.', services: 'Kinesis Data Firehose' },
  { phrase: 'caching', category: 'performance', strength: 'medium', hint: 'Edge or in-memory cache.', services: 'CloudFront, ElastiCache, DAX' },
  { phrase: 'global users', category: 'performance', strength: 'strong', hint: 'Users worldwide → serve from the edge.', services: 'CloudFront, Global Accelerator, Route 53 latency routing' },
  { phrase: 'high throughput', category: 'performance', strength: 'medium', hint: 'Volume, not latency — scale out or shard.', services: 'Kinesis shards, DynamoDB, provisioned IOPS' },
  { phrase: 'iops', category: 'performance', strength: 'strong', hint: 'Disk performance is the constraint.', services: 'EBS io1/io2/gp3, instance store' },
  { phrase: 'read-heavy', category: 'performance', strength: 'strong', hint: 'Offload reads.', services: 'Read replicas, ElastiCache, DAX, CloudFront' },
  { phrase: 'read replica', category: 'performance', strength: 'strong', hint: 'Scale reads (NOT availability — that is Multi-AZ).', services: 'RDS/Aurora read replicas', trap: 'A read replica is not a failover target; do not confuse it with Multi-AZ.' },
  { phrase: 'bottleneck', category: 'performance', strength: 'medium', hint: 'Find the constrained tier and scale or cache it.' },

  // ── Security & identity ─────────────────────────────────────────────────
  { phrase: 'encryption at rest', category: 'security', strength: 'strong', hint: 'Stored data must be encrypted.', services: 'KMS, SSE-S3, SSE-KMS, EBS/RDS encryption' },
  { phrase: 'encryption in transit', category: 'security', strength: 'strong', hint: 'Data on the wire must be encrypted.', services: 'TLS, ACM certificates' },
  { phrase: 'encrypt', category: 'security', strength: 'medium', hint: 'KMS for keys; SSE for storage; TLS in transit.', services: 'KMS, ACM' },
  { phrase: 'encryption', category: 'security', strength: 'medium', hint: 'KMS for keys; SSE for storage; TLS in transit.', services: 'KMS, ACM' },
  { phrase: 'rotate', category: 'security', strength: 'strong', hint: 'Automatic credential/key rotation.', services: 'Secrets Manager (auto-rotates), customer-managed KMS keys', trap: 'Parameter Store does NOT rotate secrets automatically — Secrets Manager does.' },
  { phrase: 'rotation', category: 'security', strength: 'strong', hint: 'Automatic credential rotation.', services: 'Secrets Manager', trap: 'Parameter Store cannot auto-rotate.' },
  { phrase: 'hard-coded', category: 'security', strength: 'strong', hint: 'Credentials in code — the exam always wants them removed.', services: 'IAM roles, Secrets Manager', trap: 'Any answer that keeps keys in code or in a config file is wrong.' },
  { phrase: 'least privilege', category: 'security', strength: 'strong', hint: 'Grant only the permissions actually needed.', services: 'IAM policies, permissions boundaries' },
  { phrase: 'temporary credentials', category: 'security', strength: 'strong', hint: 'Roles, not long-lived access keys.', services: 'IAM roles + STS AssumeRole', trap: 'Storing access keys on the instance is the classic wrong answer.' },
  { phrase: 'access key', category: 'security', strength: 'medium', hint: 'Long-lived keys are usually the WRONG answer — prefer roles.', services: 'IAM roles + STS' },
  { phrase: 'mfa', category: 'security', strength: 'medium', hint: 'Extra auth factor; with S3, MFA Delete protects against deletion.' },
  { phrase: 'audit', category: 'security', strength: 'strong', hint: 'Who did what, when.', services: 'CloudTrail (API calls), AWS Config (resource state), Audit Manager', trap: 'CloudWatch is for metrics/logs — CloudTrail is the audit trail of API calls.' },
  { phrase: 'track api calls', category: 'security', strength: 'strong', hint: 'The definition of CloudTrail.', services: 'AWS CloudTrail' },
  { phrase: 'who made the change', category: 'security', strength: 'strong', hint: 'API-call attribution.', services: 'CloudTrail' },
  { phrase: 'compliance', category: 'security', strength: 'medium', hint: 'Prove configuration and access over time.', services: 'AWS Config, CloudTrail, Audit Manager, Artifact' },
  { phrase: 'configuration changes', category: 'security', strength: 'strong', hint: 'Resource state over time, and rules about it.', services: 'AWS Config', trap: 'CloudTrail records the API call; Config records the resulting resource state.' },
  { phrase: 'single sign-on', category: 'security', strength: 'strong', hint: 'Central workforce identity.', services: 'IAM Identity Center, SAML federation' },
  { phrase: 'federation', category: 'security', strength: 'medium', hint: 'Reuse an external identity provider.', services: 'IAM Identity Center, SAML, Cognito' },
  { phrase: 'active directory', category: 'security', strength: 'strong', hint: 'Existing corporate directory.', services: 'AWS Directory Service, AD Connector, Managed Microsoft AD' },
  { phrase: 'mobile app users', category: 'security', strength: 'strong', hint: 'Customer (not workforce) identity.', services: 'Amazon Cognito', trap: 'IAM users for app end-users is always wrong — that is what Cognito is for.' },
  { phrase: 'multiple accounts', category: 'security', strength: 'strong', hint: 'Org-wide governance.', services: 'AWS Organizations, SCPs, Control Tower, cross-account roles' },
  { phrase: 'service control polic', category: 'security', strength: 'strong', hint: 'Org-wide guardrails that DENY actions — they never grant.', services: 'AWS Organizations SCPs', trap: 'An SCP cannot give permissions; it only sets the ceiling.' },
  { phrase: 'ddos', category: 'security', strength: 'strong', hint: 'Volumetric attack protection.', services: 'AWS Shield (Advanced), CloudFront, WAF' },
  { phrase: 'sql injection', category: 'security', strength: 'strong', hint: 'Layer-7 request filtering.', services: 'AWS WAF web ACL', trap: 'Security groups and NACLs cannot inspect request content.' },
  { phrase: 'cross-site scripting', category: 'security', strength: 'strong', hint: 'Layer-7 request filtering.', services: 'AWS WAF' },
  { phrase: 'web application firewall', category: 'security', strength: 'strong', hint: 'Filter malicious HTTP requests.', services: 'AWS WAF (on CloudFront, ALB, API Gateway)' },
  { phrase: 'sensitive data', category: 'security', strength: 'strong', hint: 'Discover/classify PII sitting in S3.', services: 'Amazon Macie' },
  { phrase: 'personally identifiable', category: 'security', strength: 'strong', hint: 'Discover/classify PII in S3.', services: 'Amazon Macie' },
  { phrase: 'threat detection', category: 'security', strength: 'strong', hint: 'Continuous malicious-activity detection from logs.', services: 'Amazon GuardDuty' },
  { phrase: 'vulnerabilit', category: 'security', strength: 'strong', hint: 'Scan workloads for CVEs.', services: 'Amazon Inspector' },
  { phrase: 'security group', category: 'security', strength: 'medium', hint: 'Stateful, instance-level firewall. Allow rules only.', trap: 'Security groups cannot DENY — for explicit deny you need a network ACL.' },
  { phrase: 'network acl', category: 'security', strength: 'medium', hint: 'Stateless, subnet-level. Supports explicit DENY.' },

  // ── Application integration ─────────────────────────────────────────────
  { phrase: 'decouple', category: 'integration', strength: 'strong', hint: 'Put a queue or topic between the tiers.', services: 'SQS (queue), SNS (pub/sub), EventBridge' },
  { phrase: 'decoupling', category: 'integration', strength: 'strong', hint: 'Put a queue or topic between the tiers.', services: 'SQS, SNS, EventBridge' },
  { phrase: 'loosely coupled', category: 'integration', strength: 'strong', hint: 'Components must not call each other directly.', services: 'SQS, SNS, EventBridge' },
  { phrase: 'exactly once', category: 'integration', strength: 'strong', hint: 'No duplicates.', services: 'SQS FIFO queue', trap: 'A standard queue is at-least-once — it can deliver duplicates.' },
  { phrase: 'in order', category: 'integration', strength: 'strong', hint: 'Ordering guarantee.', services: 'SQS FIFO', trap: 'Standard SQS is best-effort ordering only.' },
  { phrase: 'fifo', category: 'integration', strength: 'strong', hint: 'Strict ordering and exactly-once.', services: 'SQS FIFO, SNS FIFO' },
  { phrase: 'fan-out', category: 'integration', strength: 'strong', hint: 'One message → many independent consumers.', services: 'SNS topic → multiple SQS queues' },
  { phrase: 'fan out', category: 'integration', strength: 'strong', hint: 'One message → many consumers.', services: 'SNS → SQS' },
  { phrase: 'multiple subscribers', category: 'integration', strength: 'strong', hint: 'Pub/sub, not a queue.', services: 'SNS', trap: 'SQS delivers each message to ONE consumer — it cannot fan out on its own.' },
  { phrase: 'notification', category: 'integration', strength: 'medium', hint: 'Push a message out.', services: 'Amazon SNS' },
  { phrase: 'notify', category: 'integration', strength: 'medium', hint: 'Push a message out.', services: 'Amazon SNS' },
  { phrase: 'event-driven', category: 'integration', strength: 'strong', hint: 'React to events, with routing/filtering.', services: 'EventBridge, Lambda' },
  { phrase: 'orchestrate', category: 'integration', strength: 'strong', hint: 'Coordinate multi-step workflows with state and retries.', services: 'AWS Step Functions', trap: 'Chaining Lambdas by hand is the wrong answer when a workflow is described.' },
  { phrase: 'workflow', category: 'integration', strength: 'strong', hint: 'Multi-step process with state.', services: 'Step Functions' },
  { phrase: 'dead-letter', category: 'integration', strength: 'medium', hint: 'Park messages that repeatedly fail.', services: 'SQS/SNS dead-letter queue' },
  { phrase: 'buffer', category: 'integration', strength: 'strong', hint: 'Absorb a spike so the backend is not overwhelmed.', services: 'SQS between the tiers' },
  { phrase: 'queue', category: 'integration', strength: 'medium', hint: 'Point-to-point messaging; one consumer per message.', services: 'Amazon SQS' },
  { phrase: 'asynchronous', category: 'integration', strength: 'medium', hint: 'Caller should not wait — queue the work.', services: 'SQS, Lambda async, Step Functions' },
  { phrase: 'scale based on the number of messages', category: 'integration', strength: 'strong', hint: 'Scale on queue depth, not CPU.', services: 'ASG target tracking on SQS ApproximateNumberOfMessages', trap: 'Scaling on CPU or a schedule is the classic wrong answer here.' },

  // ── Storage ─────────────────────────────────────────────────────────────
  { phrase: 'object storage', category: 'storage', strength: 'strong', hint: 'Objects, not a filesystem or a disk.', services: 'Amazon S3' },
  { phrase: 'block storage', category: 'storage', strength: 'strong', hint: 'A disk attached to one instance.', services: 'Amazon EBS' },
  { phrase: 'shared file system', category: 'storage', strength: 'strong', hint: 'Many instances mounting the same filesystem.', services: 'Amazon EFS (Linux/NFS), FSx', trap: 'EBS cannot be shared across AZs — do not pick it for shared access.' },
  { phrase: 'shared storage', category: 'storage', strength: 'strong', hint: 'Multiple instances need the same files.', services: 'EFS, FSx' },
  { phrase: 'concurrently', category: 'storage', strength: 'medium', hint: 'Many readers/writers at once → shared filesystem.', services: 'EFS' },
  { phrase: 'smb', category: 'storage', strength: 'strong', hint: 'Windows file share protocol.', services: 'Amazon FSx for Windows File Server' },
  { phrase: 'windows file server', category: 'storage', strength: 'strong', hint: 'Windows-native shares.', services: 'FSx for Windows File Server' },
  { phrase: 'nfs', category: 'storage', strength: 'strong', hint: 'Linux file share protocol.', services: 'Amazon EFS' },
  { phrase: 'high-performance computing', category: 'storage', strength: 'strong', hint: 'HPC scratch storage.', services: 'FSx for Lustre' },
  { phrase: 'lustre', category: 'storage', strength: 'strong', hint: 'HPC / ML fast scratch filesystem, integrates with S3.', services: 'FSx for Lustre' },
  { phrase: 'infrequently accessed', category: 'storage', strength: 'strong', hint: 'Rarely read, but must be instantly available.', services: 'S3 Standard-IA, S3 One Zone-IA' },
  { phrase: 'rarely accessed', category: 'storage', strength: 'strong', hint: 'Archive it.', services: 'S3 Glacier / Deep Archive via lifecycle' },
  { phrase: 'archive', category: 'storage', strength: 'strong', hint: 'Cold storage. If it must still be retrieved instantly, use Glacier Instant Retrieval.', services: 'S3 Glacier (Instant/Flexible), Deep Archive' },
  { phrase: 'long-term retention', category: 'storage', strength: 'strong', hint: 'Keep it cheaply for years.', services: 'S3 Glacier Deep Archive' },
  { phrase: 'lifecycle', category: 'storage', strength: 'strong', hint: 'Transition objects between tiers on a schedule.', services: 'S3 lifecycle policy' },
  { phrase: 'access patterns are unknown', category: 'storage', strength: 'strong', hint: 'You cannot write a lifecycle rule for load you cannot predict.', services: 'S3 Intelligent-Tiering', trap: 'A fixed lifecycle rule is wrong when the pattern is unpredictable.' },
  { phrase: 'unpredictable access', category: 'storage', strength: 'strong', hint: 'Let S3 move objects for you.', services: 'S3 Intelligent-Tiering' },
  { phrase: 'accidental deletion', category: 'storage', strength: 'strong', hint: 'Protect objects from being destroyed.', services: 'S3 Versioning + MFA Delete', trap: 'Encryption and bucket policies do not stop deletion — versioning does.' },
  { phrase: 'cannot be deleted', category: 'storage', strength: 'strong', hint: 'Write-once, read-many retention.', services: 'S3 Object Lock (WORM), Glacier Vault Lock' },
  { phrase: 'immutable', category: 'storage', strength: 'strong', hint: 'WORM retention.', services: 'S3 Object Lock' },
  { phrase: 'write once', category: 'storage', strength: 'strong', hint: 'WORM retention.', services: 'S3 Object Lock, Glacier Vault Lock' },
  { phrase: 'versioning', category: 'storage', strength: 'medium', hint: 'Keep every version of an object.', services: 'S3 Versioning' },
  { phrase: 'static website', category: 'storage', strength: 'strong', hint: 'No server needed.', services: 'S3 static website hosting + CloudFront' },

  // ── Data & analytics ────────────────────────────────────────────────────
  { phrase: 'data warehouse', category: 'data', strength: 'strong', hint: 'Petabyte-scale analytics over structured data.', services: 'Amazon Redshift' },
  { phrase: 'data lake', category: 'data', strength: 'strong', hint: 'Raw data of any shape, queried in place.', services: 'S3 + Glue + Athena, Lake Formation' },
  { phrase: 'extract, transform, and load', category: 'data', strength: 'strong', hint: 'Serverless ETL.', services: 'AWS Glue' },
  { phrase: 'etl', category: 'data', strength: 'strong', hint: 'Serverless ETL.', services: 'AWS Glue' },
  { phrase: 'query data in amazon s3', category: 'data', strength: 'strong', hint: 'SQL straight over S3, nothing to run.', services: 'Amazon Athena', trap: 'Loading into Redshift first is over-engineering when the question says ad-hoc.' },
  { phrase: 'ad hoc', category: 'data', strength: 'strong', hint: 'Occasional, unplanned queries → pay per query.', services: 'Amazon Athena' },
  { phrase: 'business intelligence', category: 'data', strength: 'strong', hint: 'Dashboards for humans.', services: 'Amazon QuickSight' },
  { phrase: 'dashboard', category: 'data', strength: 'medium', hint: 'BI visualization (QuickSight) or ops metrics (CloudWatch).' },
  { phrase: 'clickstream', category: 'data', strength: 'strong', hint: 'High-volume event stream.', services: 'Kinesis Data Streams' },
  { phrase: 'streaming data', category: 'data', strength: 'strong', hint: 'Continuous ingest.', services: 'Kinesis, MSK' },
  { phrase: 'apache kafka', category: 'data', strength: 'strong', hint: 'Kafka, managed.', services: 'Amazon MSK' },
  { phrase: 'log analytics', category: 'data', strength: 'strong', hint: 'Search and visualize logs.', services: 'Amazon OpenSearch Service' },
  { phrase: 'full-text search', category: 'data', strength: 'strong', hint: 'Search engine.', services: 'Amazon OpenSearch Service' },
  { phrase: 'apache spark', category: 'data', strength: 'strong', hint: 'Big-data processing frameworks.', services: 'Amazon EMR' },
  { phrase: 'hadoop', category: 'data', strength: 'strong', hint: 'Big-data processing frameworks.', services: 'Amazon EMR' },
  { phrase: 'relational database', category: 'data', strength: 'strong', hint: 'SQL, joins, transactions.', services: 'Amazon RDS, Aurora' },
  { phrase: 'nosql', category: 'data', strength: 'strong', hint: 'Key-value at any scale.', services: 'Amazon DynamoDB' },
  { phrase: 'key-value', category: 'data', strength: 'strong', hint: 'Key-value at any scale.', services: 'DynamoDB' },
  { phrase: 'graph database', category: 'data', strength: 'strong', hint: 'Highly connected data (social, fraud rings).', services: 'Amazon Neptune' },
  { phrase: 'time series', category: 'data', strength: 'strong', hint: 'Timestamped metrics at scale.', services: 'Amazon Timestream' },
  { phrase: 'mongodb', category: 'data', strength: 'strong', hint: 'MongoDB-compatible document store.', services: 'Amazon DocumentDB' },
  { phrase: 'session state', category: 'data', strength: 'strong', hint: 'Move state OFF the instance so any instance can serve any user.', services: 'DynamoDB, ElastiCache (Redis)', trap: 'Sticky sessions on the load balancer is the weaker answer — it does not survive instance loss.' },
  { phrase: 'point-in-time recovery', category: 'data', strength: 'medium', hint: 'Restore to any second in the retention window.', services: 'RDS PITR, DynamoDB PITR' },

  // ── Networking ──────────────────────────────────────────────────────────
  { phrase: 'private subnet', category: 'network', strength: 'strong', hint: 'No route to an internet gateway.', services: 'NAT gateway for outbound, VPC endpoints for AWS services' },
  { phrase: 'without traversing the internet', category: 'network', strength: 'strong', hint: 'Traffic must stay on the AWS network.', services: 'VPC endpoint (Gateway for S3/DynamoDB, Interface/PrivateLink otherwise)', trap: 'A NAT gateway still sends traffic over the public internet — it is the wrong answer here.' },
  { phrase: 'without using the internet', category: 'network', strength: 'strong', hint: 'Traffic must stay private.', services: 'VPC endpoints, PrivateLink' },
  { phrase: 'never leave the aws network', category: 'network', strength: 'strong', hint: 'Private connectivity only.', services: 'VPC endpoints, PrivateLink, Direct Connect' },
  { phrase: 'vpc endpoint', category: 'network', strength: 'strong', hint: 'Private access to an AWS service. Gateway = S3/DynamoDB (free); Interface = everything else.', services: 'Gateway/Interface endpoints, PrivateLink' },
  { phrase: 'static ip', category: 'network', strength: 'strong', hint: 'A fixed, unchanging entry-point IP.', services: 'Network Load Balancer, Global Accelerator, Elastic IP', trap: 'An ALB does not give you a static IP — its IPs change.' },
  { phrase: 'content delivery', category: 'network', strength: 'strong', hint: 'Cache at edge locations.', services: 'Amazon CloudFront' },
  { phrase: 'static content', category: 'network', strength: 'strong', hint: 'Serve from storage + edge cache.', services: 'S3 + CloudFront' },
  { phrase: 'cache at the edge', category: 'network', strength: 'strong', hint: 'CDN.', services: 'CloudFront' },
  { phrase: 'failover routing', category: 'network', strength: 'strong', hint: 'DNS-level failover to a healthy endpoint.', services: 'Route 53 failover records + health checks' },
  { phrase: 'latency-based routing', category: 'network', strength: 'strong', hint: 'Send users to the fastest Region.', services: 'Route 53 latency routing' },
  { phrase: 'geolocation', category: 'network', strength: 'strong', hint: 'Route by where the user is.', services: 'Route 53 geolocation routing, CloudFront geo-restriction' },
  { phrase: 'dedicated connection', category: 'network', strength: 'strong', hint: 'A private line into AWS.', services: 'AWS Direct Connect' },
  { phrase: 'consistent network performance', category: 'network', strength: 'strong', hint: 'The internet is too variable — you need a private circuit.', services: 'Direct Connect', trap: 'A Site-to-Site VPN rides the public internet, so it cannot guarantee consistency.' },
  { phrase: 'on-premises', category: 'network', strength: 'strong', hint: 'Hybrid architecture.', services: 'Direct Connect, Site-to-Site VPN, Storage Gateway, Outposts' },
  { phrase: 'on premises', category: 'network', strength: 'strong', hint: 'Hybrid architecture.', services: 'Direct Connect, VPN, Storage Gateway' },
  { phrase: 'hybrid', category: 'network', strength: 'strong', hint: 'On-prem plus cloud.', services: 'Direct Connect, VPN, Storage Gateway, Outposts' },
  { phrase: 'connect hundreds of vpcs', category: 'network', strength: 'strong', hint: 'Hub-and-spoke instead of a mesh.', services: 'AWS Transit Gateway', trap: 'VPC peering does not scale — it has no transitive routing.' },
  { phrase: 'transitive', category: 'network', strength: 'strong', hint: 'Peering is NOT transitive.', services: 'Transit Gateway' },
  { phrase: 'nat gateway', category: 'network', strength: 'medium', hint: 'Outbound-only internet access for private subnets.' },
  { phrase: 'bastion', category: 'network', strength: 'medium', hint: 'Jump host — but the exam usually prefers Session Manager (no bastion, no open port).', services: 'Systems Manager Session Manager' },

  // ── Migration & transfer ────────────────────────────────────────────────
  { phrase: 'lift and shift', category: 'migration', strength: 'strong', hint: 'Move as-is; do not re-architect.', services: 'Application Migration Service, EC2, RDS' },
  { phrase: 'rehost', category: 'migration', strength: 'strong', hint: 'Move as-is.', services: 'Application Migration Service' },
  { phrase: 'petabytes', category: 'migration', strength: 'strong', hint: 'Too much to send over the wire.', services: 'AWS Snowball / Snowmobile', trap: 'Copying petabytes over the internet is the wrong answer — ship it.' },
  { phrase: 'limited bandwidth', category: 'migration', strength: 'strong', hint: 'The network is the constraint.', services: 'Snow family (offline), DataSync (online, optimized)' },
  { phrase: 'slow network', category: 'migration', strength: 'strong', hint: 'The network is the constraint.', services: 'Snow family, DataSync' },
  { phrase: 'continuous replication', category: 'migration', strength: 'strong', hint: 'Keep source and target in sync during cutover.', services: 'AWS DMS with CDC' },
  { phrase: 'different database engine', category: 'migration', strength: 'strong', hint: 'Heterogeneous migration — the schema must be converted too.', services: 'AWS DMS + Schema Conversion Tool (SCT)', trap: 'DMS alone does not convert schemas; you need SCT as well.' },
  { phrase: 'sftp', category: 'migration', strength: 'strong', hint: 'Managed SFTP/FTPS/FTP into S3.', services: 'AWS Transfer Family' },
  { phrase: 'migrate', category: 'migration', strength: 'weak', hint: 'Sets the scene — look for the constraint (downtime? bandwidth? engine change?).' },
  { phrase: 'migration', category: 'migration', strength: 'weak', hint: 'Sets the scene — look for the real constraint.' },

  // ── Weaker context words ────────────────────────────────────────────────
  { phrase: 'monitor', category: 'ops', strength: 'weak', hint: 'Metrics, logs and alarms.', services: 'Amazon CloudWatch' },
  { phrase: 'alarm', category: 'ops', strength: 'medium', hint: 'Threshold breach → notify or act.', services: 'CloudWatch alarm → SNS / Auto Scaling' },
  { phrase: 'patch', category: 'ops', strength: 'medium', hint: 'Patching is toil — prefer managed/serverless, or automate it.', services: 'Systems Manager Patch Manager' },
  { phrase: 'containers', category: 'ops', strength: 'medium', hint: 'ECS or EKS; on Fargate if overhead must be minimal.', services: 'ECS/EKS on Fargate' },
  { phrase: 'kubernetes', category: 'ops', strength: 'strong', hint: 'Kubernetes specifically.', services: 'Amazon EKS (Fargate for least overhead)' },
  { phrase: 'scale automatically', category: 'ops', strength: 'medium', hint: 'Auto Scaling, or a serverless service that scales itself.' },
  { phrase: 'automatically scale', category: 'ops', strength: 'medium', hint: 'Auto Scaling, or serverless.' },
]

// ---- matching internals (built lazily, once) ----
type Part = { text: string; trigger?: Trigger }
let _re: RegExp | null = null
let _map: Map<string, Trigger> | null = null

function ensureBuilt() {
  if (_re) return
  const sorted = [...TRIGGERS].sort((a, b) => b.phrase.length - a.phrase.length)
  _map = new Map(sorted.map(t => [t.phrase.toLowerCase(), t]))
  const escaped = sorted.map(t => escapeRegExp(t.phrase))
  _re = new RegExp('\\b(' + escaped.join('|') + ')', 'gi')
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Split text by an arbitrary list of phrases (used for a user's personal
// highlights). Case-insensitive, longest match first, no word boundaries
// (selections can start/end mid-word or include punctuation).
export function splitByPhrases(text: string, phrases: string[]): { text: string; matched: boolean }[] {
  const valid = Array.from(new Set(phrases.map(p => p.trim()).filter(Boolean)))
  if (valid.length === 0) return [{ text, matched: false }]
  const sorted = valid.sort((a, b) => b.length - a.length)
  const re = new RegExp('(' + sorted.map(escapeRegExp).join('|') + ')', 'gi')
  const out: { text: string; matched: boolean }[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), matched: false })
    out.push({ text: m[0], matched: true })
    last = m.index + m[0].length
    if (m.index === re.lastIndex) re.lastIndex++
  }
  if (last < text.length) out.push({ text: text.slice(last), matched: false })
  return out
}

// Split text into plain parts and trigger parts. Trigger parts carry the full
// Trigger, so the caller can colour by category and rank by strength.
export function splitKeywords(text: string): Part[] {
  ensureBuilt()
  const re = _re!
  re.lastIndex = 0
  const parts: Part[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) })
    const matched = m[0]
    parts.push({ text: matched, trigger: _map!.get(matched.toLowerCase()) })
    last = m.index + matched.length
    if (m.index === re.lastIndex) re.lastIndex++ // guard against zero-length matches
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}
