# Privileges for `api`@`%`

GRANT USAGE ON *.* TO `api`@`%` IDENTIFIED BY PASSWORD '*BE59C53AF5F50F95FCF6E4DF05D514D2D673BECB';

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_delete_account` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_get_account_profiles` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_get_active_subscriptions` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_create_profile` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_create_subscription` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_get_media_catalog` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_cancel_subscription` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_mgmt_get_account_for_login` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_delete_profile` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_get_watch_stats` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_create_account` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_delete_media` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_mgmt_record_login_attempt` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_update_profile` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_change_subscription_quality` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_upsert_media` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_get_active_subscriptions_by_account` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_update_account` TO `api`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_get_preferences_anon` TO `api`@`%`;


# Privileges for `junior`@`%`

GRANT USAGE ON *.* TO `junior`@`%` IDENTIFIED BY PASSWORD '*AC2F5CC016606156A47CFB99F6417F3702E58D19';

GRANT SELECT, SHOW VIEW ON `netflix`.`v_media_catalog` TO `junior`@`%`;

GRANT SELECT, SHOW VIEW ON `netflix`.`v_account_profiles` TO `junior`@`%`;

GRANT SELECT ON `netflix`.`v_preferences_anon` TO `junior`@`%`;


# Privileges for `medior`@`%`

GRANT USAGE ON *.* TO `medior`@`%` IDENTIFIED BY PASSWORD '*88D63A3FDF1CAEB448AA07781AB4DE4A3F32B030';

GRANT SELECT ON `netflix`.`v_media_catalog` TO `medior`@`%`;

GRANT SELECT ON `netflix`.`v_preferences_anon` TO `medior`@`%`;

GRANT SELECT ON `netflix`.`v_account_profiles` TO `medior`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_delete_profile` TO `medior`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_get_media_catalog` TO `medior`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_set_preferences` TO `medior`@`%`;

GRANT EXECUTE ON PROCEDURE `netflix`.`sp_create_profile` TO `medior`@`%`;


# Privileges for `senior`@`%`

GRANT USAGE ON *.* TO `senior`@`%` IDENTIFIED BY PASSWORD '*666984EB97728C2807ABDC6F64D8BDBCF4AFBD7E';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, SHOW VIEW ON `netflix`.* TO `senior`@`%`;