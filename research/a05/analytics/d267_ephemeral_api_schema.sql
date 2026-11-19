-- A05 D267 | SYNTHETIC TEST SERVER ONLY. Postgres 16 disposable CI container.
-- Apply only after D261 schema_draft_v1.sql and D264 integrity patch.
-- No production endpoints, no account/user records, no real consent.
BEGIN;
CREATE TABLE a05_analytics.d267_synthetic_receipts (
  submission_id uuid PRIMARY KEY,
  idempotency_key uuid NOT NULL UNIQUE,
  payload_sha256 char(64),
  deletion_token_sha256 char(64),
  state text NOT NULL DEFAULT 'ACTIVE'
    CHECK (state IN ('ACTIVE','DELETED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT d267_state_cleared_on_delete CHECK (
    (state='ACTIVE' AND deleted_at IS NULL AND payload_sha256 IS NOT NULL
     AND deletion_token_sha256 IS NOT NULL)
    OR
    (state='DELETED' AND deleted_at IS NOT NULL AND payload_sha256 IS NULL
     AND deletion_token_sha256 IS NULL)
  )
);
-- This is a sandbox-only audit event stream. No request body, IP,
-- deletion credential, per-user subject id, session id, or user agent stored.
CREATE TABLE a05_analytics.d267_synthetic_audit (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_role text NOT NULL CHECK (actor_role IN
    ('ingestion-service','reviewer','aggregator','security-admin','anonymous')),
  action text NOT NULL CHECK (action IN
    ('SUBMISSION_ACCEPTED','SUBMISSION_RETRIED','SUBMISSION_REJECTED',
     'METRICS_READ','ROLLUP_REBUILT','DELETE_COMPLETED','DELETE_DENIED',
     'AUDIT_READ','AUTH_DENIED')),
  outcome text NOT NULL CHECK (outcome IN ('OK','DENIED','CONFLICT')),
  number_affected integer NOT NULL DEFAULT 0 CHECK (number_affected >= 0)
);
-- Explicitly marked synthetic entries; no schema-change path to modify
-- question contents or publish them from this API.
INSERT INTO a05_analytics.questionnaire_versions
(questionnaire_version,question_bank_version,scoring_version,classifier_version,
 ui_version,version_source_commit)
VALUES ('D267_SYNTHETIC_CI','D267_FAKE_BANK','D267_MOCK_SCORING',
 'D267_MOCK_CLASSIFIER','D267_LOOPBACK_API',repeat('f',40));
INSERT INTO a05_analytics.question_versions
(question_id,revision,axis,response_format,content_sha256,semantic_family)
SELECT 'D267-Q'||lpad(i::text,2,'0'),1,
 CASE WHEN i<=7 THEN 'A' WHEN i<=14 THEN 'B'
      WHEN i<=21 THEN 'C' WHEN i<=28 THEN 'D' ELSE 'E' END,
 'SCALE_7',repeat('a',64),'D267_synthetic' FROM generate_series(1,30) AS i;
INSERT INTO a05_analytics.question_versions
(question_id,revision,axis,response_format,content_sha256,semantic_family)
VALUES ('D267-YN1',1,'B','YN',repeat('b',64),'D267_synthetic'),
       ('D267-YN2',1,'B','YN',repeat('c',64),'D267_synthetic');
-- Refuse accidental grants of this schema to public users, even in CI.
REVOKE ALL ON SCHEMA a05_analytics FROM PUBLIC;
COMMIT;
