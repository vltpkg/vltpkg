CREATE TABLE "packages" (
	"name" text NOT NULL,
	"packument" text NOT NULL,
	"headers" json NOT NULL,
	"updated_at" bigint NOT NULL,
	"origin" text NOT NULL,
	CONSTRAINT "packages_name_origin_pk" PRIMARY KEY("name","origin")
);
--> statement-breakpoint
CREATE TABLE "tarballs" (
	"name" text NOT NULL,
	"version" text NOT NULL,
	"headers" json NOT NULL,
	"updated_at" bigint NOT NULL,
	"origin" text NOT NULL,
	CONSTRAINT "tarballs_name_version_origin_pk" PRIMARY KEY("name","version","origin")
);
--> statement-breakpoint
CREATE TABLE "versions" (
	"name" text NOT NULL,
	"version" text NOT NULL,
	"manifest" text NOT NULL,
	"headers" json NOT NULL,
	"updated_at" bigint NOT NULL,
	"origin" text NOT NULL,
	CONSTRAINT "versions_name_version_origin_pk" PRIMARY KEY("name","version","origin")
);
