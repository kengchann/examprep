// Built-in "trigger word" dictionary for AWS SAA-C03 style questions.
// The exam loves certain phrases that strongly hint at a service or strategy.
// We auto-highlight these in question text and show a short hint on tap, so
// students learn to recognize the pattern ("see keyword → know the answer").
//
// Notes for editing:
// - Phrases are matched case-insensitively, on word boundaries.
// - Include hyphen AND space variants separately (e.g. "real-time" / "real time").
// - Longer phrases win over shorter ones at the same spot (e.g. "most
//   cost-effective" is highlighted as one unit, not just "cost-effective").

export type Trigger = { phrase: string; hint: string }

export const TRIGGERS: Trigger[] = [
  // Cost
  { phrase: 'most cost-effective', hint: 'Cheapest option — think Spot, S3 lifecycle/Glacier, serverless, right-sizing.' },
  { phrase: 'cost-effective', hint: 'Optimize cost — managed/serverless services, lifecycle to cheaper storage.' },
  { phrase: 'cost effective', hint: 'Optimize cost — managed/serverless services, lifecycle to cheaper storage.' },
  { phrase: 'reduce costs', hint: 'Cut spend — Spot, Savings Plans/Reserved, lifecycle to IA/Glacier, serverless.' },
  // Operational overhead
  { phrase: 'least operational overhead', hint: 'Least to manage — pick fully-managed / serverless (Lambda, Fargate, Aurora Serverless).' },
  { phrase: 'lowest operational overhead', hint: 'Least to manage — fully-managed / serverless services.' },
  { phrase: 'minimal operational overhead', hint: 'Least to manage — fully-managed / serverless services.' },
  { phrase: 'least operational effort', hint: 'Least to manage — fully-managed / serverless services.' },
  { phrase: 'least management overhead', hint: 'Least to manage — fully-managed / serverless services.' },
  { phrase: 'without managing servers', hint: 'Serverless — Lambda, Fargate, S3, DynamoDB.' },
  { phrase: 'no servers to manage', hint: 'Serverless — Lambda, Fargate, S3, DynamoDB.' },
  { phrase: 'fully managed', hint: 'Prefer an AWS-managed service (RDS/Aurora, Fargate, MSK, OpenSearch).' },
  { phrase: 'serverless', hint: 'Lambda, Fargate, S3, DynamoDB, API Gateway, Aurora Serverless.' },
  // Availability / resilience
  { phrase: 'highly available', hint: 'Multiple AZs, Multi-AZ, ELB + Auto Scaling.' },
  { phrase: 'high availability', hint: 'Multiple AZs, Multi-AZ, ELB + Auto Scaling.' },
  { phrase: 'fault tolerant', hint: 'Tolerate failure — Multi-AZ / multi-Region, decouple with SQS.' },
  { phrase: 'fault tolerance', hint: 'Tolerate failure — Multi-AZ / multi-Region, decouple with SQS.' },
  { phrase: 'disaster recovery', hint: 'DR — cross-Region backup/replication; pilot light / warm standby.' },
  { phrase: 'resilient', hint: 'Multi-AZ, decoupling (SQS/SNS), Auto Scaling.' },
  // Performance / latency
  { phrase: 'lowest latency', hint: 'Edge/caching — CloudFront, Global Accelerator, ElastiCache, read replicas.' },
  { phrase: 'low latency', hint: 'Edge/caching — CloudFront, Global Accelerator, ElastiCache, read replicas.' },
  { phrase: 'real-time', hint: 'Streaming — Kinesis Data Streams / Amazon MSK (Kafka).' },
  { phrase: 'real time', hint: 'Streaming — Kinesis Data Streams / Amazon MSK (Kafka).' },
  { phrase: 'near-real-time', hint: 'Kinesis Data Firehose / streaming.' },
  { phrase: 'in-memory', hint: 'ElastiCache (Redis/Memcached); DAX for DynamoDB.' },
  { phrase: 'caching', hint: 'CloudFront (edge), ElastiCache, DAX.' },
  // Decoupling / messaging
  { phrase: 'decouple', hint: 'Use SQS (queue) or SNS (pub/sub) / EventBridge.' },
  { phrase: 'decoupling', hint: 'Use SQS (queue) or SNS (pub/sub) / EventBridge.' },
  { phrase: 'loosely coupled', hint: 'SQS / SNS / EventBridge.' },
  { phrase: 'queue', hint: 'Amazon SQS (use FIFO for ordering / exactly-once).' },
  { phrase: 'exactly once', hint: 'SQS FIFO queue.' },
  { phrase: 'notify', hint: 'Amazon SNS (fan-out notifications: email/SMS/HTTP).' },
  { phrase: 'notification', hint: 'Amazon SNS.' },
  // Data stores
  { phrase: 'data warehouse', hint: 'Amazon Redshift.' },
  { phrase: 'relational database', hint: 'Amazon RDS / Aurora.' },
  { phrase: 'nosql', hint: 'Amazon DynamoDB.' },
  { phrase: 'object storage', hint: 'Amazon S3.' },
  { phrase: 'shared file system', hint: 'Amazon EFS (Linux) / FSx.' },
  { phrase: 'shared storage', hint: 'Amazon EFS / FSx.' },
  { phrase: 'block storage', hint: 'Amazon EBS.' },
  { phrase: 'session state', hint: 'Store in DynamoDB or ElastiCache (Redis).' },
  // Big data / ETL
  { phrase: 'extract, transform, and load', hint: 'AWS Glue (managed ETL).' },
  { phrase: 'petabytes', hint: 'Big data/transfer — Snow family, Redshift, S3, EMR.' },
  { phrase: 'petabyte', hint: 'Big data/transfer — Snow family, Redshift, S3, EMR.' },
  // Storage tiering
  { phrase: 'infrequently accessed', hint: 'S3 lifecycle → Standard-IA; or Intelligent-Tiering.' },
  { phrase: 'rarely accessed', hint: 'S3 lifecycle → Glacier / Deep Archive.' },
  { phrase: 'long-term', hint: 'Archive — S3 Glacier / Deep Archive via lifecycle.' },
  { phrase: 'archive', hint: 'S3 Glacier; "instant" retrieval → Glacier Instant Retrieval.' },
  // Security / identity
  { phrase: 'encrypt', hint: 'KMS; SSE-KMS/SSE-S3; TLS in transit.' },
  { phrase: 'encryption', hint: 'KMS; SSE-KMS/SSE-S3; TLS in transit.' },
  { phrase: 'rotate', hint: 'Customer-managed KMS keys / Secrets Manager rotation.' },
  { phrase: 'audit', hint: 'CloudTrail (API/data events), AWS Config, Audit Manager.' },
  { phrase: 'compliance', hint: 'AWS Config, CloudTrail, Audit Manager, Artifact.' },
  { phrase: 'track api calls', hint: 'AWS CloudTrail.' },
  { phrase: 'single sign-on', hint: 'IAM Identity Center (SSO) / SAML federation.' },
  { phrase: 'temporary credentials', hint: 'IAM roles + STS (AssumeRole) — no long-lived keys.' },
  { phrase: 'multiple accounts', hint: 'AWS Organizations + SCPs; cross-account roles.' },
  { phrase: 'service control policies', hint: 'SCPs — org-wide guardrails (deny actions).' },
  { phrase: 'ddos', hint: 'AWS Shield (Advanced) + WAF.' },
  { phrase: 'sql injection', hint: 'AWS WAF (web ACL rules).' },
  { phrase: 'web application firewall', hint: 'AWS WAF.' },
  // Networking
  { phrase: 'private subnet', hint: 'No internet — use VPC endpoints; NAT only for outbound IPv4.' },
  { phrase: 'without using the internet', hint: 'VPC endpoint — gateway (S3/DynamoDB) or interface/PrivateLink.' },
  { phrase: 'on-premises', hint: 'Hybrid — Direct Connect / VPN / Storage Gateway / Outposts.' },
  { phrase: 'on premises', hint: 'Hybrid — Direct Connect / VPN / Storage Gateway / Outposts.' },
  { phrase: 'hybrid', hint: 'Direct Connect / Site-to-Site VPN / Outposts / Storage Gateway.' },
  // Compute / scaling
  { phrase: 'automatically scale', hint: 'Auto Scaling group / serverless auto-scaling.' },
  { phrase: 'scale automatically', hint: 'Auto Scaling group / serverless auto-scaling.' },
  { phrase: 'unpredictable', hint: 'Spiky load — serverless or Auto Scaling; pay-per-use.' },
  { phrase: 'containers', hint: 'ECS/EKS on Fargate (serverless containers).' },
  { phrase: 'kubernetes', hint: 'Amazon EKS (Fargate for least overhead).' },
  // Delivery / certs
  { phrase: 'static content', hint: 'S3 + CloudFront.' },
  { phrase: 'content delivery', hint: 'Amazon CloudFront (CDN).' },
  { phrase: 'tls certificate', hint: 'AWS Certificate Manager (free public certs, auto-renew).' },
  { phrase: 'ssl certificate', hint: 'AWS Certificate Manager (free public certs, auto-renew).' },
  // Migration / monitoring
  { phrase: 'migrate', hint: 'DMS/SCT (databases), Snow family, Application Migration Service.' },
  { phrase: 'migration', hint: 'DMS/SCT (databases), Snow family, Application Migration Service.' },
  { phrase: 'monitor', hint: 'Amazon CloudWatch (metrics, logs, alarms).' },
  { phrase: 'alarm', hint: 'CloudWatch alarm (→ SNS / Auto Scaling / EventBridge).' },
]

// ---- matching internals (built lazily, once) ----
type Part = { text: string; hint?: string }
let _re: RegExp | null = null
let _map: Map<string, string> | null = null

function ensureBuilt() {
  if (_re) return
  const sorted = [...TRIGGERS].sort((a, b) => b.phrase.length - a.phrase.length)
  _map = new Map(sorted.map(t => [t.phrase.toLowerCase(), t.hint]))
  const escaped = sorted.map(t => t.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  _re = new RegExp('\\b(' + escaped.join('|') + ')\\b', 'gi')
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

// Split text into plain + highlighted parts. Highlighted parts carry a hint.
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
    parts.push({ text: matched, hint: _map!.get(matched.toLowerCase()) })
    last = m.index + matched.length
    if (m.index === re.lastIndex) re.lastIndex++ // guard against zero-length matches
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}
