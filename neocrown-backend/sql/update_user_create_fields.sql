ALTER TABLE `user`
  MODIFY COLUMN `avatar` varchar(255) NULL COMMENT '头像URL',
  MODIFY COLUMN `email` varchar(255) NOT NULL;
