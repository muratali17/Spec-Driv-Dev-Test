/c<!--
Sync Impact Report
==================
Version change: (unratified template) → 1.0.0
Bump rationale: Initial ratification. The scaffold contained only placeholder tokens, so this
is a MAJOR-equivalent baseline adoption rather than an amendment to prior governance.

Modified principles:
- [PRINCIPLE_1_NAME] → I. Prototype-Scale Scope
- [PRINCIPLE_2_NAME] → II. Browser-Only Execution
- [PRINCIPLE_3_NAME] → III. No Backend by Default
- [PRINCIPLE_4_NAME] → IV. Excluded Product Features
- [PRINCIPLE_5_NAME] → V. Leverage Mature Libraries
- (new) → VI. Browser-Testable Functionality
- (new) → VII. Verifiable Acceptance Criteria
- (new) → VIII. Simple Functional UI
- (new) → IX. Readable, Modular, Testable Code
- (new) → X. No Premature Abstraction or Optimization
- (new) → XI. Scope Discipline
- (new) → XII. Playwright-Ready Automation

Added sections:
- Experimentation Objectives (was [SECTION_2_NAME])
- Development Workflow & Quality Gates (was [SECTION_3_NAME])
- Governance

Removed sections: none

Deferred items / TODOs: none
-->

# Browser Chess Prototype Constitution

## Core Principles

### I. Prototype-Scale Scope

The project MUST remain intentionally small and prototype-focused. Every change is judged by
whether it helps evaluate Spec Driven Development, not by production readiness. Features that do
not directly serve the prototype's evaluation goals MUST be rejected or deferred. Rationale: the
project's value is learning how specifications translate into working software, which degrades as
scope grows.

### II. Browser-Only Execution

The application MUST run entirely in the browser. No server-side computation may be required for
gameplay, and the prototype MUST remain usable as a static, client-served artifact. Any proposal
that moves core behavior off the client MUST be justified and treated as a scope change under
Principle XI.

### III. No Backend by Default

A backend MUST NOT be introduced unless it is absolutely necessary and explicitly justified. The
default architecture is static assets plus client-side logic. If a backend is ever proposed, the
justification MUST be recorded and approved as an amendment or explicit scope decision.

### IV. Excluded Product Features

The following are explicitly out of scope and MUST NOT be added: authentication, user accounts,
databases or persistent server storage, multiplayer, ratings, matchmaking, and social features.
These exclusions apply to directly built functionality and to any third-party integration that
would introduce the same capability.

### V. Leverage Mature Libraries

Implementation MUST prefer mature, established libraries over hand-written complex chess logic,
including move generation, legal move validation, check/checkmate detection, castling, en passant,
and promotion rules. Chess rules are high-risk, error-prone logic and MUST be delegated to a
well-maintained library unless a documented reason forces otherwise.

### VI. Browser-Testable Functionality

All user-facing functionality MUST be reachable and exercisable through browser interactions.
Features that cannot be driven or observed from the browser surface MUST be redesigned so they can
be. Rationale: unobservable behavior cannot be acceptance-tested under this project's model.

### VII. Verifiable Acceptance Criteria

Every feature MUST have clear, unambiguous, and verifiable acceptance criteria before
implementation begins. Criteria MUST describe observable browser-level outcomes and MUST avoid
vague terms such as "fast", "nice", or "works well". A feature without verifiable criteria MUST
NOT be marked complete.

### VIII. Simple Functional UI

The UI MUST remain simple, responsive, and functional rather than visually complex. Styling
effort MUST be proportionate to the prototype's testing goals. Accessibility of core interactions
and usability at common viewport sizes MUST be preserved, but visual polish MUST NOT delay or
obscure functional delivery.

### IX. Readable, Modular, Testable Code

Code MUST prioritize readability, modularity, and testability over cleverness or compactness.
Chess logic, state management, rendering, and test code MUST be separated into clear modules with
explicit responsibilities so each can be tested independently.

### X. No Premature Abstraction or Optimization

Unnecessary abstractions and premature optimization MUST be avoided. Introduce an abstraction only
when a second concrete use case exists or a test demands it. Performance work MUST be deferred
until a measured, user-visible problem is demonstrated.

### XI. Scope Discipline

Changes MUST remain aligned with the prototype goal and MUST NOT expand scope without explicit
justification. Any proposed expansion MUST state the evaluation benefit, the cost, and the reason
existing scope is insufficient. Silent scope growth is a constitution violation.

### XII. Playwright-Ready Automation

The implementation MUST support reliable automated testing with Playwright. Interactive elements
MUST expose stable, accessible selectors (roles, labels, or test IDs); state that tests depend on
MUST be observable from the DOM; and the application MUST start and run deterministically in a
browser test environment without manual setup.

## Experimentation Objectives

This project is primarily an experimentation environment. Its success is measured by what it
teaches, not by shipped product breadth. The following objectives MUST guide prioritization and
review:

- **Specification quality**: assess whether written specifications are precise, complete, and free
  of ambiguity.
- **Agent-driven implementation**: evaluate how well an agent can implement from specification
  alone, with minimal human intervention.
- **Browser automation**: exercise the application through automation rather than manual testing.
- **Acceptance testing**: validate that specified behavior is demonstrably present.
- **Specification-to-software translation**: measure how faithfully specifications become working
  software and where the gaps appear.

Findings from these objectives SHOULD be captured and used to improve future specifications.

## Development Workflow & Quality Gates

- Work proceeds from a specification with verifiable acceptance criteria; implementation does not
  begin until those criteria exist (Principle VII).
- Each feature MUST be exercised through browser-level automated tests before being considered
  done (Principles VI and XII).
- Reviews MUST verify compliance with every principle in this constitution; deviations MUST be
  either corrected or explicitly justified and recorded.
- Complexity or scope additions MUST carry a written justification and MUST NOT be merged silently
  (Principles X and XI).
- The default delivery model is a static, browser-served application requiring no manual backend
  setup (Principles II and III).

## Governance

This constitution supersedes other development practices for this project. Where guidance
conflicts, this document wins.

**Amendment procedure**: Proposed amendments MUST be submitted with (1) the exact text change,
(2) the rationale, (3) the affected principles or sections, and (4) any required migration or
cleanup. Amendments take effect once incorporated into `.specify/memory/constitution.md`.

**Versioning policy**: Version numbers follow semantic versioning. MAJOR increments cover
backward-incompatible governance changes, principle removals, or principle redefinitions. MINOR
increments cover new principles or materially expanded guidance. PATCH increments cover
clarifications, wording fixes, and non-semantic refinements.

**Compliance review expectations**: Every review and pull request MUST confirm adherence to these
principles. Any violation MUST be fixed or justified in writing. Scope expansion without explicit
justification MUST be treated as a blocking violation.

**Version**: 1.0.0 | **Ratified**: 2026-09-15 | **Last Amended**: 2026-09-15
