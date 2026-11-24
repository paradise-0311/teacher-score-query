CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`max_score` real NOT NULL,
	`scope` text NOT NULL,
	`provisional` integer NOT NULL,
	`publication` text NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`name` text NOT NULL,
	`lookup_name` text NOT NULL,
	`department` text NOT NULL,
	`subject` text NOT NULL,
	`venue` text NOT NULL,
	`status` text NOT NULL,
	`score` real,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `participant_exam_name` ON `participants` (`exam_id`,`lookup_name`);