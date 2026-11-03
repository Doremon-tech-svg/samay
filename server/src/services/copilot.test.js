import test from 'node:test';
import assert from 'node:assert/strict';
import { askCopilot, buildCopilotMessages, normalizeRole } from './copilot.js';

test('normalizes unsupported roles to citizen', () => {
  assert.equal(normalizeRole('officer'), 'officer');
  assert.equal(normalizeRole('root'), 'citizen');
});

test('citizen demo Copilot uses tracked application context', async () => {
  const result = await askCopilot({
    role: 'citizen',
    message: 'Is my application late?',
    context: { applications: [{ ackNo: 'GJ20263412098', serviceName: 'Income Certificate', dueDate: '2026-06-29', clockState: 'BREACHED', daysLate: 3 }] }
  });
  assert.equal(result.provider, 'demo-fallback');
  assert.match(result.answer, /GJ20263412098/);
  assert.match(result.answer, /appeal/i);
});

test('officer and commission prompts contain their role guardrails', () => {
  const officer = buildCopilotMessages({ role: 'officer', message: 'Summarise the queue', context: { radar: [] } });
  const commission = buildCopilotMessages({ role: 'commission', message: 'What is late?', context: { offices: [] } });
  assert.match(officer[0].content, /designated government officer/i);
  assert.match(officer[0].content, /never invent/i);
  assert.match(commission[0].content, /k-anonymity/i);
});

test('commission demo Copilot gives a reason-specific improvement plan', async () => {
  const result = await askCopilot({
    role: 'commission',
    message: 'Improvement review for Demo Office. Reported cause: Inter-department file movement (4; FILE_MOVEMENT). Give an action plan.',
    context: { offices: [{ office: 'Demo Office', lateRate: 0.4 }] }
  });
  assert.equal(result.provider, 'demo-fallback');
  assert.match(result.answer, /Demo Office/i);
  assert.match(result.answer, /hand-offs/i);
  assert.match(result.answer, /not proof of individual fault/i);
});

test('empty Copilot messages are rejected', async () => {
  await assert.rejects(() => askCopilot({ role: 'citizen', message: '  ', context: {} }), /question first/i);
});
