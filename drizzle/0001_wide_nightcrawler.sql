ALTER TABLE "media" ADD COLUMN "source_path" text;--> statement-breakpoint
CREATE UNIQUE INDEX "media_source_path_idx" ON "media" USING btree ("source_path");