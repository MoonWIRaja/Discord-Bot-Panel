CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`nodes` text NOT NULL,
	`edges` text NOT NULL,
	`is_default` integer DEFAULT true,
	`downloads` integer DEFAULT 0,
	`created_at` integer
);
