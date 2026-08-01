DROP TABLE IF EXISTS `email_verification_code`;
DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier',
  `username` varchar(50) NOT NULL,
  `nickname` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL COMMENT 'Hashed password',
  `deletedAt` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  `avatar` varchar(255) DEFAULT NULL COMMENT '头像URL',
  `isEnabled` tinyint NOT NULL DEFAULT '1' COMMENT '启用/禁用',
  `isSystemDefault` tinyint NOT NULL DEFAULT '0' COMMENT '系统默认',
  `email` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_username` (`username`),
  UNIQUE KEY `uk_user_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

CREATE TABLE `email_verification_code` (
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier',
  `deletedAt` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  `email` varchar(255) NOT NULL,
  `purpose` varchar(32) NOT NULL,
  `codeHash` char(64) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `sentAt` timestamp NOT NULL,
  `consumedAt` timestamp NULL DEFAULT NULL,
  `failedAttempts` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email_verification_code_email_purpose` (`email`,`purpose`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `project` (
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int NULL DEFAULT NULL COMMENT '创建人用户ID',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updatedBy` int NULL DEFAULT NULL COMMENT '更新人用户ID',
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier',
  `description` varchar(500) NULL DEFAULT NULL COMMENT '项目描述',
  `deletedAt` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  `effectiveTimeStart` timestamp NULL DEFAULT NULL COMMENT '生效开始时间',
  `effectiveTimeEnd` timestamp NULL DEFAULT NULL COMMENT '生效结束时间',
  `name` varchar(100) NOT NULL DEFAULT '' COMMENT '项目名称',
  `type` char(1) NOT NULL COMMENT '项目类型：1 社招，2 校招',
  `isEnabled` tinyint NOT NULL DEFAULT '1' COMMENT '启用/禁用',
  `isSystemDefault` tinyint NOT NULL DEFAULT '0' COMMENT '系统默认',
  PRIMARY KEY (`id`),
  KEY `idx_project_type` (`type`),
  KEY `idx_project_deleted_at` (`deletedAt`),
  KEY `idx_project_effective_time` (`effectiveTimeStart`,`effectiveTimeEnd`),
  CONSTRAINT `chk_project_type` CHECK (`type` IN ('1', '2'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
