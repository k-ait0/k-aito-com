-- A05 D264 | PostgreSQL INTEGRITY PATCH DRAFT for isolated testing only.
-- Apply only after schema_draft_v1.sql. NOT deployed to production.
-- No telemetry, no user submissions, and no automatic item replacement.
BEGIN;
-- Match a presented question's persisted answer format to its declared version.
-- The original schema could allow a CORE answer for an actual Y/N item.
ALTER TABLE a05_analytics.question_versions
 ADD CONSTRAINT question_version_format_unique
 UNIQUE (question_id,revision,response_format);

ALTER TABLE a05_analytics.question_exposures
 ADD COLUMN expected_format text GENERATED ALWAYS AS (
  CASE WHEN phase='CORE' THEN 'SCALE_7' ELSE 'YN' END
 ) STORED;

ALTER TABLE a05_analytics.question_exposures
 ADD CONSTRAINT exposure_format_fk
 FOREIGN KEY (question_id,question_revision,expected_format)
 REFERENCES a05_analytics.question_versions(question_id,revision,response_format);

ALTER TABLE a05_analytics.question_exposures
 ADD CONSTRAINT exposure_count_limits
 CHECK (
  (phase='CORE' AND ordinal BETWEEN 1 AND 30)
  OR (phase='YN' AND ordinal BETWEEN 1 AND 8)
 );

-- Both snapshots exist in the DB for an approved finalized submission,
-- but the pre-Y/N baseline is not allowed to claim Y/N supplementation.
ALTER TABLE a05_analytics.classification_snapshots
 ADD CONSTRAINT base30_cannot_have_yn_supplement
 CHECK (phase<>'BASE_30' OR yn_supplemented_axes=0);

-- A 30-question-only rollup cannot claim Y/N as classification provenance.
ALTER TABLE a05_analytics.daily_type_counts
 ADD CONSTRAINT no_yn_source_in_baseline_rollup
 CHECK (phase<>'BASE_30' OR source_bucket<>'YN_PROVISIONAL');

-- The D261 app-side contract validates 30 CORE exposures and <=8 Y/N
-- at submission boundaries. SQL per-row checks do not replace that gate.
COMMIT;
