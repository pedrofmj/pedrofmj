# Evidence-Backed Software Portfolio Governance

## Status

Proposal. The study design is defined, but no experiment has been run and no results have been collected.

## Research Question

Does a structured software portfolio record that separates confirmed facts, unknowns, risks, ownership, and decisions improve the quality and reviewability of technical governance decisions compared with repository-only discovery and unstructured notes?

## Motivation

Technical leaders often make ownership, investment, transition, and roadmap decisions across systems whose context is distributed among repositories, documents, and people. Repository metadata can establish that a system exists, but may not explain its purpose, dependencies, accountable roles, known risks, or planned direction.

The concrete engineering problem is context reconstruction: reviewers must assemble decision evidence before evaluating an action, and their rationale may not remain traceable afterward. A structured portfolio model could reduce that effort while making uncertainty and evidence boundaries explicit.

## Related Software Platforms

The primary platform is [EgypTeam ADM](../../platforms/egypteam-adm/), which treats software inventory, product context, ownership, risks, actions, and transition plans as connected governance artifacts.

[EgypTeam Atlas](../../platforms/egypteam-atlas/) provides a secondary operational perspective through deployment, inventory, and diagnostic evidence. Other documented platforms may supply synthetic portfolio cases without exposing private implementation details.

## Proposed Contribution

- a public information model for evidence-backed portfolio records
- a controlled comparison of repository-only discovery and structured governance context
- metrics for decision completeness, review effort, uncertainty handling, and rationale traceability
- a synthetic portfolio dataset and reusable decision scenarios
- guidance for preserving facts, assumptions, unknowns, risks, and decisions as distinct records

## Hypotheses

- Structured portfolio records will help reviewers identify more relevant ownership, dependency, and risk information.
- Structured records will reduce the time and clarification steps required for a reviewable recommendation.
- Explicit unknowns and evidence references will improve rationale traceability without increasing unsupported certainty.
- Preparation cost may exceed the benefit for small or low-risk portfolios.

## Method

### Study Design

Use a paired, synthetic study. Each scenario describes the same decision under two conditions:

| Condition | Available context |
| --- | --- |
| A: repository-only | Repository names, short descriptions, technology tags, and unstructured notes |
| B: structured governance | The same source facts plus purpose, ownership state, dependencies, risks, unknowns, evidence references, and prior decisions |

Presentation order should be counterbalanced. Reviewers should not be told which condition is expected to perform better.

### Scenario Families

1. Assign an accountable owner during a synthetic technology transition.
2. Prioritize a modernization candidate with incomplete dependency information.
3. Review a proposed retirement where another product consumes the system.
4. Select a near-term risk-reduction action across competing roadmap items.
5. Evaluate an investment recommendation whose supporting evidence is incomplete.

### Procedure

1. Generate a synthetic portfolio of products, repositories, capabilities, dependencies, roles, risks, and evidence references.
2. Produce matched repository-only and structured-governance views from the same facts.
3. Give reviewers a decision prompt, fixed time window, and common response template.
4. Ask for a recommendation, supporting evidence, unknowns, and required follow-up.
5. Score responses with a predefined rubric and record review time and clarification steps.
6. Compare paired outcomes by condition and scenario family.
7. Record cases where added structure increases effort or biases the recommendation.

## Evaluation Measures

Primary measures:

- decision completeness and rationale traceability scores
- relevant risk and dependency detection rate
- review effort in minutes
- clarification or reconstruction steps

Secondary measures:

- unsupported-assumption count
- explicit-unknown identification rate
- reviewer confidence and agreement
- preparation effort for each condition

The rubric, scenario generator, and exclusion criteria should be defined before collecting results.

## Data and Reproducibility

All cases must be synthetic. The study must not copy private repository names, customer information, credentials, internal ownership claims, commercial plans, or production inventories.

Generated cases should use deterministic seeds and stable identifiers. The published dataset should include its schema, generation rules, condition derivation method, evaluation rubric, and known limitations.

## Risks and Limitations

- Synthetic portfolios may be simpler and more consistent than real software estates.
- The structured condition may benefit because its schema reflects the rubric.
- Reviewer familiarity may affect results.
- Documentation quality and interface design may be confounded with information structure.
- Decision quality cannot be fully established without observing later operational outcomes.
- A bounded study cannot represent every organization or governance model.

## Expected Artifacts

- synthetic software portfolio schema and dataset
- paired governance decision scenarios
- preregistered rubric and experiment protocol
- anonymized aggregate measurements and analysis notebook
- technical report and publication-safe figures

## Relationship to Existing Research

This proposal narrows the technology-governance track in the [Platform Architecture and Research Map](../technical-reports/platform-architecture-and-research-map.md) into a testable study. It extends the governance scenario in the [Explicit Context and Traceability Experiment](../experiments/explicit-context-traceability/) by making decision context, uncertainty, and rationale the primary objects of evaluation.

## Next Steps

1. Define the synthetic portfolio schema and minimum scenario set.
2. Draft the decision-completeness and rationale-traceability rubrics.
3. Generate a pilot pair and verify that both conditions share the same source facts.
4. Run a small protocol-validation study before selecting a larger sample.
