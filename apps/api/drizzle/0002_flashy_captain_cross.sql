CREATE TABLE `bot_collaborators` (
	`id` text PRIMARY KEY NOT NULL,
	`botId` text NOT NULL,
	`userId` text NOT NULL,
	`role` text DEFAULT 'editor',
	`created_at` integer,
	FOREIGN KEY (`botId`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `account` ADD `accessTokenExpiresAt` integer;--> statement-breakpoint
ALTER TABLE `account` ADD `refreshTokenExpiresAt` integer;--> statement-breakpoint
ALTER TABLE `account` ADD `scope` text;--> statement-breakpoint
ALTER TABLE `account` ADD `createdAt` integer;--> statement-breakpoint
ALTER TABLE `account` ADD `updatedAt` integer;--> statement-breakpoint
ALTER TABLE `bots` ADD `client_id` text;--> statement-breakpoint
ALTER TABLE `bots` ADD `avatar` text;--> statement-breakpoint
CREATE UNIQUE INDEX `bots_token_unique` ON `bots` (`token`);--> statement-breakpoint
ALTER TABLE `session` ADD `token` text NOT NULL;--> statement-breakpoint
ALTER TABLE `session` ADD `createdAt` integer;--> statement-breakpoint
ALTER TABLE `session` ADD `updatedAt` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);