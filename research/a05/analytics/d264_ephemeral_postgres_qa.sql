-- A05 D264 - only synthetic fixtures in temporary CI PostgreSQL container.
-- The psql command must have ON_ERROR_STOP=1 and target a disposable database.
BEGIN;
INSERT INTO a05_analytics.question_versions
 (question_id,revision,axis,response_format,content_sha256,semantic_family)
 VALUES
 ('Q-CORE-01',1,'A','SCALE_7',repeat('a',64),'synthetic'),
 ('Q-YN-01',1,'B','YN',repeat('b',64),'synthetic');

INSERT INTO a05_analytics.questionnaire_versions
 (questionnaire_version,question_bank_version,scoring_version,classifier_version,
  ui_version,version_source_commit)
 VALUES ('D264_SYNTHETIC','FAKE','SYNTHETIC','SYNTHETIC','OFFLINE_ONLY',repeat('f',40));

INSERT INTO a05_analytics.assessment_submissions
 (submission_id,idempotency_key,questionnaire_version,manifest_variant,
  consent_at,consent_policy_version,completion_status)
 VALUES (
 '11111111-1111-4111-8111-111111111111',
 '22222222-2222-4222-8222-222222222222',
 'D264_SYNTHETIC','fake-manifest',now()-interval '1 day',
 'SYNTHETIC_CI_ONLY','YN_COMPLETE'
 );

INSERT INTO a05_analytics.question_exposures
 (submission_id,question_id,question_revision,phase,ordinal,response_code,scale_value)
 VALUES
 ('11111111-1111-4111-8111-111111111111','Q-CORE-01',1,'CORE',1,'SCALE_7',4),
 ('11111111-1111-4111-8111-111111111111','Q-YN-01',1,'YN',1,'YN_UNSURE',NULL);

INSERT INTO a05_analytics.classification_snapshots
 (submission_id,phase,classification_version,outcome,type_id,candidate_count,yn_supplemented_axes)
 VALUES
 ('11111111-1111-4111-8111-111111111111','BASE_30','SYNTHETIC','MULTIPLE',NULL,2,0),
 ('11111111-1111-4111-8111-111111111111','FINAL_AFTER_YN','SYNTHETIC',
  'SINGLE_PROVISIONAL','T03',1,1);

INSERT INTO a05_analytics.axis_snapshots
 (submission_id,phase,axis,direction,evidence_source,research_axis_status,
  signed_score_ratio,shown_count,valid_7_count,directional_7_count,
  midpoint_4_count,unknown_count,not_applicable_count,item_flip_count,family_flip_count)
 VALUES
 ('11111111-1111-4111-8111-111111111111','BASE_30','A',0,'UNRESOLVED','fragile',
  0.125,7,5,2,3,1,1,1,1),
 ('11111111-1111-4111-8111-111111111111','FINAL_AFTER_YN','A',-1,'YN_INITIAL_PROVISIONAL','fragile',
  0.125,7,5,2,3,1,1,1,1);

INSERT INTO a05_analytics.daily_question_counts
 (day_jst,questionnaire_version,question_id,question_revision,phase,
  shown_count,c1,c4,skip_unknown,skip_not_applicable,yn_yes,yn_unsure,not_answered)
 VALUES
 ('2026-11-20','D264_SYNTHETIC','Q-CORE-01',1,'CORE',5,1,1,2,1,0,0,0),
 ('2026-11-20','D264_SYNTHETIC','Q-YN-01',1,'YN',3,0,0,0,0,1,1,1);

INSERT INTO a05_analytics.daily_type_counts
 (day_jst,questionnaire_version,phase,classification_version,type_bucket,source_bucket,n)
 VALUES
 ('2026-11-20','D264_SYNTHETIC','BASE_30','SYNTHETIC','T01','BASE_30',2),
 ('2026-11-20','D264_SYNTHETIC','BASE_30','SYNTHETIC','MULTIPLE','UNCLASSIFIED',1),
 ('2026-11-20','D264_SYNTHETIC','BASE_30','SYNTHETIC','NO_INFORMATION','UNCLASSIFIED',1),
 ('2026-11-20','D264_SYNTHETIC','FINAL_AFTER_YN','SYNTHETIC','T01','BASE_30',2),
 ('2026-11-20','D264_SYNTHETIC','FINAL_AFTER_YN','SYNTHETIC','T03','YN_PROVISIONAL',1),
 ('2026-11-20','D264_SYNTHETIC','FINAL_AFTER_YN','SYNTHETIC','MULTIPLE','UNCLASSIFIED',1);

-- An actual question-review candidate can only be a review suggestion;
-- no row in this table modifies the active questionnaire.
INSERT INTO a05_analytics.question_review_queue
 (question_id,question_revision,detected_on,rule_version,shown_count,unknown_rate,reason)
 VALUES ('Q-CORE-01',1,'2026-11-20','SYNTHETIC_RULE_NOT_APPROVED',100,0.3,
 'synthetic review candidate for testing only');
