PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cookbook_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`cookbook_id` text NOT NULL,
	`inviter_user_id` text NOT NULL,
	`invitee_email` text NOT NULL,
	`invitee_user_id` text,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`message` text,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`cookbook_id`) REFERENCES `cookbooks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inviter_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invitee_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_cookbook_invitations`("id", "cookbook_id", "inviter_user_id", "invitee_email", "invitee_user_id", "role", "status", "message", "created_at", "expires_at") SELECT "id", "cookbook_id", "inviter_user_id", "invitee_email", "invitee_user_id", "role", "status", "message", "created_at", "expires_at" FROM `cookbook_invitations`;--> statement-breakpoint
DROP TABLE `cookbook_invitations`;--> statement-breakpoint
ALTER TABLE `__new_cookbook_invitations` RENAME TO `cookbook_invitations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_cookbook_members` (
	`id` text PRIMARY KEY NOT NULL,
	`cookbook_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`cookbook_id`) REFERENCES `cookbooks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_cookbook_members`("id", "cookbook_id", "user_id", "role", "joined_at") SELECT "id", "cookbook_id", "user_id", "role", "joined_at" FROM `cookbook_members`;--> statement-breakpoint
DROP TABLE `cookbook_members`;--> statement-breakpoint
ALTER TABLE `__new_cookbook_members` RENAME TO `cookbook_members`;--> statement-breakpoint
CREATE TABLE `__new_cookbook_recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`cookbook_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`added_by_user_id` text NOT NULL,
	`original_recipe_id` text,
	`notes` text,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`cookbook_id`) REFERENCES `cookbooks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`added_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`original_recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_cookbook_recipes`("id", "cookbook_id", "recipe_id", "added_by_user_id", "original_recipe_id", "notes", "added_at") SELECT "id", "cookbook_id", "recipe_id", "added_by_user_id", "original_recipe_id", "notes", "added_at" FROM `cookbook_recipes`;--> statement-breakpoint
DROP TABLE `cookbook_recipes`;--> statement-breakpoint
ALTER TABLE `__new_cookbook_recipes` RENAME TO `cookbook_recipes`;--> statement-breakpoint
CREATE TABLE `__new_cookbooks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`is_public` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_cookbooks`("id", "owner_id", "title", "description", "is_public", "created_at", "updated_at") SELECT "id", "owner_id", "title", "description", "is_public", "created_at", "updated_at" FROM `cookbooks`;--> statement-breakpoint
DROP TABLE `cookbooks`;--> statement-breakpoint
ALTER TABLE `__new_cookbooks` RENAME TO `cookbooks`;