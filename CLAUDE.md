# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — plataforma para jugar online y competir por puntos. Next.js 16.3.4 (App Router), React 19.2.8, TypeScript, Tailwind CSS 4. Currently a fresh `create-next-app` skeleton with no custom routes/components yet.

**IMPORTANT**: Next.js 16 in `node_modules/next/dist/docs/01-app/` has breaking changes vs. training data. Check the relevant doc there before using App Router APIs.



No test runner configured yet.

## Spec-driven workflow

This project follows spec-driven design via `/spec` and `/spec-impl` skills from https://github.com/Klerith/fernando-skills (installed via `npx skills@latest add Klerith/fernando-skills`). Use these commands for planning/implementing features rather than ad hoc changes.

## Skills
Always use the /frontend-design skill to design user interfaces. 

## Architecture notes

- `app/` — App Router root; `layout.tsx` is the root layout, `page.tsx` the home route.
- `@/*` path alias maps to project root (see `tsconfig.json`).
- Tailwind CSS 4 configured via `@tailwindcss/postcss` (no separate `tailwind.config` file — v4 uses CSS-based config in `app/globals.css`).
