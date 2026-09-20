# Deployment Channels and Release Routing

Status: `accepted`

Owners: `.github/workflows`, `containers/self-host`, `worker`

## Decision

This fork retires the standalone Cloudflare Preview channel and never deploys
from an ordinary `main` push. The active hosted service is deployed from a
fixed accepted commit through `containers/self-host/deploy.sh`; Cloudflare
Production remains tag/dispatch-only. [Deployment](../deployment.md) owns the
exact entrances, verification and recovery contract.

## Context

The active service owns persistent local data and operator-host simulation.
Publishing every merge would couple source integration to an irreversible
runtime change and would bypass fixed-commit review and backup boundaries.

## Rationale

The self-host path records one immutable Git revision, builds from that exact
revision, retains the same state directory, and updates only the target Compose
services. It does not delete volumes or reset Durable Object data. Separating
merge from deployment leaves time to inspect CI and gives the operator an
explicit rollback target. Cloudflare credentials and bindings remain isolated
from the self-hosted account and storage boundary.
