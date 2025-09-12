-- Run these commands in MySQL as root user
CREATE DATABASE IF NOT EXISTS dibnow_DibNow;
CREATE USER IF NOT EXISTS 'dibnow_dibnow'@'localhost' IDENTIFIED BY '6,a4t)9E[eZ8';
GRANT ALL PRIVILEGES ON dibnow_DibNow.* TO 'dibnow_dibnow'@'localhost';
FLUSH PRIVILEGES;