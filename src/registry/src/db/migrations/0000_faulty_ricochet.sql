CREATE TABLE `packages` (
	`name` text PRIMARY KEY NOT NULL,
	`tags` text
);
CREATE TABLE `tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`uuid` text NOT NULL,
	`scope` text
);
CREATE TABLE `versions` (
	`spec` text PRIMARY KEY NOT NULL,
	`manifest` text,
	`published_at` text
);
