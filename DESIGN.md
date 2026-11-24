---
name: 领世研习所教资成绩查询
description: 现代教育机构内部业务系统
colors:
  page-background: "#F5F3EF"
  surface: "#FFFFFF"
  brand: "#263D4D"
  text: "#29343D"
  secondary-text: "#68737A"
  sage: "#788E84"
  sand: "#C5AC86"
  divider: "#E3E0DA"
  input-border: "#D8DDD9"
  hover: "#F0F2F1"
  error: "#B6534D"
typography:
  brand-subtitle:
    fontSize: "11px"
  caption:
    fontSize: "12px"
  supporting:
    fontSize: "13px"
  label:
    fontSize: "14px"
  input:
    fontSize: "16px"
  exam-mobile:
    fontSize: "17px"
  brand:
    fontSize: "18px"
  result-state:
    fontSize: "22px"
  metric:
    fontSize: "24px"
  heading-mobile:
    fontSize: "28px"
  score-mobile:
    fontSize: "56px"
  body:
    fontFamily: '"Source Han Sans SC", "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  heading:
    fontSize: "30px"
    fontWeight: 500
  section:
    fontSize: "19px"
    fontWeight: 500
  score:
    fontFamily: '"Inter", "DIN", "Arial", sans-serif'
    fontSize: "64px"
    fontWeight: 500
rounded:
  container: "8px"
  input: "6px"
  button: "6px"
  notice: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
  xxxl: "64px"
components:
  primary-button:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    height: "48px"
---

# Design System: 教资成绩查询

## Overview

User-pinned visual system: 70% formal education institution and 30% modern software product. Operate mode. Preserve brand, exam names, every workflow, permissions, API, database, data and ranking rules. No invented copy or statistics. The user's detailed redesign request authorizes replacement of the previous visual system and its documentation.

## Colors

Use only the eleven supplied colors as primitives. Warm-white page, white work surfaces, ink-blue primary actions and results. Sage is limited to the existing percentile bar and subtle states; sand marks the existing overwrite confirmation. Error states use the supplied muted red. Do not add gradients, glass or ornamental color.

## Typography

Chinese sans follows the user's preferred stack. Body 15px regular, supporting text 12–13px. Headings 30px desktop / 28px mobile at weight500. Brand18px. Sections18–19px. Result score64px desktop /56px mobile. Numbers use tabular-nums and Inter/DIN when available. Avoid all-page bolding.

## Layout

64px white navigation. Its inner container aligns with the active working surface. Teacher query maximum480px, complete result report800px, admin1120px. Mobile gutters16px at widths600px or below, with safe-area support; desktop20px minimum gutters. Test375px,390px,430px,768px and1440px. The query title and fields share one white surface and one left edge. Result precedes the retained query form so core information is concentrated. The report places score, rank and percentile in one horizontal band on desktop; below700px the score leads and the two statistics follow. The existing query form is a compact row on desktop and stacks on mobile. Admin uses a flexible editor and304px aside, stacking below1000px. Mobile preview rows retain name, department, subject, venue, score and status in a two-column reading order, instead of squeezing five columns into small text. The mobile preview follows the editor and precedes the saved-exam aside in the DOM, preserving visual and keyboard reading order.

## Elevation & Depth

Flat white work surfaces with1px dividers. No floating shadows. The upload area is an inline file-control row divided by rules, not a nested card.

## Shapes

Panels8px, controls6px, notices4px. Existing brand symbol geometry is preserved. No pill buttons or metric cards.

## Components

Labels above48px white fields. Primary button is solid ink blue and full width on the initial query form. Rank and percentile share a horizontal band separated by a fine vertical rule. Existing score, max score, population and report exam date retain their meaning. Admin data uses horizontal numeric summary and lightly ruled table, with right-aligned numeric cells. Existing overwrite confirmation and privileged actions remain intact. Inline name validation links its error to the input and focuses it after a failed submit. Query and administrative buttons show the status of their own operation. Administrative feedback precedes the editor. Table headers retain column scope; its scroll region supports keyboard access. A focus-only skip link and visible keyboard outlines are available on every page.

At the user's explicit follow-up, omit the page subtitle, name-entry helper, query-form date/max-score/provisional context, the ranking FAQ and name-lookup notice, the report top-percent note, ranking-scope caveats and update-time footer. Do not restore these auxiliary blocks in later polish. Keep the main score/max-score, rank/population and percentile, report exam date and existing administrative controls. Calculation and API metadata remain unchanged.

## Do's and Don'ts

Use180ms transitions and result fade only; the existing functional inline loading indicator remains. Respect reduced motion. Keep loading, empty, invalid and failed states explicit. Do not add achievements, ratings, promotional text, new charts, navigation or data. All preview records must be fictional or anonymized. Production data must never be seeded for screenshots.

## Skill review, 2026-11-24

Applied frontend-design for a subject-specific report and restrained typography, ui-ux-pro-max for touch targets and form validation, and the bundled Web Design Guidelines for semantics, focus, motion, content overflow and viewport review. Design-system searches returned Minimalism & Swiss Style, which fits this tool; the suggested marketing hero, alternative palettes, fonts and Server Action migration do not fit the user's brief and were rejected. The existing user-pinned colors, Chinese fonts, names, APIs, database, algorithms and reduced copy remain authoritative. No generated search output was persisted as a replacement design system. Preview screenshots and validation evidence belong in outputs/三技能优化预览 and use local fictional records only.

## GitHub Pages mode

The user subsequently selected a static, pre-uploaded score lookup website and explicitly accepted that the dataset is publicly downloadable. The static entry reuses the real query component, visual system, normalization, Excel parser and ranking code. The teacher page omits the management link and provides query only. A separate prepare.html supports local Excel parsing, validation, preserving other examinations and downloading scores.json for an explicit GitHub upload. It must never imply that downloading updates the public website. Initial publication intentionally contains no examinations, historical scores or demonstration records, as the user requested. The existing server-backed source remains available; the Pages publish directory is docs only.

The user explicitly removed the provisional/publication badge from the personal report header. Do not display “暂定成绩” or replace it with another status badge in that position. Preserve the stored provisional flag, preparation controls and all score calculations.
