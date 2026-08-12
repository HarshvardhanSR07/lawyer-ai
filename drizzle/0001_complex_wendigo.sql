CREATE TABLE `case_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`documentName` varchar(255) NOT NULL,
	`documentType` varchar(64),
	`storageKey` varchar(512) NOT NULL,
	`pageCount` int,
	`indexedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `case_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `case_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`status` enum('active','paused','completed') NOT NULL DEFAULT 'active',
	`transcript` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `case_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `case_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`caseId` varchar(64) NOT NULL,
	`caseName` varchar(255) NOT NULL,
	`caseType` varchar(128),
	`status` enum('active','archived','completed') NOT NULL DEFAULT 'active',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `cases_caseId_unique` UNIQUE(`caseId`)
);
--> statement-breakpoint
CREATE TABLE `session_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`speaker` enum('user','lawyerai') NOT NULL,
	`text` text NOT NULL,
	`legalSources` json,
	`evidenceSources` json,
	`confidence` enum('high','medium','low'),
	`verificationStatus` enum('approved','flagged'),
	`reasoningSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `session_messages_id` PRIMARY KEY(`id`)
);
