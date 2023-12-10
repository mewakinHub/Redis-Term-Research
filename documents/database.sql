CREATE DATABASE IF NOT EXISTS redisresearch;

USE redisresearch;

CREATE TABLE `images` (
  `id` int(11) NOT NULL,
  `album` int(11) NOT NULL,
  `image` longblob NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

ALTER TABLE `images`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;
COMMIT;
