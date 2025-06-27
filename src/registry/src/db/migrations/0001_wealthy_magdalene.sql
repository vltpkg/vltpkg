ALTER TABLE `packages` ADD `last_updated` text;--> statement-breakpoint
ALTER TABLE `packages` ADD `origin` text DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE `packages` ADD `upstream` text;--> statement-breakpoint
ALTER TABLE `packages` ADD `cached_at` text;--> statement-breakpoint
ALTER TABLE `versions` ADD `origin` text DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE `versions` ADD `upstream` text;--> statement-breakpoint
ALTER TABLE `versions` ADD `cached_at` text;