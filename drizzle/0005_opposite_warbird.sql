CREATE TABLE `grocery_list_items` (
	`id` text PRIMARY KEY NOT NULL,
	`grocery_list_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` text,
	`unit` text,
	`notes` text,
	`is_completed` integer,
	`category` text,
	`order` integer,
	`created_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`grocery_list_id`) REFERENCES `grocery_lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `grocery_list_recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`grocery_list_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`variant_id` text,
	`multiplier` real,
	`added_at` integer,
	FOREIGN KEY (`grocery_list_id`) REFERENCES `grocery_lists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `recipe_variants`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `grocery_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
