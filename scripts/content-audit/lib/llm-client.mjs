import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4.1-mini';

export async function buildLlmDecisions({ candidatesResult, inventory = [], findings = [], clusters = [], options, generatedAt, paths }) {
  const candidates = candidatesResult?.candidates || [];
  const selected = candidates.slice(0, options.llmMaxCandidates);
  const context = buildLookupContext({ inventory, findings, clusters });

  if (!options.useLlm) {
    return disabledResult({ generatedAt, candidates, selected, reason: 'LLM is disabled. Run with --use-llm to review candidates.' });
  }

  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return disabledResult({ generatedAt, candidates, selected, reason: 'Missing LLM_API_KEY or OPENAI_API_KEY environment variable.' });
  }

  await mkdir(path.dirname(paths.llmLog), { recursive: true });
  await mkdir(options.llmCacheDir, { recursive: true });

  const decisions = [];
  for (const candidate of selected) {
    const cachePath = path.join(options.llmCacheDir, `${safeFileName(candidate.cache_key || candidate.candidate_id)}.json`);
    const cached = await readCachedDecision(cachePath);
    if (cached) {
      decisions.push({ ...cached, source: 'cache' });
      continue;
    }

    const decision = await reviewCandidate({ candidate, context, options, generatedAt, logPath: paths.llmLog });
    await writeFile(cachePath, `${JSON.stringify(decision, null, 2)}\n`, 'utf8');
    decisions.push(decision);
  }

  return {
    enabled: true,
    model: options.llmModel,
    api_url: options.llmApiUrl,
    generated_at: generatedAt,
    total_candidates: candidates.length,
    selected_candidates: selected.length,
    decisions_count: decisions.length,
    skipped_candidates: Math.max(0, candidates.length - selected.length),
    log_path: paths.llmLog,
    cache_dir: options.llmCacheDir,
    summary: summarizeDecisions(decisions),
    decisions
  };
}

async function reviewCandidate({ candidate, context, options, generatedAt, logPath }) {
  const input = buildCandidateInput(candidate, context);
  const prompt = await loadPrompt(candidate.recommended_prompt, options.promptDir);
  const requestBody = {
    model: options.llmModel || DEFAULT_MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a cautious SEO content auditor. Return JSON only. Never recommend direct destructive changes without human approval.'
      },
      {
        role: 'user',
        content: `${prompt}\n\nAUDIT_INPUT_JSON:\n${JSON.stringify(input, null, 2)}`
      }
    ]
  };

  const startedAt = new Date().toISOString();
  await appendJsonLine(logPath, { event: 'llm_request', candidate_id: candidate.candidate_id, type: candidate.type, model: requestBody.model, started_at: startedAt });

  try {
    const response = await fetch(options.llmApiUrl || DEFAULT_API_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.LLM_API_KEY || process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`LLM API error ${response.status}: ${raw.slice(0, 500)}`);
    }

    const parsed = JSON.parse(raw);
    const content = parsed.choices?.[0]?.message?.content;
    if (!content) throw new Error('LLM response did not include choices[0].message.content.');

    const output = JSON.parse(content);
    const decision = normalizeDecision({ candidate, output, generatedAt, model: requestBody.model, source: 'api' });
    await appendJsonLine(logPath, { event: 'llm_response', candidate_id: candidate.candidate_id, status: 'ok', finished_at: new Date().toISOString() });
    return decision;
  } catch (error) {
    const failed = failedDecision({ candidate, error, generatedAt, model: requestBody.model });
    await appendJsonLine(logPath, { event: 'llm_response', candidate_id: candidate.candidate_id, status: 'failed', error: error.message, finished_at: new Date().toISOString() });
    return failed;
  }
}

function buildLookupContext({ inventory, findings, clusters }) {
  return {
    pageByUrl: new Map(inventory.map((page) => [page.url, page])),
    findingByUrl: new Map(findings.map((finding) => [finding.url, finding])),
    clusterById: new Map(clusters.map((cluster) => [cluster.cluster_id, cluster]))
  };
}

function buildCandidateInput(candidate, context) {
  if (candidate.type === 'cluster') {
    const cluster = context.clusterById.get(candidate.cluster_id) || candidate;
    return {
      candidate,
      cluster,
      pages: (cluster.urls || []).map((url) => ({
        page: slimPage(context.pageByUrl.get(url)),
        finding: context.findingByUrl.get(url) || null
      }))
    };
  }

  return {
    candidate,
    page: slimPage(context.pageByUrl.get(candidate.url)),
    finding: context.findingByUrl.get(candidate.url) || null
  };
}

