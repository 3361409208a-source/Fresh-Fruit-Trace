-- 鲜切水果追溯系统 - MySQL数据库初始化脚本
-- 多租户: 共享数据库 + enterprise_id 字段隔离

CREATE DATABASE IF NOT EXISTS fruit_trace
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fruit_trace;

-- 企业表
CREATE TABLE IF NOT EXISTS enterprises (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL COMMENT '企业名称',
  code            VARCHAR(50)  NOT NULL UNIQUE COMMENT '企业编码',
  contact_person  VARCHAR(50)  DEFAULT NULL,
  contact_phone   VARCHAR(30)  DEFAULT NULL,
  address         VARCHAR(255) DEFAULT NULL,
  license_no      VARCHAR(50)  DEFAULT NULL,
  logo_url        VARCHAR(500) DEFAULT NULL,
  status          TINYINT      NOT NULL DEFAULT 1 COMMENT '1启用 0禁用',
  created_at      INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at      INT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_code (code),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  enterprise_id   INT UNSIGNED NOT NULL,
  username        VARCHAR(50)  NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  real_name       VARCHAR(50)  DEFAULT NULL,
  phone           VARCHAR(30)  DEFAULT NULL,
  role            VARCHAR(20)  NOT NULL DEFAULT 'operator' COMMENT 'super_admin/admin/manager/operator',
  status          TINYINT      NOT NULL DEFAULT 1 COMMENT '1启用 0禁用',
  last_login_at   INT UNSIGNED DEFAULT NULL,
  created_at      INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at      INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uk_ent_user (enterprise_id, username),
  INDEX idx_enterprise (enterprise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 产品类型表
CREATE TABLE IF NOT EXISTS products (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  enterprise_id       INT UNSIGNED   NOT NULL,
  name                VARCHAR(100)   NOT NULL,
  default_shelf_hours INT UNSIGNED   NOT NULL DEFAULT 24,
  created_at          INT UNSIGNED   NOT NULL DEFAULT 0,
  INDEX idx_ent_product (enterprise_id),
  UNIQUE KEY uk_ent_product_name (enterprise_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 批次表
CREATE TABLE IF NOT EXISTS batches (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  enterprise_id   INT UNSIGNED  NOT NULL,
  product_name    VARCHAR(100)  NOT NULL,
  product_type_id INT UNSIGNED  DEFAULT NULL,
  operator        VARCHAR(50)   NOT NULL,
  weight          DECIMAL(10,2) DEFAULT NULL,
  spec            VARCHAR(200)  DEFAULT '',
  notes           TEXT          DEFAULT NULL,
  status          VARCHAR(20)   NOT NULL DEFAULT 'preparing',
  started_at      INT UNSIGNED  NOT NULL DEFAULT 0,
  ended_at        INT UNSIGNED  DEFAULT NULL,
  production_time INT UNSIGNED  DEFAULT NULL,
  expire_at       INT UNSIGNED  DEFAULT NULL,
  video_path      VARCHAR(500)  DEFAULT NULL,
  video_url       VARCHAR(500)  DEFAULT NULL,
  latitude        DECIMAL(10,7) DEFAULT NULL,
  longitude       DECIMAL(10,7) DEFAULT NULL,
  location_name   VARCHAR(200)  DEFAULT NULL,
  created_at      INT UNSIGNED  NOT NULL DEFAULT 0,
  INDEX idx_ent_batch (enterprise_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 溯源事件表
CREATE TABLE IF NOT EXISTS trace_events (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id        CHAR(36)      NOT NULL,
  enterprise_id   INT UNSIGNED  NOT NULL,
  event_type      VARCHAR(50)   NOT NULL,
  description     VARCHAR(500)  NOT NULL,
  occurred_at     INT UNSIGNED  NOT NULL DEFAULT 0,
  INDEX idx_batch (batch_id),
  INDEX idx_ent_event (enterprise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 默认超级管理员企业 & 用户 (密码: admin123)
INSERT IGNORE INTO enterprises (id, name, code, status, created_at, updated_at)
VALUES (1, '系统管理', 'SYSTEM', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

INSERT IGNORE INTO users (enterprise_id, username, password_hash, real_name, role, status, created_at, updated_at)
VALUES (1, 'admin', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Kz7aKdBdCkqy5LX1V9uGG', '系统管理员', 'super_admin', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());
