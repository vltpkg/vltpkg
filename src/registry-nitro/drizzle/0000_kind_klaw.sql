CREATE TABLE `packages` (
	`name` text PRIMARY KEY NOT NULL,
	`tags` text,
	`last_updated` text,
	`origin` text DEFAULT 'local' NOT NULL,
	`upstream` text,
	`cached_at` text
);
--> statement-breakpoint
CREATE TABLE `tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`uuid` text NOT NULL,
	`scope` text
);
--> statement-breakpoint
CREATE TABLE `versions` (
	`spec` text PRIMARY KEY NOT NULL,
	`manifest` text,
	`published_at` text,
	`origin` text DEFAULT 'local' NOT NULL,
	`upstream` text,
	`cached_at` text
);