function slimPage(page = {}) {
  return {
    url: page.url,
    status: page.status,
    title: page.title,
    meta_description: page.meta_description,
    canonical: page.canonical,
    h1: page.h1,
    h2: Array.isArray(page.h2) ? page.h2.slice(0, 12) : [],
    h3: Array.isArray(page.h3) ? page.h3.slice(0, 12) : [],
    word_count: page.word_count,
    internal_links_count: Array.isArray(page.internal_links) ? page.internal_links.length : 0,
    external_links_count: Array.isArray(page.external_links) ? page.external_links.length : 0,
    images_total: page.images_total,
    images_missing_alt: page.images_missing_alt,
    published_at: page.published_at,
    modified_at: page.modified_at,
    category: page.category,
    tags: page.tags,
    content_hash: page.content_hash
  };
}

async function loadPrompt(promptName, promptDir) {
  const safeName = promptName.endsWith('.md') ? promptName : `${promptName}.md`;
  const promptPath = path.join(promptDir, safeName);
  return readFile(promptPath, 'utf8');
}

async function readCachedDecision(cachePath) {
  try {
    const content = await readFile(cachePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function normalizeDecision({ candidate, output, generatedAt, model, source }) {
  return {
    candidate_id: candidate.candidate_id,
    type: candidate.type,
    source,
    status: 'reviewed',
    model,
    generated_at: generatedAt,
    advisory_only: true,
    requires_human_approval: output.requires_human_approval !== false,
    recommendation: sanitizeRecommendation(output.recommendation),
    confidence: sanitizeConfidence(output.confidence),
    reason_vi: String(output.reason_vi || output.reason || '').slice(0, 2000),
    suggested_actions: Array.isArray(output.suggested_actions) ? output.suggested_actions.slice(0, 10) : [],
    risks: Array.isArray(output.risks) ? output.risks.slice(0, 10) : [],
    next_review_questions: Array.isArray(output.next_review_questions) ? output.next_review_questions.slice(0, 10) : [],
    raw: output
  };
}

function failedDecision({ candidate, error, generatedAt, model }) {
  return {
    candidate_id: candidate.candidate_id,
    type: candidate.type,
    source: 'api',
    status: 'failed',
    model,
    generated_at: generatedAt,
    advisory_only: true,
    requires_human_approval: true,
    recommendation: 'manual_review',
    confidence: 'low',
    reason_vi: `Không gọi được LLM hoặc không parse được JSON: ${error.message}`,
    suggested_actions: [],
    risks: ['Cần review thủ công trước khi ra quyết định.'],
    next_review_questions: []
  };
}

function disabledResult({ generatedAt, candidates, selected, reason }) {
  return {
    enabled: false,
    generated_at: generatedAt,
    total_candidates: candidates.length,
    selected_candidates: selected.length,
    decisions_count: 0,
    skipped_candidates: candidates.length,
    reason,
    summary: summarizeDecisions([]),
    decisions: []
  };
}

function summarizeDecisions(decisions) {
  return {
    total: decisions.length,
    reviewed: decisions.filter((item) => item.status === 'reviewed').length,
    failed: decisions.filter((item) => item.status === 'failed').length,
    from_cache: decisions.filter((item) => item.source === 'cache').length,
    requires_human_approval: decisions.filter((item) => item.requires_human_approval).length
  };
}

function sanitizeRecommendation(value) {
  const allowed = new Set(['keep', 'update', 'merge_review', 'noindex_review', 'redirect_review', 'manual_review']);
  const normalized = String(value || '').trim().toLowerCase();
  return allowed.has(normalized) ? normalized : 'manual_review';
}

function sanitizeConfidence(value) {
  const allowed = new Set(['low', 'medium', 'high']);
  const normalized = String(value || '').trim().toLowerCase();
  return allowed.has(normalized) ? normalized : 'low';
}

function safeFileName(value) {
  return String(value || 'missing-key').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120);
}

async function appendJsonLine(filePath, data) {
  await appendFile(filePath, `${JSON.stringify(data)}\n`, 'utf8');
}
