CREATE TABLE `package_responses` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`expires` numeric NOT NULL,
	`mtime` numeric NOT NULL,
	`integrity` text NOT NULL,
	`package_name` text NOT NULL,
	`package_version` text
);
--> statement-breakpoint
CREATE TABLE `packages` (
	`name` text PRIMARY KEY NOT NULL,
	`packument` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tarball_responses` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`expires` numeric NOT NULL,
	`mtime` numeric NOT NULL,
	`integrity` text NOT NULL
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
	`manifest` text NOT NULL
);
