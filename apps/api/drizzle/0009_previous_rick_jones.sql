CREATE TABLE `ai_knowledge_base` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_id` text NOT NULL,
	`category` text DEFAULT 'fact',
	`key` text NOT NULL,
	`value` text NOT NULL,
	`confidence` integer DEFAULT 80,
	`source` text DEFAULT 'auto',
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_training_data` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_id` text NOT NULL,
	`user_message` text NOT NULL,
	`ai_response` text NOT NULL,
	`user_id` text,
	`user_name` text,
	`channel_id` text,
	`is_approved` integer DEFAULT true,
	`created_at` integer,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_training_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_id` text NOT NULL,
	`is_training_active` integer DEFAULT false,
	`training_channel_id` text,
	`total_examples` integer DEFAULT 0,
	`notification_msg_ids` text,
	`last_trained_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_training_settings_bot_id_unique` ON `ai_training_settings` (`bot_id`);--> statement-breakpoint
ALTER TABLE `ai_token_usage` ADD `cost_usd` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ai_token_usage` ADD `image_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ai_token_usage` ADD `audio_seconds` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ai_token_usage` ADD `characters_count` integer DEFAULT 0;