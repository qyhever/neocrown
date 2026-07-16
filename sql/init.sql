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
  `avatar` varchar(255) NOT NULL COMMENT '头像URL',
  `isEnabled` tinyint NOT NULL DEFAULT '1' COMMENT '启用/禁用',
  `isSystemDefault` tinyint NOT NULL DEFAULT '0' COMMENT '系统默认',
  `email` varchar(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
