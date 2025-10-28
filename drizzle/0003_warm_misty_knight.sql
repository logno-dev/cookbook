CREATE TABLE `cookbook_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`cookbook_id` text NOT NULL,
	`inviter_user_id` text NOT NULL,
	`invitee_email` text NOT NULL,
	`invitee_user_id` text,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`message` text,
	`created_at` integer,
	`expires_at` integer,
	FOREIGN KEY (`cookbook_id`) REFERENCES `cookbooks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inviter_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invitee_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cookbook_members` (
	`id` text PRIMARY KEY NOT NULL,
	`cookbook_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`joined_at` integer,
	FOREIGN KEY (`cookbook_id`) REFERENCES `cookbooks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cookbook_recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`cookbook_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`added_by_user_id` text NOT NULL,
	`original_recipe_id` text,
	`notes` text,
	`added_at` integer,
	FOREIGN KEY (`cookbook_id`) REFERENCES `cookbooks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`added_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`original_recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `cookbooks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`is_public` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
