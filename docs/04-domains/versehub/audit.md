# VerseHub Domain Audit

## Date: 2026-03-20 (Updated Status Sync)

## Scope
Auditing the data contracts and page logic inside `src/features/versehub/pages/VersehubReaderPage.tsx` against the backend APIs and sub-pages (`reflections`, `journey`).

## Findings
1. **Books Retrieval**: Returns `chapters` map and `books` correctly mapping to `{code, label, testament}`. `VersehubReaderPage` implements this cleanly.
2. **Chapter Content Retrieval**: Backend sends an elaborate payload.
3. **Frontend Mismatch**: The Next.js frontend is reading `verses`, `chapter_label`, and `chapters`, but it now reads `reflection_question` and `has_reflected` dynamically.
4. **Sub-Page Integration**:
   - **Reflections Journal**: `src/app/versehub/[lang]/reflections/page.tsx` is now **LIVE** (fetch to backend).
   - **Spiritual Journey**: `src/app/versehub/[lang]/my-spiritual-journey/page.tsx` is now **LIVE** (fetch to actions summary).
   - **Reflection Detail**: Still **PARTIAL** (resolves from list, no dedicated detail API).

## Selected Mismatch
- **Reflection Detail**: Missing dedicated backend endpoint for deep-links.
- **Verdict**: Domain is **PARTIAL**.
  - Reader: LIVE
  - Reflections List: LIVE
  - Spiritual Journey: LIVE
  - Reflection Detail: PARTIAL
