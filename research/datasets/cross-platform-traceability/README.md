# Cross-Platform Traceability Dataset

## Status

Specification only. No operational, customer, or private platform data is included.

## Purpose

Define a synthetic dataset for studying whether explicit context and evidence improve reviewability, recovery, and decision-making across applied software systems.

The dataset is designed to support future experiments connected to the [Platform Architecture and Research Map](../../technical-reports/platform-architecture-and-research-map.md).

## Provenance

All records must be generated synthetically from the public platform themes in this portfolio. No records may be copied from private repositories, customer systems, local workstation inventories, credentials, or production environments.

## License

To be determined when generated. The generated dataset should use a permissive public-data license compatible with this portfolio.

## Unit of Analysis

The primary unit is a synthetic **operational case**: a bounded scenario in which an actor performs an action against a modeled system and produces an observable result or evidence artifact.

## Data Dictionary

| Field | Type | Description |
| --- | --- | --- |
| `case_id` | string | Stable synthetic case identifier |
| `platform_domain` | enum | `reasoning`, `hardware`, `commerce`, `professional`, `measurement`, `audio`, `finance`, `workstation`, `operations`, `invoicing`, or `governance` |
| `scenario_type` | enum | Controlled scenario category |
| `context_explicit` | boolean | Whether relevant context was modeled explicitly before execution |
| `actor_role` | enum | Synthetic operator, reviewer, service, or agent role |
| `input_summary` | string | Sanitized description of synthetic inputs |
| `action` | string | Operation performed in the scenario |
| `expected_outcome` | string | Expected result |
| `observed_outcome` | string | Observed result |
| `evidence_artifact` | enum | `none`, `snapshot`, `trace`, `generated-document`, `diagnostic`, or `decision-record` |
| `review_required` | boolean | Whether human review is part of the scenario |
| `review_effort_minutes` | integer | Synthetic time required for review |
| `recovery_required` | boolean | Whether the scenario includes a failure or correction |
| `recovery_steps` | integer | Number of steps required to recover or explain the outcome |
| `outcome_quality` | integer | Synthetic quality score from 1 to 5 |
| `traceability_score` | integer | Synthetic evidence and explanation score from 1 to 5 |
| `limitations` | array | Known limitations or unmodeled factors |

## Scenario Families

### Explicit Versus Implicit Context

Pair otherwise similar cases where domain context is explicit in one case and reconstructed informally in another.

### Evidence-Preserving Operations

Compare cases that produce snapshots, traces, diagnostics, documents, or decision records with cases that produce only transient output.

### Human Review Boundaries

Measure review effort and outcome quality when automation includes explicit review checkpoints.

### Recovery and Explanation

Introduce controlled failures and compare recovery steps when the system has structured context and evidence.

## Generation Method

1. Select a platform domain and scenario family.
2. Generate synthetic entities and values using deterministic seeds.
3. Create matched explicit-context and implicit-context cases.
4. Generate expected and observed outcomes from controlled rules.
5. Assign evidence artifacts and synthetic review measurements.
6. Record limitations and generation metadata.

The generator should never read local repositories, environment variables, filesystem inventories, credentials, or private configuration.

## Limitations

- Synthetic scores do not represent production measurements.
- Platform domains are abstractions, not interchangeable implementations.
- Scenario generation can encode the assumptions it is intended to test.
- Human review effort requires later validation with controlled user studies.
- Results must not be presented as customer or production evidence.

## Related Platforms

- Aletheia: reasoning traces and evaluation
- Emulare: reproducible integration scenarios
- Aurum: financial state and evidence
- Galaxy: workstation topology and recovery
- EgypTeam Atlas: diagnostics and inventory
- EgypTeam Invoicing: generated-document review
- EgypTeam ADM: decisions, ownership, and transition records

## Related Research

- [Platform Architecture and Research Map](../../technical-reports/platform-architecture-and-research-map.md)
- [Research Index](../../README.md)

## Future Artifacts

- JSON Schema for generated records
- deterministic dataset generator
- baseline synthetic dataset
- experiment protocol comparing context and evidence conditions
