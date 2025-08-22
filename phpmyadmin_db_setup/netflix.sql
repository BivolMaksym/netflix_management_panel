-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: mysql
-- Generation Time: Aug 22, 2025 at 07:07 PM
-- Server version: 12.0.2-MariaDB-ubu2404
-- PHP Version: 8.2.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `netflix`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`%` PROCEDURE `sp_add_subtitle` (IN `p_media_id` INT, IN `p_language` VARCHAR(10), IN `p_cue_time_sec` INT, IN `p_text` TEXT)   BEGIN
  INSERT INTO subtitles(media_id, language, cue_time_sec, text)
  VALUES (p_media_id, p_language, p_cue_time_sec, p_text);
  SELECT LAST_INSERT_ID() AS subtitle_id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_add_to_watchlist` (IN `p_profile_id` INT, IN `p_media_id` INT)   BEGIN
  INSERT INTO watchlist(profile_id, media_id) VALUES(p_profile_id, p_media_id)
  ON DUPLICATE KEY UPDATE date_added = CURRENT_TIMESTAMP;
  SELECT 1 AS added;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_apply_referral_discount` (IN `p_inviter_account_id` INT, IN `p_invitee_account_id` INT)   BEGIN
  DECLARE v_inviter_active INT;
  DECLARE v_invitee_active INT;

  DECLARE exit handler FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- lock subs for both accounts
  SELECT subscription_id
    FROM subscriptions
   WHERE account_id IN (p_inviter_account_id, p_invitee_account_id)
   FOR UPDATE;

  SELECT COUNT(*) INTO v_inviter_active
    FROM subscriptions
   WHERE account_id = p_inviter_account_id
     AND status = 'active'
     AND (end_date IS NULL OR end_date >= CURDATE());

  SELECT COUNT(*) INTO v_invitee_active
    FROM subscriptions
   WHERE account_id = p_invitee_account_id
     AND status = 'active'
     AND (end_date IS NULL OR end_date >= CURDATE());

  IF v_inviter_active = 0 OR v_invitee_active = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'both accounts must have active subscriptions';
  END IF;

  INSERT IGNORE INTO referrals(inviter_account_id, invitee_account_id, is_discount_active)
  VALUES (p_inviter_account_id, p_invitee_account_id, 1);

  UPDATE subscriptions
     SET is_discount_active = 1
   WHERE account_id IN (p_inviter_account_id, p_invitee_account_id)
     AND status = 'active';

  COMMIT;

  SELECT 1 AS discount_applied;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_cancel_subscription` (IN `p_subscription_id` INT, IN `p_end` DATETIME)   BEGIN
  DECLARE v_status VARCHAR(20);

  -- preserve original error; rollback on any SQL error
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- lock the row and check it exists
  SELECT status
    INTO v_status
    FROM subscriptions
   WHERE subscription_id = p_subscription_id
   FOR UPDATE;

  IF v_status IS NULL THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'subscription_not_found';
  END IF;

  -- must be active to cancel
  IF v_status <> 'active' THEN
    -- treat as no-op or raise
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'subscription_not_active';
  END IF;

  -- cancel: set status and end_date (default NOW() if not provided)
  UPDATE subscriptions
     SET status   = 'cancelled',
         end_date = COALESCE(p_end, NOW())
   WHERE subscription_id = p_subscription_id
     AND status = 'active';

  COMMIT;

  -- small status row
  SELECT 1 AS cancelled, p_subscription_id AS subscription_id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_change_subscription_quality` (IN `p_subscription_id` INT, IN `p_quality` VARCHAR(10))   BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_quality VARCHAR(10);
  DECLARE v_affected INT DEFAULT 0;

  -- keep original error, rollback on SQL error
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET v_quality = UPPER(TRIM(p_quality));
  IF v_quality NOT IN ('SD','HD','UHD') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'invalid_quality';
  END IF;

  START TRANSACTION;

  -- lock row and check existence/status
  SELECT status INTO v_status
    FROM subscriptions
   WHERE subscription_id = p_subscription_id
   FOR UPDATE;

  IF v_status IS NULL THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'subscription_not_found';
  END IF;

  IF v_status <> 'active' THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'subscription_not_active';
  END IF;

  UPDATE subscriptions
     SET quality = v_quality
   WHERE subscription_id = p_subscription_id
     AND status = 'active';

  SET v_affected = ROW_COUNT();

  COMMIT;

  SELECT v_affected AS affected_rows, p_subscription_id AS subscription_id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_create_account` (IN `p_email` VARCHAR(255), IN `p_password_hash` VARBINARY(72))   BEGIN
  INSERT INTO accounts(email, password_hash) VALUES(p_email, p_password_hash);
  SELECT LAST_INSERT_ID() AS account_id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_create_profile` (IN `p_account_id` INT, IN `p_name` VARCHAR(80), IN `p_age` INT, IN `p_language` VARCHAR(10), IN `p_profile_photo` VARCHAR(255))   BEGIN
  INSERT INTO profiles(account_id, name, age, language, profile_photo)
  VALUES (p_account_id, p_name, p_age, p_language, p_profile_photo);
  SELECT LAST_INSERT_ID() AS profile_id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_create_subscription` (IN `p_account_id` INT, IN `p_quality` VARCHAR(10), IN `p_start` DATETIME, IN `p_trial_days` INT)   BEGIN
  DECLARE v_exists        INT DEFAULT 0;
  DECLARE v_active_count  INT DEFAULT 0;
  DECLARE v_start         DATETIME;
  DECLARE v_trial_days    INT;
  DECLARE v_end           DATETIME;
  DECLARE v_trial_ends_at DATETIME;
  DECLARE v_quality       VARCHAR(10);

  -- rollback and keep original error message
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET v_start      = COALESCE(p_start, NOW());
  SET v_trial_days = COALESCE(p_trial_days, 0);
  SET v_quality    = UPPER(TRIM(p_quality));

  -- validate quality
  IF v_quality NOT IN ('SD','HD','UHD') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'invalid_quality';
  END IF;

  -- compute trial end (if trial_days > 0)
  IF v_trial_days > 0 THEN
    SET v_trial_ends_at = DATE_ADD(v_start, INTERVAL v_trial_days DAY);
  ELSE
    SET v_trial_ends_at = NULL;
  END IF;

  -- subscription always lasts 30 days
  SET v_end = DATE_ADD(v_start, INTERVAL 30 DAY);

  START TRANSACTION;

  -- account must exist
  SELECT COUNT(*) INTO v_exists FROM accounts WHERE account_id = p_account_id FOR UPDATE;
  IF v_exists = 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'account_not_found';
  END IF;

  -- ensure no overlapping active subscription
  SELECT COUNT(*) INTO v_active_count
    FROM subscriptions
   WHERE account_id = p_account_id
     AND status = 'active'
     AND (end_date IS NULL OR end_date >= DATE(v_start))
   FOR UPDATE;

  IF v_active_count > 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'active_subscription_exists';
  END IF;

  -- insert subscription (exclude generated price column!)
  INSERT INTO subscriptions (
      account_id, quality,
      start_date, end_date, trial_ends_at, status
  ) VALUES (
      p_account_id, v_quality,
      v_start, v_end, v_trial_ends_at, 'active'
  );

  COMMIT;

  SELECT LAST_INSERT_ID() AS subscription_id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_delete_account` (IN `p_account_id` INT)   BEGIN
  -- Roll back on any SQL error and raise a clear message
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'sp_delete_account_failed';
  END;

  START TRANSACTION;

  -- Preferences -> via profiles
  DELETE pr
    FROM preferences pr
    JOIN profiles p ON p.profile_id = pr.profile_id
   WHERE p.account_id = p_account_id;

  -- Watch list -> via profiles
  DELETE wl
    FROM watchlist wl
    JOIN profiles p ON p.profile_id = wl.profile_id
   WHERE p.account_id = p_account_id;

  -- Viewing history -> via profiles
  DELETE vh
    FROM viewing_history vh
    JOIN profiles p ON p.profile_id = vh.profile_id
   WHERE p.account_id = p_account_id;

  -- Profiles
  DELETE FROM profiles
   WHERE account_id = p_account_id;

  -- Subscriptions for this account
  DELETE FROM subscriptions
   WHERE account_id = p_account_id;

  -- Referrals (both inviter and invitee sides)
  DELETE FROM referrals
   WHERE inviter_account_id = p_account_id
      OR invitee_account_id  = p_account_id;

  -- Finally, the account record itself
  DELETE FROM accounts
   WHERE account_id = p_account_id;

  IF ROW_COUNT() = 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'account_not_found';
  END IF;

  COMMIT;

  -- Success marker
  SELECT 1 AS deleted, p_account_id AS account_id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_delete_media` (IN `p_media_id` INT)   BEGIN
  DELETE FROM media WHERE media_id = p_media_id;
  SELECT ROW_COUNT() AS deleted;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_delete_profile` (IN `p_profile_id` INT)   BEGIN
  DELETE FROM profiles WHERE profile_id = p_profile_id;
  SELECT ROW_COUNT() AS deleted;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_delete_subtitles_for_media` (IN `p_media_id` INT, IN `p_language` VARCHAR(10))   BEGIN
  DELETE FROM subtitles WHERE media_id = p_media_id AND language = p_language;
  SELECT ROW_COUNT() AS deleted;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_get_account_profiles` ()   BEGIN
  SELECT * FROM v_account_profiles;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_get_active_subscriptions` ()   BEGIN
  SELECT * FROM v_active_subscriptions;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_get_active_subscriptions_by_account` (IN `p_account_id` INT)   BEGIN
  SELECT *
  FROM v_active_subscriptions
  WHERE account_id = p_account_id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_get_management_accounts` ()   BEGIN
  SELECT * FROM v_management_accounts;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_get_media_catalog` ()   BEGIN
  SELECT * FROM v_media_catalog;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_get_preferences_anon` ()   BEGIN
  SELECT * FROM v_preferences_anon;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_get_watch_stats` ()   BEGIN
  SELECT * FROM v_watch_stats;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_mgmt_check_credentials` (IN `p_email` VARCHAR(255), IN `p_password_hash` VARBINARY(72))   BEGIN
  DECLARE v_id INT;
  DECLARE v_is_active BOOLEAN;
  DECLARE v_lock_until DATETIME;

  SELECT management_account_id, is_active, lock_until
    INTO v_id, v_is_active, v_lock_until
    FROM management_accounts
   WHERE email = p_email
   LIMIT 1;

  IF v_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'invalid_email_or_password';
  END IF;

  IF v_is_active = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'account_disabled';
  END IF;

  IF v_lock_until IS NOT NULL AND v_lock_until > NOW() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'account_locked';
  END IF;

  -- now check password hash
  IF NOT (SELECT p_password_hash = password_hash FROM management_accounts WHERE management_account_id = v_id) THEN
    -- bump failed attempt counter via existing proc
    CALL sp_mgmt_record_login_attempt(p_email, FALSE);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'invalid_email_or_password';
  END IF;

  -- success path: reset attempts
  CALL sp_mgmt_record_login_attempt(p_email, TRUE);

  -- return safe fields
  SELECT management_account_id, email, is_active, created_at
    FROM management_accounts WHERE management_account_id = v_id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_mgmt_create_account` (IN `p_email` VARCHAR(255), IN `p_password_hash` VARBINARY(72))   BEGIN
  INSERT INTO management_accounts(email, password_hash)
  VALUES (p_email, p_password_hash);
  SELECT LAST_INSERT_ID() AS management_account_id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_mgmt_disable_account` (IN `p_management_account_id` INT, IN `p_is_active` BOOLEAN)   BEGIN
  UPDATE management_accounts
     SET is_active = p_is_active
   WHERE management_account_id = p_management_account_id;
  SELECT ROW_COUNT() AS updated;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_mgmt_get_account_for_login` (IN `p_email` VARCHAR(255))   BEGIN
  SELECT
    management_account_id,
    email,
    password_hash,
    is_active,
    lock_until,
    login_attempts,
    last_login_at,
    created_at
  FROM management_accounts
  WHERE email = p_email
  LIMIT 1;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_mgmt_record_login_attempt` (IN `p_email` VARCHAR(255), IN `p_success` BOOLEAN)   BEGIN
  DECLARE v_id INT;
  SELECT management_account_id INTO v_id FROM management_accounts WHERE email = p_email;
  IF v_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'unknown management account email';
  END IF;

  IF p_success THEN
    UPDATE management_accounts
       SET login_attempts = 0,
           lock_until = NULL,
           last_login_at = CURRENT_TIMESTAMP
     WHERE management_account_id = v_id;
  ELSE
    UPDATE management_accounts
       SET login_attempts = login_attempts + 1,
           lock_until = CASE WHEN login_attempts + 1 >= 3 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE)
                             ELSE lock_until END
     WHERE management_account_id = v_id;
  END IF;

  SELECT management_account_id, email, is_active, login_attempts, lock_until, last_login_at, created_at
    FROM management_accounts WHERE management_account_id = v_id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_record_login_attempt` (IN `p_email` VARCHAR(255), IN `p_success` BOOLEAN)   BEGIN
  DECLARE v_account_id INT;
  SELECT account_id INTO v_account_id FROM accounts WHERE email = p_email;
  IF v_account_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'unknown email';
  END IF;

  IF p_success THEN
    UPDATE accounts
       SET login_attempts = 0, lock_until = NULL, is_blocked = 0
     WHERE account_id = v_account_id;
  ELSE
    UPDATE accounts
       SET login_attempts = login_attempts + 1,
           lock_until = CASE WHEN login_attempts + 1 >= 3 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE)
                             ELSE lock_until END,
           is_blocked = CASE WHEN login_attempts + 1 >= 3 THEN 1 ELSE is_blocked END
     WHERE account_id = v_account_id;
  END IF;

  SELECT * FROM accounts WHERE account_id = v_account_id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_record_view` (IN `p_profile_id` INT, IN `p_media_id` INT, IN `p_progress_seconds` INT)   BEGIN
  INSERT INTO viewing_history(profile_id, media_id, resume_position_sec, view_count)
  VALUES (p_profile_id, p_media_id, p_progress_seconds, 1)
  ON DUPLICATE KEY UPDATE
    resume_position_sec = GREATEST(resume_position_sec, VALUES(resume_position_sec)),
    view_count = CASE
                   WHEN VALUES(resume_position_sec) > resume_position_sec THEN view_count + 1
                   ELSE view_count
                 END,
    viewed_at = CURRENT_TIMESTAMP;
  SELECT 1 AS recorded;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_remove_from_watchlist` (IN `p_profile_id` INT, IN `p_media_id` INT)   BEGIN
  DELETE FROM watchlist WHERE profile_id = p_profile_id AND media_id = p_media_id;
  SELECT ROW_COUNT() AS removed;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_set_preferences` (IN `p_profile_id` INT, IN `p_interested_in_films` BOOLEAN, IN `p_interested_in_series` BOOLEAN, IN `p_preferred_genres` VARCHAR(255), IN `p_minimum_age` INT)   BEGIN
  INSERT INTO preferences(profile_id, interested_in_films, interested_in_series, preferred_genres, minimum_age)
  VALUES(p_profile_id, p_interested_in_films, p_interested_in_series, p_preferred_genres, p_minimum_age)
  ON DUPLICATE KEY UPDATE
    interested_in_films = VALUES(interested_in_films),
    interested_in_series = VALUES(interested_in_series),
    preferred_genres = VALUES(preferred_genres),
    minimum_age = VALUES(minimum_age);
  SELECT p_profile_id AS profile_id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_update_account` (IN `p_account_id` INT, IN `p_email` VARCHAR(255), IN `p_password_hash` VARBINARY(100))   BEGIN
  DECLARE v_exists    INT DEFAULT 0;
  DECLARE v_affected  INT DEFAULT 0;

  -- Preserve original SIGNALs; rollback on any SQL error
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- 1) existence
  SELECT COUNT(*) INTO v_exists FROM accounts WHERE account_id = p_account_id;
  IF v_exists = 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'account_not_found';
  END IF;

  -- 2) unique email if provided
  IF p_email IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM accounts
       WHERE email = p_email AND account_id <> p_account_id
    ) THEN
      ROLLBACK;
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'email_already_in_use';
    END IF;
  END IF;

  -- 3) update
  UPDATE accounts
     SET email         = COALESCE(p_email, email),
         password_hash = COALESCE(p_password_hash, password_hash)
   WHERE account_id = p_account_id;

  -- capture affected rows BEFORE COMMIT
  SET v_affected = ROW_COUNT();

  COMMIT;

  -- 4) return status (0 means no-op but still OK)
  SELECT v_affected AS affected_rows, p_account_id AS account_id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_update_profile` (IN `p_profile_id` INT, IN `p_name` VARCHAR(80), IN `p_age` INT, IN `p_language` VARCHAR(10), IN `p_profile_photo` VARCHAR(255))   BEGIN
  UPDATE profiles
     SET name = p_name,
         age = p_age,
         language = p_language,
         profile_photo = p_profile_photo
   WHERE profile_id = p_profile_id;
  SELECT ROW_COUNT() AS updated;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_upsert_media` (IN `p_media_id` INT, IN `p_media_title` VARCHAR(255), IN `p_media_type` ENUM('movie','series'), IN `p_duration_seconds` INT, IN `p_media_description` TEXT, IN `p_release_date` DATE, IN `p_genre` VARCHAR(100), IN `p_quality` VARCHAR(10), IN `p_age_rating` INT)   BEGIN
  DECLARE v_quality VARCHAR(10);

  -- rollback on any SQL error, keep original error message
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  -- basic validations
  IF p_media_title IS NULL OR TRIM(p_media_title) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'invalid_media_title';
  END IF;

  IF p_duration_seconds IS NOT NULL AND p_duration_seconds < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'invalid_duration_seconds';
  END IF;

  SET v_quality = UPPER(TRIM(p_quality));
  IF v_quality NOT IN ('SD','HD','UHD') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'invalid_quality';
  END IF;

  START TRANSACTION;

  IF p_media_id IS NULL OR p_media_id = 0 THEN
    INSERT INTO media(
      media_title, media_type, duration_seconds, media_description,
      release_date, genre, quality, age_rating
    )
    VALUES (
      p_media_title, p_media_type, p_duration_seconds, p_media_description,
      p_release_date, p_genre, v_quality, p_age_rating
    );

    COMMIT;
    SELECT LAST_INSERT_ID() AS media_id;
  ELSE
    UPDATE media
       SET media_title       = p_media_title,
           media_type        = p_media_type,
           duration_seconds  = p_duration_seconds,
           media_description = p_media_description,
           release_date      = p_release_date,
           genre             = p_genre,
           quality           = v_quality,
           age_rating        = p_age_rating
     WHERE media_id = p_media_id;

    COMMIT;
    SELECT p_media_id AS media_id;
  END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `account_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varbinary(72) NOT NULL,
  `is_blocked` tinyint(1) NOT NULL DEFAULT 0,
  `login_attempts` tinyint(4) NOT NULL DEFAULT 0,
  `lock_until` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`account_id`, `email`, `password_hash`, `is_blocked`, `login_attempts`, `lock_until`, `created_at`) VALUES
(1, 'new5@example.com', 0x243262243130244e6a73334a62397a526b657778596b44765031572f6552424649654d2f64596836484c4c365a73597043744a46756a707061545471, 0, 0, NULL, '2025-08-21 03:41:22'),
(3, 'new3@example.com', 0x243262243130246f3557576844654f5a4834344f383948706c4e6a632e4762446272474b667258433133716c63387a686b2f3977455a3258754b3375, 0, 0, NULL, '2025-08-21 04:58:50'),
(4, 'alice@example.com', 0x24326224313024776976703630464c77446d6673655a777a446e7349657548494d382f3673437a426e67476c6a4f6c39386579515445773430396c2e, 0, 0, NULL, '2025-08-21 09:23:18'),
(5, 'bob@example.com', 0x243262243130243834714a6178646e495738594f646e2f50714e526675616e623577534e2e3233393374574553303568376935316c5a69725736574f, 0, 0, NULL, '2025-08-21 09:23:27'),
(6, 'charlie@example.com', 0x243262243130243771732f673276483977454b4a2f384269497876534f4d7258494d4c566b4572784d73662e494278495a5732644c68516a702e4747, 0, 0, NULL, '2025-08-21 09:23:33');

-- --------------------------------------------------------

--
-- Table structure for table `management_accounts`
--

CREATE TABLE `management_accounts` (
  `management_account_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varbinary(72) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `login_attempts` tinyint(4) NOT NULL DEFAULT 0,
  `lock_until` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `management_accounts`
