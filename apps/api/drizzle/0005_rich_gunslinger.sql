CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`action` text NOT NULL,
	`resource` text,
	`resource_id` text,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` integer NOT NULL,
	`currency` text DEFAULT 'MYR',
	`interval` text DEFAULT 'monthly',
	`bot_limit` integer DEFAULT 5 NOT NULL,
	`flow_limit` integer DEFAULT 10 NOT NULL,
	`features` text,
	`is_active` integer DEFAULT true,
	`sort_order` integer DEFAULT 0,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`planId` text NOT NULL,
	`status` text DEFAULT 'pending',
	`current_period_start` integer,
	`current_period_end` integer,
	`cancelled_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`category` text DEFAULT 'general',
	`description` text,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `system_settings_key_unique` ON `system_settings` (`key`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`subscriptionId` text,
	`planId` text,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'MYR',
	`payment_method` text,
	`payment_gateway` text,
	`status` text DEFAULT 'pending',
	`gateway_transaction_id` text,
	`gateway_response` text,
	`metadata` text,
	`paid_at` integer,
	`created_at` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
