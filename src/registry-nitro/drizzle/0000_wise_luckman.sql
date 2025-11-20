CREATE TABLE "login_sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"token" text,
	"clerk_user_id" text,
	"done_url" text,
	"created" bigint NOT NULL,
	"expires" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"name" text PRIMARY KEY NOT NULL,
	"packument" text NOT NULL,
	"headers" json NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarballs" (
	"name" text NOT NULL,
	"version" text NOT NULL,
	"headers" json NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "tarballs_name_version_pk" PRIMARY KEY("name","version")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"uuid" text NOT NULL,
	"scope" text,
	"created" bigint NOT NULL,
	"expires" bigint
);
--> statement-breakpoint
CREATE TABLE "versions" (
	"name" text NOT NULL,
	"version" text NOT NULL,
	"manifest" text NOT NULL,
	"headers" json NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "versions_name_version_pk" PRIMARY KEY("name","version")
);
