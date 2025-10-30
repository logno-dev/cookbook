ALTER TABLE `users` ADD `is_super_admin` integer;
UPDATE `users` SET `is_super_admin` = 1 WHERE `email` = 'logan@bunch.codes';