<?php
declare(strict_types=1);
require __DIR__ . '/../_init.php';

/** GET /api/authors/list.php — authors and how many published books each has. */
allow_methods('GET');

$rows = db()->query(
    "SELECT a.slug, a.name, a.specialization, a.bio, a.city, a.tone,
            (SELECT COUNT(*) FROM books b WHERE b.author_id = a.id AND b.status = 'published' AND b.deleted_at IS NULL) AS book_count
       FROM authors a ORDER BY a.name"
)->fetchAll();

json_success('Authors', ['authors' => array_map(fn ($a) => [
    'id'             => $a['slug'],
    'name'           => $a['name'],
    'specialization' => $a['specialization'] ?? '',
    'bio'            => $a['bio'] ?? '',
    'city'           => $a['city'] ?? '',
    'tone'           => $a['tone'],
    'books'          => (int) $a['book_count'],
], $rows)]);
