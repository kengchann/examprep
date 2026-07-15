import { createClient } from './supabase'
import type { Question } from './types'

// Service-level classification for AWS SAA-C03 questions — a second,
// finer-grained layer on top of the broad Topic clusters in `topics.ts`.
//
// A question stays in its broad topic (e.g. "Databases") for mastery
// tracking, but is also tagged with the single primary AWS service it's
// really testing (e.g. "Aurora"), so students can drill one service at a
// time. Same keyword-scoring approach as topics.ts, reused deliberately —
// but per-service instead of per-domain, and stricter: if no service wins
// clearly (question mentions several evenly, or none by name), we leave it
// unclassified rather than guess.

export const AWS_SERVICES = [
  'EC2', 'Lambda', 'ECS', 'EKS', 'Fargate', 'Elastic Beanstalk', 'Auto Scaling', 'Lightsail',
  'Amazon S3', 'EBS', 'EFS', 'FSx', 'Storage Gateway', 'Snow Family', 'AWS Backup', 'DataSync',
  'Amazon RDS', 'Aurora', 'DynamoDB', 'ElastiCache', 'DocumentDB', 'Neptune', 'Redshift',
  'VPC', 'Route 53', 'CloudFront', 'Elastic Load Balancing', 'Direct Connect', 'VPN',
  'Transit Gateway', 'Global Accelerator', 'API Gateway',
  'IAM', 'KMS', 'Cognito', 'Secrets Manager', 'ACM', 'WAF', 'Shield', 'GuardDuty', 'Macie',
  'Organizations', 'STS', 'Directory Service',
  'SQS', 'SNS', 'EventBridge', 'Step Functions', 'Amazon MQ',
  'Kinesis', 'Athena', 'AWS Glue', 'EMR', 'QuickSight', 'OpenSearch', 'MSK',
  'CloudWatch', 'CloudTrail', 'AWS Config', 'Systems Manager', 'CloudFormation',
  'Trusted Advisor', 'Control Tower', 'DMS', 'X-Ray',
] as const

export type AwsService = (typeof AWS_SERVICES)[number]

