CREATE DATABASE IF NOT EXISTS redisresearch;

USE redisresearch;

CREATE TABLE `images` (
  `id` int(11) NOT NULL,
  `album` int(11) NOT NULL,
  `value` int(11) NOT NULL,
  `image` longblob NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `metadata_column` (
  `redisKey` varchar(255) NOT NULL,
  `columnName` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `metadata_columnconditions` (
  `redisKey` varchar(255) NOT NULL,
  `columnName` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `metadata_query` (
  `redisKey` varchar(255) NOT NULL,
  `query` varchar(510) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `metadata_row` (
  `redisKey` varchar(255) NOT NULL,
  `row` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `metadata_roworder` (
  `redisKey` varchar(255) NOT NULL,
  `rowOrder` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

ALTER TABLE `images`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

ALTER TABLE `metadata_column`
  ADD PRIMARY KEY (`redisKey`,`columnName`);

ALTER TABLE `metadata_columnconditions`
  ADD PRIMARY KEY (`redisKey`,`columnName`);

ALTER TABLE `metadata_query`
  ADD PRIMARY KEY (`redisKey`);

ALTER TABLE `metadata_row`
  ADD PRIMARY KEY (`redisKey`,`row`),
  ADD KEY `row` (`row`);

ALTER TABLE `metadata_roworder`
  ADD PRIMARY KEY (`redisKey`);

ALTER TABLE `metadata_column`
  ADD CONSTRAINT `metadata_column_ibfk_1` FOREIGN KEY (`redisKey`) REFERENCES `metadata_query` (`redisKey`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `metadata_columnconditions`
  ADD CONSTRAINT `metadata_columnconditions_ibfk_1` FOREIGN KEY (`redisKey`) REFERENCES `metadata_query` (`redisKey`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `metadata_row`
  ADD CONSTRAINT `metadata_row_ibfk_1` FOREIGN KEY (`row`) REFERENCES `images` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `metadata_row_ibfk_2` FOREIGN KEY (`redisKey`) REFERENCES `metadata_query` (`redisKey`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `metadata_roworder`
  ADD CONSTRAINT `metadata_roworder_ibfk_1` FOREIGN KEY (`redisKey`) REFERENCES `metadata_query` (`redisKey`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;