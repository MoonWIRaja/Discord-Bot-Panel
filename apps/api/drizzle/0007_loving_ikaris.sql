CREATE TABLE `ai_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`user_id` text NOT NULL,
	`ai_provider` text DEFAULT 'openai',
	`conversation_history` text,
	`status` text DEFAULT 'active',
	`created_at` integer,
	`closed_at` integer,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade
);
