CREATE TABLE `ai_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text,
	`default_provider` text,
	`default_mode` text DEFAULT 'auto',
	`is_active` integer DEFAULT true,
	`created_at` integer,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_id` text NOT NULL,
	`provider` text NOT NULL,
	`api_key` text NOT NULL,
	`is_enabled` integer DEFAULT true,
	`models` text,
	`endpoint` text,
	`deployment` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_token_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`provider_label` text NOT NULL,
	`daily_limit` integer DEFAULT 0,
	`weekly_limit` integer DEFAULT 0,
	`monthly_limit` integer DEFAULT 0,
	`auto_reset_daily` integer DEFAULT true,
	`auto_reset_weekly` integer DEFAULT true,
	`auto_reset_monthly` integer DEFAULT true,
	`daily_used` integer DEFAULT 0,
	`weekly_used` integer DEFAULT 0,
	`monthly_used` integer DEFAULT 0,
	`daily_reset_at` integer,
	`weekly_reset_at` integer,
	`monthly_reset_at` integer,
	`allow_admin_bypass` integer DEFAULT true,
	`notify_owner_on_limit` integer DEFAULT true,
	`is_enabled` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_token_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`provider_label` text NOT NULL,
	`user_id` text,
	`user_name` text,
	`tokens_used` integer,
	`request_type` text,
	`model` text,
	`created_at` integer,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ai_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`user_id` text NOT NULL,
	`ai_provider` text DEFAULT 'gemini',
	`ai_mode` text DEFAULT 'auto',
	`ai_model` text,
	`conversation_history` text,
	`status` text DEFAULT 'active',
	`created_at` integer,
	`closed_at` integer,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_ai_sessions`("id", "bot_id", "thread_id", "channel_id", "user_id", "ai_provider", "ai_mode", "ai_model", "conversation_history", "status", "created_at", "closed_at") SELECT "id", "bot_id", "thread_id", "channel_id", "user_id", "ai_provider", "ai_mode", "ai_model", "conversation_history", "status", "created_at", "closed_at" FROM `ai_sessions`;--> statement-breakpoint
DROP TABLE `ai_sessions`;--> statement-breakpoint
ALTER TABLE `__new_ai_sessions` RENAME TO `ai_sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;