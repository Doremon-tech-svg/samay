import test from 'node:test';
import assert from 'node:assert/strict';

import { readSlipWithFallback, readSlipWithGroq } from './slipVision.js';

test('Gemini request body uses the current inlineData contract', async () => {
  let body;
  const fakeFetch = async (_url, init) => {
    body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
      documentType: 'ACKNOWLEDGEMENT_SLIP',
      acknowledgementNumber: 'MH123',
      applicationDate: '2026-10-05',
      serviceName: 'Income Certificate',
      issuingDepartment: 'Revenue',
      issuingJurisdiction: 'Maharashtra',
      missingOrUnclear: [],
      warnings: []
    }) }] } }] }) };
  };

  await import('./slipVision.js').then(async ({ readSlipWithGemini }) => {
    await readSlipWithGemini({ imageBase64: Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString('base64'), mimeType: 'image/jpeg' }, { apiKey: 'k', model: 'gemini-3.5-flash-lite', fetchImpl: fakeFetch });
  });

  assert.equal(body.contents[0].parts[1].inlineData.mimeType, 'image/jpeg');
  assert.equal(body.contents[0].parts[1].inlineData.data.length > 0, true);
});

test('readSlipWithFallback tries the next provider when the first one fails', async () => {
  const seen = [];
  const result = await readSlipWithFallback({ imageBase64: Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString('base64'), mimeType: 'image/jpeg' }, {
    providers: [
      async () => {
        seen.push('gemini');
        const error = new Error('Gemini exploded');
        error.status = 503;
        throw error;
      },
      async () => {
        seen.push('groq');
        return {
          documentType: 'ACKNOWLEDGEMENT_SLIP',
          fields: {
            acknowledgementNumber: 'MH2026001234',
            applicationDate: '2026-10-05',
            serviceName: 'Income Certificate',
            issuingDepartment: 'Revenue Department',
            issuingJurisdiction: 'Maharashtra'
          },
          missingFields: [],
          warnings: []
        };
      }
    ]
  });

  assert.deepEqual(seen, ['gemini', 'groq']);
  assert.equal(result.documentType, 'ACKNOWLEDGEMENT_SLIP');
  assert.equal(result.fields.acknowledgementNumber, 'MH2026001234');
  assert.equal(result.provider, 'groq');
});

test('readSlipWithGroq parses JSON from a chat-completion response', async () => {
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{
        message: {
          content: JSON.stringify({
            documentType: 'ACKNOWLEDGEMENT_SLIP',
            acknowledgementNumber: 'KA20260099',
            applicationDate: '2026-10-11',
            serviceName: 'Residence Certificate',
            issuingDepartment: 'Revenue Department',
            issuingJurisdiction: 'Karnataka',
            missingOrUnclear: [],
            warnings: []
          })
        }
      }]
    })
  });

  const out = await readSlipWithGroq({ imageBase64: Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString('base64'), mimeType: 'image/jpeg' }, {
    apiKey: 'k',
    model: 'llama-3.1-8b-instant',
    fetchImpl: fakeFetch
  });

  assert.equal(out.documentType, 'ACKNOWLEDGEMENT_SLIP');
  assert.equal(out.fields.acknowledgementNumber, 'KA20260099');
});