// Phrases that identify each service. Longer/more specific phrases first
// doesn't matter here (we count total hits, not first match), but each
// phrase must be distinctive enough not to bleed into a different service.
const SERVICE_KEYWORDS: Record<AwsService, string[]> = {
  'EC2': ['ec2', 'elastic compute cloud', 'ec2 instance'],
  'Lambda': ['lambda', 'aws lambda'],
  'ECS': ['ecs', 'elastic container service'],
  'EKS': ['eks', 'elastic kubernetes', 'kubernetes'],
  'Fargate': ['fargate'],
  'Elastic Beanstalk': ['elastic beanstalk', 'beanstalk'],
  'Auto Scaling': ['auto scaling group', 'auto scaling', 'launch template', 'launch configuration'],
  'Lightsail': ['lightsail'],
  'Amazon S3': ['amazon s3', 's3 bucket', 's3 standard', 's3 glacier', 'glacier', 'deep archive', 'intelligent-tiering', 'intelligent tiering', ' s3 ', 's3.'],
  'EBS': ['ebs', 'elastic block store'],
  'EFS': ['efs', 'elastic file system'],
  'FSx': ['fsx'],
  'Storage Gateway': ['storage gateway', 'file gateway', 'volume gateway', 'tape gateway'],
  'Snow Family': ['snowball', 'snowcone', 'snowmobile', 'snow family'],
  'AWS Backup': ['aws backup'],
  'DataSync': ['datasync'],
  'Amazon RDS': ['amazon rds', 'rds proxy', 'relational database service', ' rds '],
  'Aurora': ['aurora'],
  'DynamoDB': ['dynamodb', 'dynamo db', 'dax'],
  'ElastiCache': ['elasticache', 'redis', 'memcached'],
  'DocumentDB': ['documentdb'],
  'Neptune': ['neptune'],
  'Redshift': ['redshift'],
  'VPC': ['vpc', 'subnet', 'nat gateway', 'nat instance', 'internet gateway', 'vpc peering', 'security group', 'network acl', 'vpc endpoint', 'privatelink', 'private link'],
  'Route 53': ['route 53', 'route53'],
  'CloudFront': ['cloudfront'],
  'Elastic Load Balancing': ['load balancer', 'application load balancer', 'network load balancer', 'gateway load balancer', ' alb ', ' nlb ', ' elb '],
  'Direct Connect': ['direct connect'],
  'VPN': ['site-to-site vpn', 'client vpn', ' vpn '],
  'Transit Gateway': ['transit gateway'],
  'Global Accelerator': ['global accelerator'],
  'API Gateway': ['api gateway'],
  'IAM': ['iam', 'identity and access management', 'assume role', 'permissions boundary', 'access key'],
  'KMS': ['kms', 'key management service', 'customer managed key', 'cmk'],
  'Cognito': ['cognito'],
  'Secrets Manager': ['secrets manager'],
  'ACM': ['certificate manager', ' acm ', 'tls certificate', 'ssl certificate'],
  'WAF': ['aws waf', 'web application firewall', ' waf '],
  'Shield': ['aws shield', 'shield advanced', 'ddos'],
  'GuardDuty': ['guardduty'],
  'Macie': ['macie'],
  'Organizations': ['aws organizations', 'service control polic', 'scp'],
  'STS': ['security token service', ' sts '],
  'Directory Service': ['directory service', 'active directory'],
  'SQS': ['sqs', 'simple queue service', 'fifo queue', 'dead-letter queue', 'dead letter queue'],
  'SNS': ['sns', 'simple notification service'],
  'EventBridge': ['eventbridge', 'cloudwatch events'],
  'Step Functions': ['step functions'],
  'Amazon MQ': ['amazon mq', 'rabbitmq'],
  'Kinesis': ['kinesis', 'data stream', 'data firehose'],
  'Athena': ['athena'],
  'AWS Glue': ['aws glue', 'glue job', 'glue crawler'],
  'EMR': ['amazon emr', 'elastic mapreduce', ' emr '],
  'QuickSight': ['quicksight'],
  'OpenSearch': ['opensearch', 'elasticsearch'],
  'MSK': ['managed streaming for kafka', 'amazon msk', ' msk ', 'kafka'],
  'CloudWatch': ['cloudwatch', 'cloudwatch alarm', 'cloudwatch logs', 'cloudwatch metric'],
  'CloudTrail': ['cloudtrail'],
  'AWS Config': ['aws config', 'config rule'],
  'Systems Manager': ['systems manager', 'ssm', 'session manager', 'run command', 'parameter store'],
  'CloudFormation': ['cloudformation'],
  'Trusted Advisor': ['trusted advisor'],
  'Control Tower': ['control tower'],
  'DMS': ['database migration service', 'aws dms', 'schema conversion tool', ' dms '],
  'X-Ray': ['x-ray', 'aws x-ray'],
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const SERVICE_RE: { service: AwsService; re: RegExp }[] = AWS_SERVICES.map(service => ({
  service,
  re: new RegExp('\\b(' + SERVICE_KEYWORDS[service].map(k => escapeRegExp(k.trim())).join('|') + ')', 'gi'),
}))

// A question needs at least this raw score for its top service before we
// commit. A lone weak mention (score 1) stays unclassified rather than guessed.
const MIN_SCORE = 2

// When the top services are within this many points of each other, the raw
// keyword count can't tell them apart, so we break the tie by primacy (below)
// instead of by score — e.g. a question that mentions RDS and, in passing, an
// EC2 host and a KMS key is really an RDS question.
const TIE_BAND = 1

// Primacy: how likely a service is to be the SUBJECT a question is testing,
// rather than a supporting actor. Lower = preferred when scores are close.
// Subject services (databases, storage, app-compute, integration, analytics,
// delivery) win over hosts (EC2/ELB/Auto Scaling), which win over cross-cutting
// concerns (IAM, KMS, VPC, monitoring, org/security tooling) that show up in
// almost every scenario. Anything unlisted is treated as cross-cutting.
const SUBJECT_SERVICES: AwsService[] = [
  'DynamoDB', 'Aurora', 'Amazon RDS', 'ElastiCache', 'DocumentDB', 'Neptune', 'Redshift',
  'Amazon S3', 'EFS', 'FSx', 'EBS', 'Storage Gateway', 'Snow Family', 'AWS Backup', 'DataSync',
  'Lambda', 'ECS', 'EKS', 'Fargate', 'Elastic Beanstalk', 'Lightsail',
  'SQS', 'SNS', 'EventBridge', 'Step Functions', 'Amazon MQ',
  'Kinesis', 'Athena', 'AWS Glue', 'EMR', 'QuickSight', 'OpenSearch', 'MSK',
  'CloudFront', 'API Gateway', 'Route 53', 'Global Accelerator',
]
const HOST_SERVICES: AwsService[] = ['EC2', 'Auto Scaling', 'Elastic Load Balancing']

function primacy(service: AwsService): number {
  const s = SUBJECT_SERVICES.indexOf(service)
  if (s >= 0) return s                 // 0..N — most subject-like first
  const h = HOST_SERVICES.indexOf(service)
  if (h >= 0) return 100 + h           // hosts sit below every subject
  return 200                           // cross-cutting concerns last
}

// Pick the single AWS service a question is primarily testing, or null if no
// service is confidently named. Question text counts double over answer
// options (mirrors classifyTopic). Among services within TIE_BAND of the top
// score, the most subject-like one wins.
export function classifyService(questionText: string, options: string[] = []): AwsService | null {
  const q = ' ' + (questionText || '').toLowerCase() + ' '
  const opt = ' ' + options.join(' ').toLowerCase() + ' '

  const scores: { service: AwsService; score: number }[] = []
  for (const { service, re } of SERVICE_RE) {
    re.lastIndex = 0
    const qHits = (q.match(re) || []).length
    re.lastIndex = 0
    const optHits = (opt.match(re) || []).length
    const score = qHits * 2 + optHits
    if (score > 0) scores.push({ service, score })
  }
  if (scores.length === 0) return null

  scores.sort((a, b) => b.score - a.score)
  const top = scores[0].score
  if (top < MIN_SCORE) return null

  const contenders = scores.filter(s => top - s.score <= TIE_BAND)
  contenders.sort((a, b) => primacy(a.service) - primacy(b.service))
  return contenders[0].service
}

// ---- "Study by Service" data access (mirrors mistakes.ts / bookmarks.ts) ----

export type ServiceCount = { service: string; count: number }

// Virtual "service" bucket for questions with no assigned AWS service (service
// is null/empty) — the same set Admin groups under "(unclassified)". Not a real
// service; just a grouping so every question stays reachable in Study by
// Service. A real service can never be named this (see AWS_SERVICES).
export const UNCLASSIFIED = 'Unclassified'

// How many questions exist per service, most-populous first, with the
// Unclassified bucket pinned last. One query + one aggregation over the whole
// bank, so these counts always match Admin's. RLS still applies (trial users
// only see their allotted first-N questions per bank).
export async function fetchServiceCounts(): Promise<ServiceCount[]> {
  const supabase = createClient()
  const { data } = await supabase.from('questions').select('service')
  const counts = new Map<string, number>()
  let unclassified = 0
  for (const r of (data ?? []) as { service: string | null }[]) {
    if (!r.service) { unclassified++; continue }
    counts.set(r.service, (counts.get(r.service) || 0) + 1)
  }
  const out = Array.from(counts, ([service, count]) => ({ service, count })).sort((a, b) => b.count - a.count)
  if (unclassified > 0) out.push({ service: UNCLASSIFIED, count: unclassified })
  return out
}

// Full question rows for one AWS service, shuffled for variety. The
// UNCLASSIFIED sentinel returns every question with no service (null/empty).
export async function fetchQuestionsByService(service: string): Promise<Question[]> {
  const supabase = createClient()
  const query = supabase.from('questions').select('*')
  const { data } = service === UNCLASSIFIED
    ? await query.or('service.is.null,service.eq.')
    : await query.eq('service', service)
  const qs = (data ?? []) as Question[]
  return qs.sort(() => Math.random() - 0.5)
}
