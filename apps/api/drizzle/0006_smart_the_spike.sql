PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'utility',
	`icon` text DEFAULT 'code',
	`color` text DEFAULT '#3b82f6',
	`nodes` text NOT NULL,
	`edges` text NOT NULL,
	`is_default` integer DEFAULT false,
	`downloads` integer DEFAULT 0,
	`created_by` text,
	`creator_name` text,
	`created_at` integer,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_templates`("id", "name", "description", "category", "icon", "color", "nodes", "edges", "is_default", "downloads", "created_by", "creator_name", "created_at") SELECT "id", "name", "description", "category", "icon", "color", "nodes", "edges", "is_default", "downloads", "created_by", "creator_name", "created_at" FROM `templates`;--> statement-breakpoint
DROP TABLE `templates`;--> statement-breakpoint
ALTER TABLE `__new_templates` RENAME TO `templates`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `plans` ADD `contact_support` integer DEFAULT false;