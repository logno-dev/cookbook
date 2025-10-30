CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`theme` text,
	`language` text,
	`timezone` text,
	`default_serving_size` integer,
	`preferred_units` text,
	`show_nutrition_info` integer,
	`show_cooking_tips` integer,
	`profile_visibility` text,
	`allow_cookbook_invitations` integer,
	`email_notifications` integer,
	`cookbook_invite_notifications` integer,
	`recipe_update_notifications` integer,
	`weekly_digest` integer,
	`default_grocery_list_view` text,
	`auto_complete_grocery_items` integer,
	`custom_preferences` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_id_unique` ON `user_settings` (`user_id`);