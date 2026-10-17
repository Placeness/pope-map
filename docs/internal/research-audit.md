# Research scope and completion audit

The original [Catholic Hackathon brief](https://app.notion.com/p/3f5cdda5c6bc80d395dcc9ac152390fc) requires educational profiles for the complete Vatican sequence. Creating a schema and importing the roster do not complete “Create and populate the shared source-of-truth file.” Its first-build plan distinguishes a small set of example records from the subsequent full research pass.

The required record for each person includes a supported birth date when available, birthplace/origin evidence, a concise biography, fuller life and papacy, concrete actions and teachings, historical context explaining those actions, verified recognition and relevant rival papal claims. Numbered references must identify the supporting passage, section or page. Unknown evidence and conflicting traditions must be recorded rather than supplied from guesswork. Portraits are optional when no suitable verified image is available.

## Baseline before this research pass

Audit of commit `2bf5b22`:

| Requirement | Existing coverage | Assessment |
| --- | ---: | --- |
| Official sequence and linked identities | 267 entries, 265 people | Populated |
| Fuller biography | 22 people | 243 missing |
| Actions and teachings | 22 people | 243 missing |
| Historical context | 22 people | 243 missing |
| Supported known birth date | 10 people | Other dates had not been systematically researched; unknown is a valid result only after checking |
| Rival claimants | 6, linked to 9 pontificates | Illustrative coverage, not systematic |
| Geographic review | 45 people reviewed separately | Does not substitute for biographical research |
| Individual portraits | 0 | Text fallback is permitted; no portrait completeness claim |
| Numbered sources | 134 | References exist, but roster references do not establish personal deeds |

Many introductions merely stated a roster position and origin. That supplied navigation metadata rather than the learning experience requested. The source-file task therefore remained incomplete; it is unchecked in Notion.

## Full-sequence research method

Research proceeds in official order, with separate person records for the 265 people and all three pontificates retained for Benedict IX. Inputs in `data/research/narratives/` record person-specific source reading, paragraph-level references, recognition and claimant checks, and unresolved issues. The compiler produces the shared public dataset; every website view reads it.

The Vatican roster controls inclusion, order and the displayed pontificate dates. Official documents and cause records take priority for teaching and recognition. Historical biographies supplement those records, with their publication dates and limitations retained. A sparse ancient record calls for an explanation of the surviving evidence and its specific historical setting, rather than invented decrees or interchangeable era prose. Later traditions, forged decretals, hostile accounts and disputed classifications require explicit assessment.

This document and the generated coverage report must distinguish a substantive sourced profile, a reviewed record with scarce surviving evidence, unresolved source questions, and final editorial verification. Field presence alone does not prove factual completeness.

## Integration and independent review

The compiler retains the original 134 numbered source identifiers, all 267 exact Vatican pontificate date records and all 265 stable person identifiers. New narratives replace roster-only introductions in the shared records, with the same prose used by map selections, list selections and the tour. The underlying paragraph structure remains available beside the rendered text for fact checking.

Independent review reopens selected source passages and checks cross-record consistency. Corrections from that review include Leo III’s 1673 cult recognition rather than a fabricated canonization date; Martin I and Eugene I’s overlapping succession; Ursinus’s continued claim at Siricius’s election; Dioscorus’s twenty-two-day dispute; and the distinction between a rival faction leader and a demonstrably elected rival pope in Heraclius’s case. Bibliographic author errors, contradictory claimant-review boilerplate and joined words are also corrected at the input level.

The automated ledger checks reference resolution, evidence-reading metadata, individual field review and nonempty educational passages. Browser checks establish that readers can open those passages and claimant/recognition explanations. Neither substitutes for historical judgment; the checked-in conflict notes remain part of the source of truth.

## Completed coverage

The completed pass supplies all 265 shared profiles: 228 substantive histories and 37 evidence-limited accounts, supported by 638 numbered sources. Every profile has a separate introduction, biography, actions and context, with individual birth-date, recognition and rival-claim checks. The narrative fields total about 93,700 words; the median profile is 341 words. Length is reported for transparency rather than as a measure of historical reliability.

Research establishes a supported date, year or range for 104 people. The other 161 retain an explicitly researched unknown birth date. The rival catalogue has 41 accounts, including carefully qualified early divisions; all relevant relationships are recorded without reclassifying recognized popes. All 219 supported named origins have geographic reference points; 36 remain regional and 10 unknown.

The source-file population task is complete. Final historical/editorial verification for release remains separate, as do optional licensed portraits, broader device/browser testing and deployment/domain verification.
