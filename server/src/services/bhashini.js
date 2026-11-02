const CONFIG_URL = process.env.BHASHINI_CONFIG_URL || 'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline';
const cache = new Map();

function credentials() {
  const userId = process.env.BHASHINI_USER_ID;
  const ulcaApiKey = process.env.BHASHINI_ULCA_API_KEY || process.env.BHASHINI_UDYAT_KEY || process.env.BHASHINI_API_KEY;
  if (!userId || !ulcaApiKey) throw new Error('Bhashini is not configured. Set BHASHINI_USER_ID and BHASHINI_ULCA_API_KEY on the server.');
  return { userId, ulcaApiKey };
}

async function getPipeline(sourceLanguage, targetLanguage, fetchImpl = fetch) {
  const key = `${sourceLanguage}:${targetLanguage}`;
  if (cache.has(key)) return cache.get(key);
  const { userId, ulcaApiKey } = credentials();
  const pipelineId = process.env.BHASHINI_PIPELINE_ID;
  if (!pipelineId || pipelineId.includes('/')) {
    throw new Error('BHASHINI_PIPELINE_ID must be the actual pipeline ID. Values such as bhashini/iiith/nmt-all are Service IDs; put that value in BHASHINI_TRANSLATION_SERVICE_ID instead.');
  }
  const serviceId = process.env.BHASHINI_TRANSLATION_SERVICE_ID || 'bhashini/iiith/nmt-all';
  const res = await fetchImpl(CONFIG_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', userID: userId, ulcaApiKey },
    body: JSON.stringify({
      pipelineTasks: [{ taskType: 'translation', config: { language: { sourceLanguage, targetLanguage } } }],
      pipelineRequestConfig: { pipelineId }
    })
  });
  if (!res.ok) throw new Error(`Bhashini config ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const task = data.pipelineResponseConfig?.[0] || data.pipelineInferenceAPIEndPoint?.pipelineResponseConfig?.[0];
  const endpoint = data.pipelineInferenceAPIEndPoint?.callbackUrl || data.pipelineInferenceAPIEndPoint?.inferenceApiEndpoint;
  const auth = data.pipelineInferenceAPIEndPoint?.inferenceApiKey;
  const config = { endpoint, authName: auth?.name, authValue: auth?.value, serviceId: serviceId || task?.config?.serviceId };
  if (!config.endpoint || !config.authName || !config.authValue) throw new Error('Bhashini returned no usable inference endpoint for this language pair.');
  cache.set(key, config);
  return config;
}

export async function translateWithBhashini(text, { sourceLanguage = 'en', targetLanguage, fetchImpl = fetch } = {}) {
  if (!text?.trim()) return '';
  if (!targetLanguage || sourceLanguage === targetLanguage) return text;
  const pipeline = await getPipeline(sourceLanguage, targetLanguage, fetchImpl);
  const res = await fetchImpl(pipeline.endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', [pipeline.authName]: pipeline.authValue },
    body: JSON.stringify({
      pipelineTasks: [{ taskType: 'translation', config: { language: { sourceLanguage, targetLanguage }, serviceId: pipeline.serviceId } }],
      inputData: { input: [{ source: text }] }
    })
  });
  if (!res.ok) throw new Error(`Bhashini inference ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const translated = data.pipelineResponse?.[0]?.output?.[0]?.target || data.pipelineResponse?.[0]?.output?.[0]?.source;
  if (!translated) throw new Error('Bhashini returned an empty translation.');
  return translated;
}

export const clearBhashiniCache = () => cache.clear();
