-- A05 D261 | ANALYTICS DATABASE SCHEMA DRAFT, PostgreSQL 15+
-- NOT MIGRATED, NOT CONNECTED TO WEB, NO PERSONAL RESPONSES COLLECTED.
-- Do not deploy before consent, threat model, retention, and API review.
-- Ver.1, Ver.2, Ver.2.1 and D242 currently retain CSP connect-src 'none'.
BEGIN;
CREATE SCHEMA IF NOT EXISTS a05_analytics;

-- The text/meaning of one question is immutable per revision.
CREATE TABLE IF NOT EXISTS a05_analytics.question_versions (
  question_id text NOT NULL,
  revision integer NOT NULL CHECK (revision >= 1),
  axis text NOT NULL CHECK (axis IN ('A','B','C','D','E')),
  response_format text NOT NULL CHECK (response_format IN ('SCALE_7','YN')),
  content_sha256 char(64) NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  semantic_family text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id,revision),
  CONSTRAINT yn_no_aux_e CHECK (response_format <> 'YN' OR axis <> 'E')
);

CREATE TABLE IF NOT EXISTS a05_analytics.questionnaire_versions (
  questionnaire_version text PRIMARY KEY,
  question_bank_version text NOT NULL,
  scoring_version text NOT NULL,
  classifier_version text NOT NULL,
  ui_version text NOT NULL,
  version_source_commit char(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- An individual finalized submission is accepted at most once.
-- submission_id / idempotency_key are random, per-submission, not user IDs.
CREATE TABLE IF NOT EXISTS a05_analytics.assessment_submissions (
  submission_id uuid PRIMARY KEY,
  idempotency_key uuid NOT NULL UNIQUE,
  questionnaire_version text NOT NULL REFERENCES a05_analytics.questionnaire_versions(questionnaire_version),
  manifest_variant text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  consent_at timestamptz NOT NULL,
  consent_policy_version text NOT NULL,
  completion_status text NOT NULL CHECK (completion_status IN ('CORE_COMPLETE','YN_PARTIAL','YN_COMPLETE')),
  CONSTRAINT consent_precedes_received CHECK (consent_at <= received_at)
);

-- Exactly one row for each question actually shown in a finalized submission.
-- Unshown questions MUST NOT appear; Y/N shown but unanswered is NOT_ANSWERED.
CREATE TABLE IF NOT EXISTS a05_analytics.question_exposures (
  submission_id uuid NOT NULL REFERENCES a05_analytics.assessment_submissions(submission_id) ON DELETE CASCADE,
  question_id text NOT NULL,
  question_revision integer NOT NULL,
  phase text NOT NULL CHECK (phase IN ('CORE','YN')),
  ordinal smallint NOT NULL CHECK (ordinal >= 1),
  response_code text NOT NULL,
  scale_value smallint,
  PRIMARY KEY (submission_id,question_id,question_revision),
  UNIQUE (submission_id,phase,ordinal),
  FOREIGN KEY (question_id,question_revision)
    REFERENCES a05_analytics.question_versions(question_id,revision),
  CONSTRAINT answer_code_matches_phase CHECK (
   (phase='CORE' AND (
      (response_code='SCALE_7' AND scale_value BETWEEN 1 AND 7)
      OR (response_code IN ('SKIP_UNKNOWN','SKIP_NOT_APPLICABLE') AND scale_value IS NULL)
    ))
    OR (phase='YN' AND response_code IN
      ('YN_YES','YN_NO','YN_UNSURE','NOT_ANSWERED') AND scale_value IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS a05_exposures_question_idx ON a05_analytics.question_exposures(question_id,question_revision,phase);

-- Store *both* the result at 30 questions and the final result after optional Y/N.
-- type_id is present only when candidate_count == 1; type shares never allocate
-- an unresolved 2..16-candidate result across the 16 types.
CREATE TABLE IF NOT EXISTS a05_analytics.classification_snapshots (
  submission_id uuid NOT NULL REFERENCES a05_analytics.assessment_submissions(submission_id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('BASE_30','FINAL_AFTER_YN')),
  classification_version text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('SINGLE_PROVISIONAL','MULTIPLE','NO_INFORMATION')),
  type_id text,
  candidate_count smallint NOT NULL CHECK (candidate_count BETWEEN 1 AND 16),
  yn_supplemented_axes smallint NOT NULL CHECK (yn_supplemented_axes BETWEEN 0 AND 4),
  PRIMARY KEY (submission_id,phase),
  CONSTRAINT valid_candidate_outcome CHECK (
    (outcome='SINGLE_PROVISIONAL' AND type_id ~ '^T(0[1-9]|1[0-6])$' AND candidate_count=1)
    OR
    (outcome IN ('MULTIPLE','NO_INFORMATION') AND type_id IS NULL AND candidate_count BETWEEN 2 AND 16)
  )
);

CREATE TABLE IF NOT EXISTS a05_analytics.axis_snapshots (
  submission_id uuid NOT NULL,
  phase text NOT NULL,
  axis text NOT NULL CHECK (axis IN ('A','B','C','D')),
  direction smallint NOT NULL CHECK (direction IN (-1,0,1)),
  evidence_source text NOT NULL CHECK (evidence_source IN
   ('BASE_30','YN_INITIAL_PROVISIONAL','YN_CONTEXT_PROVISIONAL','UNRESOLVED')),
  research_axis_status text NOT NULL,
  signed_score_ratio numeric(10,7) CHECK (signed_score_ratio BETWEEN -1 AND 1),
  shown_count smallint NOT NULL CHECK (shown_count BETWEEN 0 AND 7),
  valid_7_count smallint NOT NULL CHECK (valid_7_count BETWEEN 0 AND 7),
  directional_7_count smallint NOT NULL CHECK (directional_7_count BETWEEN 0 AND 7),
  midpoint_4_count smallint NOT NULL CHECK (midpoint_4_count BETWEEN 0 AND 7),
  unknown_count smallint NOT NULL CHECK (unknown_count BETWEEN 0 AND 7),
  not_applicable_count smallint NOT NULL CHECK (not_applicable_count BETWEEN 0 AND 7),
  item_flip_count smallint NOT NULL CHECK (item_flip_count BETWEEN 0 AND 7),
  family_flip_count smallint NOT NULL CHECK (family_flip_count BETWEEN 0 AND 7),
  PRIMARY KEY (submission_id,phase,axis),
  FOREIGN KEY (submission_id,phase)
   REFERENCES a05_analytics.classification_snapshots(submission_id,phase) ON DELETE CASCADE,
  CONSTRAINT axis_counts_coherent CHECK (
   valid_7_count+unknown_count+not_applicable_count=shown_count
   AND directional_7_count+midpoint_4_count=valid_7_count
  )
);

-- Persistent, de-identified daily rollups, populated only by a future
-- idempotent server-side aggregation job. No ingestion/job exists yet.
CREATE TABLE IF NOT EXISTS a05_analytics.daily_question_counts (
  day_jst date NOT NULL,
  questionnaire_version text NOT NULL REFERENCES a05_analytics.questionnaire_versions(questionnaire_version),
  question_id text NOT NULL,
  question_revision integer NOT NULL,
  phase text NOT NULL CHECK (phase IN ('CORE','YN')),
  shown_count bigint NOT NULL DEFAULT 0 CHECK (shown_count >= 0),
  c1 bigint NOT NULL DEFAULT 0 CHECK (c1 >= 0),
  c2 bigint NOT NULL DEFAULT 0 CHECK (c2 >= 0),
  c3 bigint NOT NULL DEFAULT 0 CHECK (c3 >= 0),
  c4 bigint NOT NULL DEFAULT 0 CHECK (c4 >= 0),
  c5 bigint NOT NULL DEFAULT 0 CHECK (c5 >= 0),
  c6 bigint NOT NULL DEFAULT 0 CHECK (c6 >= 0),
  c7 bigint NOT NULL DEFAULT 0 CHECK (c7 >= 0),
  skip_unknown bigint NOT NULL DEFAULT 0 CHECK (skip_unknown >= 0),
  skip_not_applicable bigint NOT NULL DEFAULT 0 CHECK (skip_not_applicable >= 0),
  yn_yes bigint NOT NULL DEFAULT 0 CHECK (yn_yes >= 0),
  yn_no bigint NOT NULL DEFAULT 0 CHECK (yn_no >= 0),
  yn_unsure bigint NOT NULL DEFAULT 0 CHECK (yn_unsure >= 0),
  not_answered bigint NOT NULL DEFAULT 0 CHECK (not_answered >= 0),
  PRIMARY KEY (day_jst,questionnaire_version,question_id,question_revision,phase),
  FOREIGN KEY (question_id,question_revision)
   REFERENCES a05_analytics.question_versions(question_id,revision),
  CONSTRAINT all_exposures_accounted CHECK (
   shown_count = c1+c2+c3+c4+c5+c6+c7+skip_unknown+
       skip_not_applicable+yn_yes+yn_no+yn_unsure+not_answered
  ),
  CONSTRAINT phase_distribution_consistent CHECK (
   (phase='CORE' AND yn_yes+yn_no+yn_unsure+not_answered=0)
   OR (phase='YN' AND c1+c2+c3+c4+c5+c6+c7+skip_unknown+skip_not_applicable=0)
  )
);

CREATE TABLE IF NOT EXISTS a05_analytics.daily_type_counts (
  day_jst date NOT NULL,
  questionnaire_version text NOT NULL REFERENCES a05_analytics.questionnaire_versions(questionnaire_version),
  phase text NOT NULL CHECK (phase IN ('BASE_30','FINAL_AFTER_YN')),
  classification_version text NOT NULL,
  type_bucket text NOT NULL CHECK (
   type_bucket ~ '^T(0[1-9]|1[0-6])$'
   OR type_bucket IN ('MULTIPLE','NO_INFORMATION')),
  source_bucket text NOT NULL CHECK (source_bucket IN
   ('BASE_30','YN_PROVISIONAL','UNCLASSIFIED')),
  n bigint NOT NULL CHECK (n >= 0),
  PRIMARY KEY (day_jst,questionnaire_version,phase,classification_version,type_bucket,source_bucket),
  CONSTRAINT coherent_source_bucket CHECK (
   (type_bucket IN ('MULTIPLE','NO_INFORMATION') AND source_bucket='UNCLASSIFIED')
   OR (type_bucket ~ '^T(0[1-9]|1[0-6])$' AND source_bucket IN ('BASE_30','YN_PROVISIONAL'))
  )
);

-- The review queue is *manual*; inserting a row never changes live questions.
CREATE TABLE IF NOT EXISTS a05_analytics.question_review_queue (
  review_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question_id text NOT NULL,
  question_revision integer NOT NULL,
  detected_on date NOT NULL,
  rule_version text NOT NULL,
  shown_count bigint NOT NULL CHECK (shown_count >= 0),
  unknown_rate numeric(8,6) CHECK (unknown_rate BETWEEN 0 AND 1),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'REVIEW_CANDIDATE'
   CHECK (status IN ('REVIEW_CANDIDATE','INVESTIGATING','KEEP','REWRITE_DRAFT','RETIRE_PLANNED','CLOSED')),
  editor_comment text,
  FOREIGN KEY (question_id,question_revision)
   REFERENCES a05_analytics.question_versions(question_id,revision),
  UNIQUE (question_id,question_revision,detected_on,rule_version)
);

-- The following views are ONLY reporting definitions; all real tables are empty.
CREATE OR REPLACE VIEW a05_analytics.question_metrics AS
SELECT
 questionnaire_version,question_id,question_revision,phase,
 sum(shown_count) AS shown,
 sum(skip_unknown) AS unknown_n,
 sum(skip_not_applicable) AS not_applicable_n,
 sum(c4) AS midpoint_n,
 sum(c1+c2+c3+c4+c5+c6+c7) AS scale_7_n,
 sum(yn_yes+yn_no+yn_unsure) AS yn_answered_n,
 sum(not_answered) AS yn_not_answered_n,
 sum(skip_unknown)::numeric / NULLIF(sum(shown_count),0) AS unknown_per_exposed,
 sum(skip_not_applicable)::numeric / NULLIF(sum(shown_count),0) AS not_applicable_per_exposed,
 sum(c4)::numeric / NULLIF(sum(c1+c2+c3+c4+c5+c6+c7),0) AS midpoint_per_valid7,
 sum(yn_unsure)::numeric / NULLIF(sum(yn_yes+yn_no+yn_unsure),0) AS unsure_per_answered_yn
FROM a05_analytics.daily_question_counts
GROUP BY questionnaire_version,question_id,question_revision,phase;

-- Uncertain classifications stay in the total denominator, never fractional
-- allocated. The single-only denominator is a separate column.
CREATE OR REPLACE VIEW a05_analytics.type_distribution_metrics AS
WITH by_bucket AS (
 SELECT questionnaire_version,phase,classification_version,type_bucket,
        sum(n) AS n
 FROM a05_analytics.daily_type_counts
 GROUP BY questionnaire_version,phase,classification_version,type_bucket
),
 totals AS (
 SELECT questionnaire_version,phase,classification_version,
        sum(n) AS all_completed_n,
        sum(n) FILTER (WHERE type_bucket ~ '^T(0[1-9]|1[0-6])$') AS single_type_n
 FROM by_bucket
 GROUP BY questionnaire_version,phase,classification_version
)
SELECT b.questionnaire_version,b.phase,b.classification_version,
 b.type_bucket,b.n,t.all_completed_n,t.single_type_n,
 b.n::numeric/NULLIF(t.all_completed_n,0) AS share_of_all_completed,
 CASE WHEN b.type_bucket ~ '^T(0[1-9]|1[0-6])$'
  THEN b.n::numeric/NULLIF(t.single_type_n,0)
  ELSE NULL END AS share_among_single_types
FROM by_bucket b JOIN totals t USING (questionnaire_version,phase,classification_version);

-- Operations require explicit later deployment, privileges, retention jobs
-- and privacy/compliance approval. Deny anonymous/public schema access.
REVOKE ALL ON SCHEMA a05_analytics FROM PUBLIC;
COMMIT;
