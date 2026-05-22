import { Command } from 'commander';

export function parseArgs(argv = process.argv) {
  const program = new Command();

  program
    .name('content-audit-pro')
    .description('CLI-first content audit tool for SEO/content cleanup reports.')
    .requiredOption('--url <url>', 'Sitemap URL, website URL, or WordPress REST base URL')
    .option('--source <source>', 'Input source: sitemap, urls, or wp', 'sitemap')
    .option('--urls <path>', 'Path to a newline-separated URL list when --source urls is used')
    .option('--limit <number>', 'Maximum number of URLs to audit', parsePositiveInt, 50)
    .option('--out <path>', 'Output folder', 'audits/content/latest')
    .option('--format <formats>', 'Comma-separated output formats', 'json')
    .option('--cache-dir <path>', 'Cache root folder for re-audit comparison', '.cache/content-audit')
    .option('--no-cache', 'Disable cache read/write and delta comparison')
    .option('--use-llm', 'Call the configured LLM for candidates from llm_candidates.json')
    .option('--llm-model <model>', 'LLM model name', 'gpt-4.1-mini')
    .option('--llm-api-url <url>', 'LLM chat completions API URL', 'https://api.openai.com/v1/chat/completions')
    .option('--llm-max-candidates <number>', 'Maximum LLM candidates to review in one run', parsePositiveInt, 5)
    .option('--llm-cache-dir <path>', 'Cache folder for LLM decisions', '.cache/content-audit/llm-decisions')
    .option('--prompt-dir <path>', 'Prompt contract folder', 'scripts/content-audit/prompts')
    .option('--timeout-ms <number>', 'Fetch timeout in milliseconds', parsePositiveInt, 15000)
    .option('--user-agent <value>', 'User agent used when fetching pages', 'ContentAuditPro/0.1 (+https://github.com/hieutaosinh/content-audit-pro)');

  program.parse(argv);
  const options = program.opts();

  const source = String(options.source || '').toLowerCase();
  if (!['sitemap', 'urls', 'wp'].includes(source)) {
    throw new Error(`Unsupported --source "${options.source}". Use sitemap, urls, or wp.`);
  }

  return {
    url: options.url,
    source,
    urlsPath: options.urls || null,
    limit: options.limit,
    outDir: options.out,
    formats: String(options.format || 'json').split(',').map((item) => item.trim()).filter(Boolean),
    cacheEnabled: options.cache !== false,
    cacheDir: options.cacheDir,
    useLlm: Boolean(options.useLlm),
    llmModel: options.llmModel,
    llmApiUrl: options.llmApiUrl,
    llmMaxCandidates: options.llmMaxCandidates,
    llmCacheDir: options.llmCacheDir,
    promptDir: options.promptDir,
    timeoutMs: options.timeoutMs,
    userAgent: options.userAgent
  };
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received: ${value}`);
  }
  return parsed;
}
