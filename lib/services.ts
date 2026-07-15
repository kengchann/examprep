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

// Minimum score margin the top service must have over the runner-up before
// we commit to it. Below this, the question likely references multiple
// services (Lambda + DynamoDB + IAM, say) without a clear single focus —
// per spec, we leave `service` empty rather than guess.
const MIN_MARGIN = 2

// Pick the single AWS service a question is primarily testing, or null if
// no service is named or several are too close to call. Question text
// counts double over answer options (mirrors classifyTopic).
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
  const best = scores[0]
  const second = scores[1]
  if (second && best.score - second.score < MIN_MARGIN) return null
  return best.service
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
