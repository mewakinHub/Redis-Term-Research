UPDATE images SET album = 1 WHERE id = 1;

UPDATE images SET album = 2 WHERE id = 1;

UPDATE images SET album = 1 WHERE id = 3;

UPDATE images SET album = 2 WHERE id = 3;

UPDATE images SET album = 1 WHERE id = 1 OR id = 3;

UPDATE images SET album = 2 WHERE id = 1 OR id = 3;