COMMIT;

-- Check full PostgreSQL view semantics, not just static SQL substring matches.
DO $check$
DECLARE 
 q record;
 b record;
 f record;
BEGIN
 SELECT * INTO q FROM a05_analytics.question_metrics
 WHERE question_id='Q-CORE-01' AND questionnaire_version='D264_SYNTHETIC';
 IF q.shown<>5 OR q.unknown_n<>2 OR q.not_applicable_n<>1
    OR q.unknown_per_exposed<>0.4 OR q.midpoint_per_valid7<>0.5 THEN
  RAISE EXCEPTION 'D264 question_metrics denominator mismatch';
 END IF;
 SELECT * INTO b FROM a05_analytics.type_distribution_metrics
 WHERE questionnaire_version='D264_SYNTHETIC' AND phase='BASE_30'
   AND type_bucket='T01';
 IF b.all_completed_n<>4 OR b.single_type_n<>2 OR
    b.share_of_all_completed<>0.5 OR b.share_among_single_types<>1 THEN
  RAISE EXCEPTION 'D264 baseline 16-type denominator mismatch';
 END IF;
 SELECT * INTO f FROM a05_analytics.type_distribution_metrics
 WHERE questionnaire_version='D264_SYNTHETIC' AND phase='FINAL_AFTER_YN'
   AND type_bucket='T03';
 IF f.all_completed_n<>4 OR f.single_type_n<>3 OR
   f.share_of_all_completed<>0.25 OR f.share_among_single_types<>1.0/3.0 THEN
  RAISE EXCEPTION 'D264 final Y/N rescue denominator mismatch';
 END IF;
 IF (SELECT count(*) FROM a05_analytics.question_review_queue
     WHERE status='REVIEW_CANDIDATE')<>1 THEN
  RAISE EXCEPTION 'D264 review queue status mismatch';
 END IF;
END
$check$;

-- Separate synthetic submission avoids a duplicate-key masking the expected
-- format/ordinal/check violations in the negative cases.
INSERT INTO a05_analytics.assessment_submissions
 (submission_id,idempotency_key,questionnaire_version,manifest_variant,
  consent_at,consent_policy_version,completion_status)
 VALUES (
 '55555555-5555-4555-8555-555555555555',
 '66666666-6666-4666-8666-666666666666',
 'D264_SYNTHETIC','negative-only',now()-interval '1 day',
 'SYNTHETIC_CI_ONLY','CORE_COMPLETE'
 );

-- Negative schema tests must fail with exact expected constraint categories.
DO $negative$
BEGIN
 BEGIN
  INSERT INTO a05_analytics.question_exposures
   (submission_id,question_id,question_revision,phase,ordinal,response_code)
   VALUES ('55555555-5555-4555-8555-555555555555','Q-CORE-01',1,'YN',2,'YN_YES');
  RAISE EXCEPTION 'D264 accepted Y/N response for SCALE_7 question';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO a05_analytics.question_exposures
   (submission_id,question_id,question_revision,phase,ordinal,response_code,scale_value)
   VALUES ('55555555-5555-4555-8555-555555555555','Q-YN-01',1,'CORE',2,'SCALE_7',5);
  RAISE EXCEPTION 'D264 accepted SCALE_7 response for Y/N question';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO a05_analytics.question_exposures
   (submission_id,question_id,question_revision,phase,ordinal,response_code)
   VALUES ('55555555-5555-4555-8555-555555555555','Q-YN-01',1,'YN',9,'YN_NO');
  RAISE EXCEPTION 'D264 accepted ninth Y/N question';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO a05_analytics.classification_snapshots
   (submission_id,phase,classification_version,outcome,type_id,candidate_count,yn_supplemented_axes)
   VALUES ('55555555-5555-4555-8555-555555555555','BASE_30','SYNTHETIC',
    'SINGLE_PROVISIONAL','T01',1,1);
  RAISE EXCEPTION 'D264 accepted Y/N supplement in baseline snapshot';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO a05_analytics.daily_type_counts
   (day_jst,questionnaire_version,phase,classification_version,type_bucket,source_bucket,n)
   VALUES ('2026-11-20','D264_SYNTHETIC','BASE_30','SYNTHETIC','T05','YN_PROVISIONAL',1);
  RAISE EXCEPTION 'D264 accepted Y/N source in baseline distribution';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO a05_analytics.daily_question_counts
   (day_jst,questionnaire_version,question_id,question_revision,phase,
    shown_count,skip_unknown)
   VALUES ('2026-11-21','D264_SYNTHETIC','Q-CORE-01',1,'CORE',2,1);
  RAISE EXCEPTION 'D264 accepted broken exposure count';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END
$negative$;
\echo A05_D264_EPHEMERAL_POSTGRES_QA_PASS