--

INSERT INTO `management_accounts` (`management_account_id`, `email`, `password_hash`, `is_active`, `login_attempts`, `lock_until`, `last_login_at`, `created_at`) VALUES
(1, 'admin@netflix.com', 0x2432622431302430504a6e566a796952564c582e32364d3348774c4875534e716978394e512f4b6c616f4a6b7a795a50527554523638567334646d75, 1, 0, NULL, '2025-08-22 18:52:49', '2025-08-20 05:16:36');

-- --------------------------------------------------------

--
-- Table structure for table `media`
--

CREATE TABLE `media` (
  `media_id` int(11) NOT NULL,
  `media_title` varchar(255) NOT NULL,
  `media_type` enum('movie','series','episode') NOT NULL,
  `duration_seconds` int(11) NOT NULL,
  `media_description` varchar(1000) DEFAULT NULL,
  `amount_of_views` int(11) NOT NULL DEFAULT 0,
  `release_date` date DEFAULT NULL,
  `genre` varchar(255) DEFAULT NULL,
  `quality` enum('SD','HD','UHD') DEFAULT NULL,
  `age_rating` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `media`
--

INSERT INTO `media` (`media_id`, `media_title`, `media_type`, `duration_seconds`, `media_description`, `amount_of_views`, `release_date`, `genre`, `quality`, `age_rating`) VALUES
(3, 'Stranger Things', 'series', 3600, 'Sci-fi mystery in 80s 123 setting.', 0, '2016-07-14', 'Sci-Fi', 'UHD', 18),
(4, 'Breaking Bad', 'series', 3600, 'A chemistry teacher turns to crime.', 0, '2008-01-20', 'Drama', NULL, 18),
(5, 'Frozen', 'movie', 6120, 'Disney animated musical.', 0, '2013-11-27', 'Animation', NULL, 6),
(6, 'The Crown', 'series', 3600, 'Historical drama about the British monarchy.', 0, '2016-11-04', 'Drama', NULL, 12),
(7, 'Time', 'movie', 3600, 'Film about time', 0, '2016-10-11', 'Drama', NULL, 18),
(8, 'The Crown2', 'series', 3600, 'Historical drama about the British monarchy 2.', 0, '2019-11-04', 'Drama', NULL, 16),
(9, 'The Crown3', 'movie', 4000, 'Historical drama about the British monarchy 2.', 0, '2019-11-03', 'Drama', 'UHD', 16);

-- --------------------------------------------------------

--
-- Table structure for table `preferences`
--

CREATE TABLE `preferences` (
  `preferences_id` int(11) NOT NULL,
  `profile_id` int(11) NOT NULL,
  `interested_in_films` tinyint(1) DEFAULT NULL,
  `interested_in_series` tinyint(1) DEFAULT NULL,
  `preferred_genres` varchar(255) DEFAULT NULL,
  `minimum_age` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `preferences`
--

INSERT INTO `preferences` (`preferences_id`, `profile_id`, `interested_in_films`, `interested_in_series`, `preferred_genres`, `minimum_age`) VALUES
(1, 6, 1, 1, 'Sci-Fi,Drama', 18),
(2, 7, 1, 0, 'Animation,Family', 7),
(3, 8, 1, 1, 'Drama,Crime', 18),
(4, 9, 1, 1, 'Sci-Fi,Adventure', 16);

-- --------------------------------------------------------

--
-- Table structure for table `profiles`
--

CREATE TABLE `profiles` (
  `profile_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `name` varchar(80) NOT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `language` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `profiles`
--

INSERT INTO `profiles` (`profile_id`, `account_id`, `name`, `profile_photo`, `age`, `language`) VALUES
(2, 1, 'Alice', NULL, 12, 'EN'),
(3, 1, 'Alice2', 'https://cdn/img.png', 16, 'EN'),
(4, 1, 'Alice22', 'https://cdn/img.png', 19, 'EN'),
(5, 1, 'Alice223', 'https://cdn/img.png', 23, 'EN'),
(6, 4, 'Alice Main', NULL, 28, 'DE'),
(7, 4, 'Kiddo', NULL, 8, 'EN'),
(8, 5, 'Bob Main', NULL, 35, 'DE'),
(9, 6, 'Charlie Teen', NULL, 15, 'FR');

--
-- Triggers `profiles`
--
DELIMITER $$
CREATE TRIGGER `trg_profiles_max4` BEFORE INSERT ON `profiles` FOR EACH ROW BEGIN
  DECLARE cnt INT;
  SELECT COUNT(*) INTO cnt FROM profiles WHERE account_id = NEW.account_id;
  IF cnt >= 4 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'max 4 profiles per account';
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `referrals`
--

CREATE TABLE `referrals` (
  `referral_id` int(11) NOT NULL,
  `inviter_account_id` int(11) NOT NULL,
  `invitee_account_id` int(11) NOT NULL,
  `is_discount_active` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subscriptions`
--

CREATE TABLE `subscriptions` (
  `subscription_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `quality` enum('SD','HD','UHD') NOT NULL,
  `price` decimal(6,2) GENERATED ALWAYS AS (case `quality` when 'SD' then 7.99 when 'HD' then 10.99 when 'UHD' then 13.99 end) STORED,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('active','paused','cancelled') NOT NULL DEFAULT 'active',
  `trial_ends_at` date DEFAULT NULL,
  `is_discount_active` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subscriptions`
--

INSERT INTO `subscriptions` (`subscription_id`, `account_id`, `quality`, `start_date`, `end_date`, `status`, `trial_ends_at`, `is_discount_active`) VALUES
(1, 1, 'HD', '2025-08-21', '2025-08-21', 'cancelled', NULL, 0),
(2, 1, 'UHD', '2025-08-21', '2025-09-20', 'active', NULL, 0),
(3, 4, 'HD', '2025-08-21', '2025-08-22', 'cancelled', '2025-08-28', 0),
(4, 5, 'UHD', '2025-08-21', '2025-09-20', 'active', NULL, 0),
(5, 6, 'SD', '2025-08-21', '2025-09-20', 'active', '2025-08-24', 0),
(6, 4, 'SD', '2025-08-22', '2025-09-21', 'active', '2025-09-21', 0);

--
-- Triggers `subscriptions`
--
DELIMITER $$
CREATE TRIGGER `trg_subscriptions_one_active` BEFORE INSERT ON `subscriptions` FOR EACH ROW BEGIN
  IF NEW.status = 'active' THEN
    IF EXISTS (
      SELECT 1
        FROM subscriptions
       WHERE account_id = NEW.account_id
         AND status = 'active'
         AND (end_date IS NULL OR end_date >= CURDATE())
    ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'account already has an active subscription';
    END IF;
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `subtitles`
--

CREATE TABLE `subtitles` (
  `subtitle_id` int(11) NOT NULL,
  `media_id` int(11) NOT NULL,
  `language` varchar(10) NOT NULL,
  `cue_time_sec` int(11) NOT NULL,
  `text` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `viewing_history`
--

CREATE TABLE `viewing_history` (
  `viewing_id` int(11) NOT NULL,
  `profile_id` int(11) NOT NULL,
  `media_id` int(11) NOT NULL,
  `viewed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `resume_position_sec` int(11) NOT NULL DEFAULT 0,
  `view_count` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Triggers `viewing_history`
--
DELIMITER $$
CREATE TRIGGER `trg_vh_clamp_resume_before_ins` BEFORE INSERT ON `viewing_history` FOR EACH ROW BEGIN
  DECLARE d INT;
  SELECT duration_seconds INTO d FROM media WHERE media_id = NEW.media_id;
  IF d IS NOT NULL AND NEW.resume_position_sec > d THEN
    SET NEW.resume_position_sec = d;
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_vh_clamp_resume_before_upd` BEFORE UPDATE ON `viewing_history` FOR EACH ROW BEGIN
  DECLARE d INT;
  SELECT duration_seconds INTO d FROM media WHERE media_id = NEW.media_id;
  IF d IS NOT NULL AND NEW.resume_position_sec > d THEN
    SET NEW.resume_position_sec = d;
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_viewing_history_inc_views` AFTER INSERT ON `viewing_history` FOR EACH ROW BEGIN
  UPDATE media
     SET amount_of_views = amount_of_views + 1
   WHERE media_id = NEW.media_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_account_profiles`
-- (See below for the actual view)
--
CREATE TABLE `v_account_profiles` (
`account_id` int(11)
,`email` varchar(255)
,`profile_id` int(11)
,`name` varchar(80)
,`age` int(11)
,`language` varchar(10)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_active_subscriptions`
-- (See below for the actual view)
--
CREATE TABLE `v_active_subscriptions` (
`subscription_id` int(11)
,`account_id` int(11)
,`quality` enum('SD','HD','UHD')
,`price` decimal(6,2)
,`start_date` date
,`end_date` date
,`status` enum('active','paused','cancelled')
,`trial_ends_at` date
,`is_discount_active` tinyint(1)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_management_accounts`
-- (See below for the actual view)
--
CREATE TABLE `v_management_accounts` (
`management_account_id` int(11)
,`email` varchar(255)
,`is_active` tinyint(1)
,`login_attempts` tinyint(4)
,`lock_until` datetime
,`last_login_at` datetime
,`created_at` datetime
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_media_catalog`
-- (See below for the actual view)
--
CREATE TABLE `v_media_catalog` (
`media_id` int(11)
,`media_title` varchar(255)
,`media_type` enum('movie','series','episode')
,`release_date` date
,`genre` varchar(255)
,`quality` enum('SD','HD','UHD')
,`age_rating` int(11)
,`amount_of_views` int(11)
,`duration_seconds` int(11)
,`media_description` varchar(1000)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_preferences_anon`
-- (See below for the actual view)
--
CREATE TABLE `v_preferences_anon` (
`profile_hash` varchar(64)
,`age_group` varchar(7)
,`interested_in_films` tinyint(1)
,`interested_in_series` tinyint(1)
,`preferred_genres` varchar(255)
,`minimum_age` int(11)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_watch_stats`
-- (See below for the actual view)
--
CREATE TABLE `v_watch_stats` (
`profile_id` int(11)
,`media_id` int(11)
,`total_views` decimal(32,0)
,`last_position_sec` int(11)
,`last_viewed_at` datetime
);

-- --------------------------------------------------------

--
-- Table structure for table `watchlist`
--

CREATE TABLE `watchlist` (
  `watchlist_id` int(11) NOT NULL,
  `profile_id` int(11) NOT NULL,
  `media_id` int(11) NOT NULL,
  `date_added` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`account_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `management_accounts`
--
ALTER TABLE `management_accounts`
  ADD PRIMARY KEY (`management_account_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `media`
--
ALTER TABLE `media`
  ADD PRIMARY KEY (`media_id`);

--
-- Indexes for table `preferences`
--
ALTER TABLE `preferences`
  ADD PRIMARY KEY (`preferences_id`),
  ADD UNIQUE KEY `profile_id` (`profile_id`);

--
-- Indexes for table `profiles`
--
ALTER TABLE `profiles`
  ADD PRIMARY KEY (`profile_id`),
  ADD KEY `fk_profiles_account` (`account_id`);

--
-- Indexes for table `referrals`
--
ALTER TABLE `referrals`
  ADD PRIMARY KEY (`referral_id`),
  ADD UNIQUE KEY `uq_ref_pair` (`inviter_account_id`,`invitee_account_id`),
  ADD KEY `fk_ref_invitee` (`invitee_account_id`);

--
-- Indexes for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD PRIMARY KEY (`subscription_id`),
  ADD KEY `fk_subscriptions_account` (`account_id`);

--
-- Indexes for table `subtitles`
--
ALTER TABLE `subtitles`
  ADD PRIMARY KEY (`subtitle_id`),
  ADD KEY `fk_subtitles_media` (`media_id`);

--
-- Indexes for table `viewing_history`
--
ALTER TABLE `viewing_history`
  ADD PRIMARY KEY (`viewing_id`),
  ADD UNIQUE KEY `uq_vh_profile_media` (`profile_id`,`media_id`),
  ADD KEY `fk_vh_media` (`media_id`);

--
-- Indexes for table `watchlist`
--
ALTER TABLE `watchlist`
  ADD PRIMARY KEY (`watchlist_id`),
  ADD UNIQUE KEY `uq_watchlist` (`profile_id`,`media_id`),
  ADD KEY `fk_watchlist_media` (`media_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `account_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `management_accounts`
--
ALTER TABLE `management_accounts`
  MODIFY `management_account_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `media`
--
ALTER TABLE `media`
  MODIFY `media_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `preferences`
--
ALTER TABLE `preferences`
  MODIFY `preferences_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `profiles`
--
ALTER TABLE `profiles`
  MODIFY `profile_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `referrals`
--
ALTER TABLE `referrals`
  MODIFY `referral_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `subscriptions`
--
ALTER TABLE `subscriptions`
  MODIFY `subscription_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `subtitles`
--
ALTER TABLE `subtitles`
  MODIFY `subtitle_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `viewing_history`
--
ALTER TABLE `viewing_history`
  MODIFY `viewing_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `watchlist`
--
ALTER TABLE `watchlist`
  MODIFY `watchlist_id` int(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------

--
-- Structure for view `v_account_profiles`
--
DROP TABLE IF EXISTS `v_account_profiles`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`%` SQL SECURITY DEFINER VIEW `v_account_profiles`  AS SELECT `a`.`account_id` AS `account_id`, `a`.`email` AS `email`, `p`.`profile_id` AS `profile_id`, `p`.`name` AS `name`, `p`.`age` AS `age`, `p`.`language` AS `language` FROM (`accounts` `a` join `profiles` `p` on(`p`.`account_id` = `a`.`account_id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `v_active_subscriptions`
--
DROP TABLE IF EXISTS `v_active_subscriptions`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`%` SQL SECURITY DEFINER VIEW `v_active_subscriptions`  AS SELECT `s`.`subscription_id` AS `subscription_id`, `s`.`account_id` AS `account_id`, `s`.`quality` AS `quality`, `s`.`price` AS `price`, `s`.`start_date` AS `start_date`, `s`.`end_date` AS `end_date`, `s`.`status` AS `status`, `s`.`trial_ends_at` AS `trial_ends_at`, `s`.`is_discount_active` AS `is_discount_active` FROM `subscriptions` AS `s` WHERE `s`.`status` = 'active' AND (`s`.`end_date` is null OR `s`.`end_date` >= curdate()) ;

-- --------------------------------------------------------

--
-- Structure for view `v_management_accounts`
--
DROP TABLE IF EXISTS `v_management_accounts`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`%` SQL SECURITY DEFINER VIEW `v_management_accounts`  AS SELECT `management_accounts`.`management_account_id` AS `management_account_id`, `management_accounts`.`email` AS `email`, `management_accounts`.`is_active` AS `is_active`, `management_accounts`.`login_attempts` AS `login_attempts`, `management_accounts`.`lock_until` AS `lock_until`, `management_accounts`.`last_login_at` AS `last_login_at`, `management_accounts`.`created_at` AS `created_at` FROM `management_accounts` ORDER BY `management_accounts`.`created_at` DESC ;

-- --------------------------------------------------------

--
-- Structure for view `v_media_catalog`
--
DROP TABLE IF EXISTS `v_media_catalog`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`%` SQL SECURITY DEFINER VIEW `v_media_catalog`  AS SELECT `m`.`media_id` AS `media_id`, `m`.`media_title` AS `media_title`, `m`.`media_type` AS `media_type`, `m`.`release_date` AS `release_date`, `m`.`genre` AS `genre`, `m`.`quality` AS `quality`, `m`.`age_rating` AS `age_rating`, `m`.`amount_of_views` AS `amount_of_views`, `m`.`duration_seconds` AS `duration_seconds`, `m`.`media_description` AS `media_description` FROM `media` AS `m` ;

-- --------------------------------------------------------

--
-- Structure for view `v_preferences_anon`
--
DROP TABLE IF EXISTS `v_preferences_anon`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`%` SQL SECURITY DEFINER VIEW `v_preferences_anon`  AS SELECT sha2(concat('p-',`p`.`profile_id`),256) AS `profile_hash`, CASE WHEN `p`.`age` is null THEN 'unknown' WHEN `p`.`age` < 13 THEN 'child' WHEN `p`.`age` between 13 and 17 THEN 'teen' WHEN `p`.`age` between 18 and 29 THEN '18-29' WHEN `p`.`age` between 30 and 44 THEN '30-44' WHEN `p`.`age` between 45 and 59 THEN '45-59' ELSE '60+' END AS `age_group`, `pr`.`interested_in_films` AS `interested_in_films`, `pr`.`interested_in_series` AS `interested_in_series`, `pr`.`preferred_genres` AS `preferred_genres`, `pr`.`minimum_age` AS `minimum_age` FROM (`profiles` `p` join `preferences` `pr` on(`pr`.`profile_id` = `p`.`profile_id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `v_watch_stats`
--
DROP TABLE IF EXISTS `v_watch_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`%` SQL SECURITY DEFINER VIEW `v_watch_stats`  AS SELECT `vh`.`profile_id` AS `profile_id`, `vh`.`media_id` AS `media_id`, sum(`vh`.`view_count`) AS `total_views`, max(`vh`.`resume_position_sec`) AS `last_position_sec`, max(`vh`.`viewed_at`) AS `last_viewed_at` FROM `viewing_history` AS `vh` GROUP BY `vh`.`profile_id`, `vh`.`media_id` ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `preferences`
--
ALTER TABLE `preferences`
  ADD CONSTRAINT `fk_preferences_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`profile_id`) ON DELETE CASCADE;

--
-- Constraints for table `profiles`
--
ALTER TABLE `profiles`
  ADD CONSTRAINT `fk_profiles_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE;

--
-- Constraints for table `referrals`
--
ALTER TABLE `referrals`
  ADD CONSTRAINT `fk_ref_invitee` FOREIGN KEY (`invitee_account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ref_inviter` FOREIGN KEY (`inviter_account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE;

--
-- Constraints for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD CONSTRAINT `fk_subscriptions_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE;

--
-- Constraints for table `subtitles`
--
ALTER TABLE `subtitles`
  ADD CONSTRAINT `fk_subtitles_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`media_id`) ON DELETE CASCADE;

--
-- Constraints for table `viewing_history`
--
ALTER TABLE `viewing_history`
  ADD CONSTRAINT `fk_vh_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`media_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_vh_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`profile_id`) ON DELETE CASCADE;

--
-- Constraints for table `watchlist`
--
ALTER TABLE `watchlist`
  ADD CONSTRAINT `fk_watchlist_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`media_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_watchlist_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`profile_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
