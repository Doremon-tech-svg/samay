# Provider research

- Gemini official models page: https://ai.google.dev/gemini-api/docs/models
  - Current guidance says new projects should use Gemini 3.5 Flash-Lite or Gemini 3.8 Flash rather than 2.5 models.
  - Current stable endpoint identifiers shown: `gemini-3.8-flash`, `gemini-3.5-flash-lite`, and `gemini-4-argon`.
  - The repository currently defaults to `gemini-2.0-flash`, so it should be updated.

- Groq official models page: https://console.groq.com/docs/models
  - Production identifiers include `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `llama-3.3-70b-versatile`, and `llama-3.1-8b-instant`.
  - Preview models may be discontinued and should not be the production default.
  - The existing `llama-3.3-70b-versatile` is still listed as production, but the newer recommended default for this compiler is `openai/gpt-oss-120b`.

- Bhashini API docs: https://bhashini.gitbook.io/bhashini-apis
  - Bhashini uses ULCA pipelines identified by a pipeline ID.
  - The normal flow is optional pipeline search, mandatory pipeline config, then mandatory pipeline compute.
  - NMT is the translation task; ASR and TTS can be combined with NMT.
  - Language codes follow ISO-639 style codes, e.g. `en` and `hi`.
  - The app should keep Bhashini credentials server-side and expose a server translation endpoint instead of putting the key in the browser.
