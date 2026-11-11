# CSS cascade consolidation — approved 11 November 2026

Status: audit before implementation. Founder authorizes actual cascade inspection and targeted refactoring within PR79. No merge until visual tests pass and founder approves. No new override layer.

Inspect globals/ui-system/typography/responsive, actual landing Modules and pilot. Document source and computed evidence first. Source audit: CASCADE_SOURCE_AUDIT.md. Actual desktop computed/matching rules: evidence/cascade/browser-before-1363.json. Hero is52px600 but requires pilot important rules over global h1 important and dead serif declarations. CTA line-height21.7px still follows legacy1.55 while body24px follows UDS1.5; orbit ancestry remains legacy24.8px deliberately. These mixed winning owners are the concrete consolidation target.

Implementation contract: remove pilot override stylesheet/import. Move website design declarations into the actual component owners, consuming --uds settings once; retain component layout, breakpoint topology, interactions and animations. Existing root/document inheritance stays unchanged. Opt migrated UI out of legacy broad policy selectors at zero specificity, explicitly retaining legacy rules on protected document ancestors. Do not remove old policies from unmigrated SaaS pages. Scope of centralized settings remains landing and explicit shared/admin samples; no claim of full-app migration.

Protected: resume templates, typography, preview formatting/scaling and rendering logic, PDF/print logic; backend/auth/schema/AI/scoring/profile/payment/services. No implementation edits inside renderer/template files, no freeze/round of resume test output. Existing orbit stability failure must be diagnosed by original-versus-branch evidence, never hidden.

Verification: computed winners at390/1440, all six requested layout screenshots and six setting mutations, old original-template/PDF comparisons, current document-ancestor comparisons and equivalent unaffected app fixtures, typecheck/lint/build/repository tests. Browser restrictions may require GitHub read-only synthetic QA. Record blockers rather than infer a pass.
