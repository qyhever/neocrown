-- 将旧的布尔软删除标记迁移为 TypeORM DeleteDateColumn 使用的删除时间。
-- 本脚本为一次性数据库升级脚本，请在执行前备份数据库。

ALTER TABLE `user`
  ADD COLUMN `deletedAt` timestamp NULL DEFAULT NULL COMMENT '删除时间'
  AFTER `password`;

-- 旧表没有记录实际删除时间，使用最后更新时间作为已有删除数据的近似删除时间。
UPDATE `user`
SET `deletedAt` = COALESCE(`updatedAt`, CURRENT_TIMESTAMP)
WHERE `isDeleted` <> 0;

ALTER TABLE `user`
  DROP COLUMN `isDeleted`;
