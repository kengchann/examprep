// Topic clustering for AWS SAA-C03 questions.
//
// Instead of dozens of micro-topics, every question is classified into one of a
// small set of clear domains. This powers the adaptive "Practice weak areas"
// mode — coarse, meaningful buckets are far more useful than 50 tiny ones.
//
// Classification is keyword-based: we score the question text (and options) for
// each domain's service names and pick the strongest match. Imperfect but fast,
// free, and re-runnable.

export const TOPICS = [
  'Compute',
  'Storage',
  'Databases',
  'Networking & Content Delivery',
  'Security & Identity',
  'Application Integration',
  'Analytics & Streaming',
  'Management & Monitoring',
] as const

export type Topic = (typeof TOPICS)[number] | 'General'

// Phrases that signal each domain. Multi-word names are matched as a unit.
const DOMAIN_KEYWORDS: Record<(typeof TOPICS)[number], string[]> = {
  'Compute': [
    'ec2', 'lambda', 'fargate', 'ecs', 'eks', 'elastic container', 'auto scaling',
    'elastic beanstalk', 'beanstalk', 'aws batch', 'lightsail', 'app runner',
    'launch template', 'launch configuration', 'spot instance', 'spot instances',
    'reserved instance', 'savings plan', 'placement group', 'ami', 'capacity provider',
    'application load balancer free tier', 'graviton', 'nitro',
  ],
  'Storage': [
    'amazon s3', 's3 bucket', 's3 standard', 's3 glacier', 'glacier', 'deep archive',
    'intelligent-tiering', 'intelligent tiering', 'lifecycle', 'ebs', 'elastic block',
    'efs', 'elastic file', 'fsx', 'storage gateway', 'snowball', 'snowcone', 'snowmobile',
    'snow family', 'aws backup', 'datasync', 'transfer family', 'object storage',
    'file gateway', 'volume gateway', 'multipart upload', 's3 replication', 's3 versioning',
  ],
  'Databases': [
    'rds', 'aurora', 'dynamodb', 'elasticache', 'redis', 'memcached', 'documentdb',
    'neptune', 'keyspaces', 'timestream', 'memorydb', 'dax', 'rds proxy', 'read replica',
    'multi-az', 'database migration service', 'aws dms', ' dms', 'schema conversion',
    'babelfish', 'relational database', 'point-in-time recovery', 'point in time recovery',
  ],
  'Networking & Content Delivery': [
    'vpc', 'subnet', 'route 53', 'route53', 'cloudfront', 'load balancer', 'alb', 'nlb',
    'gateway load balancer', 'elb', 'direct connect', 'site-to-site vpn', 'vpn', 'transit gateway',
    'global accelerator', 'api gateway', 'nat gateway', 'nat instance', 'internet gateway',
    'privatelink', 'private link', 'vpc endpoint', 'gateway endpoint', 'interface endpoint',
    'vpc peering', 'security group', 'network acl', 'cidr', 'elastic ip', 'edge location',
    'content delivery', 'dns', 'app mesh', 'cloud map',
  ],
  'Security & Identity': [
    'iam', 'identity and access', 'kms', 'key management', 'cognito', 'secrets manager',
    'certificate manager', 'acm', 'aws waf', ' waf', 'shield', 'guardduty', 'macie',
    'inspector', 'security hub', 'organizations', 'service control polic', 'scp', 'sts',
    'assume role', 'directory service', 'active directory', 'firewall manager', 'network firewall',
    'detective', 'audit manager', 'permissions boundary', 'access key', 'encryption', 'encrypt',
    'mfa', 'parameter store', 'iam identity center', 'single sign-on', 'sso', 'resource access manager',
  ],
  'Application Integration': [
    'sqs', 'simple queue', 'sns', 'simple notification', 'eventbridge', 'cloudwatch events',
    'step functions', 'amazon mq', 'rabbitmq', 'appflow', 'simple workflow', 'swf',
    'message queue', 'fifo queue', 'dead-letter', 'dead letter', 'fan-out', 'fan out', 'decouple',
  ],
  'Analytics & Streaming': [
    'kinesis', 'athena', 'aws glue', 'glue', 'emr', 'elastic mapreduce', 'quicksight',
    'data pipeline', 'lake formation', 'opensearch', 'elasticsearch', 'msk', 'managed kafka',
    'kafka', 'redshift', 'data warehouse', 'data lake', 'firehose', 'data stream',
  ],
  'Management & Monitoring': [
    'cloudwatch', 'cloudtrail', 'aws config', 'config rule', 'systems manager', 'ssm',
    'session manager', 'run command', 'cloudformation', 'trusted advisor', 'control tower',
    'service catalog', 'compute optimizer', 'aws health', 'cost explorer', 'budgets',
    'cost and usage', 'tags', 'tagging', 'aws cdk', 'parameter store',
  ],
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// One compiled regex per domain (built once).
const DOMAIN_RE: { topic: (typeof TOPICS)[number]; re: RegExp }[] = TOPICS.map(topic => ({
  topic,
  re: new RegExp('\\b(' + DOMAIN_KEYWORDS[topic].map(escapeRegExp).join('|') + ')', 'gi'),
}))

// Pick the best-fitting domain for a question. The question text counts double
// (the question is more telling than the answer options).
export function classifyTopic(questionText: string, options: string[] = []): Topic {
  const q = (questionText || '').toLowerCase()
  const opt = options.join(' ').toLowerCase()
  let best: (typeof TOPICS)[number] | null = null
  let bestScore = 0
  for (const { topic, re } of DOMAIN_RE) {
    re.lastIndex = 0
    const qHits = (q.match(re) || []).length
    re.lastIndex = 0
    const optHits = (opt.match(re) || []).length
    const score = qHits * 2 + optHits
    if (score > bestScore) { bestScore = score; best = topic }
  }
  return best ?? 'General'
}
