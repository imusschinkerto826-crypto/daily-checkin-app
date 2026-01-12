ALTER TABLE `users` ADD `reminder_enabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `reminder_email` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `reminder_hour` int DEFAULT 8;