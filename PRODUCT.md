# 教资成绩查询

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Sites Vinext starter, React, Cloudflare D1. Implementation choices delegated by the user's instruction to build directly.

## Users

Teachers use a phone to enter their name and view their exam score, rank, and percentile. The organizer uploads the existing Excel workbook and publishes each exam's results.

## Product Purpose

Support the 2026 teacher qualification training mock examinations with a shared, mobile-accessible lookup page.

## Operating Context

The existing workbook contains six venue sheets and a linked 总成绩 summary. The 2026-11-24/25 subject-one mock exam has a maximum of 150. Existing scores are not yet entered. Teachers must not need a ChatGPT account to query. The organizer may sign in for administration.

## Capabilities and Constraints

Upload XLSX; choose an exam; preview; publish or withdraw results. Ignore absences and nonparticipants in ranking; include genuine zero scores. Competition ranking (1,2,2,4); strict-lower percentile. Same-name matches require department/venue selection. Store records on the server and return only matched records. No real scores or names committed in website source. The user's explicit request to build directly settles the task; remaining routine design choices are implementation assumptions.

## Evidence on Hand

The organizer's existing XLSX is in the parent folder's 06_成绩与参培信息 directory. Preserve the existing brand mark and brand/exam names. The user supplied the complete education-institution visual reconstruction brief on 2026-11-24; its normative colors, type and layout are recorded in DESIGN.md.

## Brand Commitments

Modern education institution internal business system: formal, restrained and efficient. Warm-white and ink-blue; no promotional language, gradients, glass effects, ornamental icons or separate metric cards. Maintain the user's explicit visual tokens and phone widths375/390/430px.

## Product Principles

Keep the teacher flow short. Show population and publication time. Fail clearly on invalid uploads. Protect administrative writes on the server. Make the same published results available across devices.
