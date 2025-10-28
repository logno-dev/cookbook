PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_grocery_list_items` (
	`id` text PRIMARY KEY NOT NULL,
	`grocery_list_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` text,
	`unit` text,
	`notes` text,
	`is_completed` integer,
	`category` text,
	`order` integer,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`grocery_list_id`) REFERENCES `grocery_lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_grocery_list_items`("id", "grocery_list_id", "name", "quantity", "unit", "notes", "is_completed", "category", "order", "created_at", "completed_at") SELECT "id", "grocery_list_id", "name", "quantity", "unit", "notes", "is_completed", "category", "order", "created_at", "completed_at" FROM `grocery_list_items`;--> statement-breakpoint
DROP TABLE `grocery_list_items`;--> statement-breakpoint
ALTER TABLE `__new_grocery_list_items` RENAME TO `grocery_list_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_grocery_list_recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`grocery_list_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`variant_id` text,
	`multiplier` real,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`grocery_list_id`) REFERENCES `grocery_lists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `recipe_variants`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_grocery_list_recipes`("id", "grocery_list_id", "recipe_id", "variant_id", "multiplier", "added_at") SELECT "id", "grocery_list_id", "recipe_id", "variant_id", "multiplier", "added_at" FROM `grocery_list_recipes`;--> statement-breakpoint
DROP TABLE `grocery_list_recipes`;--> statement-breakpoint
ALTER TABLE `__new_grocery_list_recipes` RENAME TO `grocery_list_recipes`;--> statement-breakpoint
CREATE TABLE `__new_grocery_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_grocery_lists`("id", "user_id", "name", "description", "created_at", "updated_at") SELECT "id", "user_id", "name", "description", "created_at", "updated_at" FROM `grocery_lists`;--> statement-breakpoint
DROP TABLE `grocery_lists`;--> statement-breakpoint
ALTER TABLE `__new_grocery_lists` RENAME TO `grocery_lists`;