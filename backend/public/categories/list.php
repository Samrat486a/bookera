<?php
declare(strict_types=1);
require __DIR__ . '/../_init.php';

/** GET /api/categories/list.php — active categories with their number of published books. */
allow_methods('GET');

$rows = db()->query(
    "SELECT c.slug, c.name, c.description, c.tone,
            (SELECT COUNT(*) FROM books b WHERE b.category_id = c.id AND b.status = 'published' AND b.deleted_at IS NULL) AS book_count
       FROM categories c WHERE c.is_active = 1 ORDER BY c.sort_order, c.name"
)->fetchAll();

json_success('Categories', ['categories' => array_map(fn ($c) => [
    'slug'        => $c['slug'],
    'name'        => $c['name'],
    'description' => $c['description'] ?? '',
    'tone'        => $c['tone'],
    'bookCount'   => (int) $c['book_count'],
], $rows)]);
