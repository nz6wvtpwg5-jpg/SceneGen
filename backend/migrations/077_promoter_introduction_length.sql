-- Keep historic introductions intact; limit future messages to 500 characters.
ALTER TABLE promoter_introductions DROP CONSTRAINT IF EXISTS promoter_introductions_message_check;
ALTER TABLE promoter_introductions ADD CONSTRAINT promoter_introductions_message_check
  CHECK (char_length(message) BETWEEN 30 AND 500) NOT VALID;
