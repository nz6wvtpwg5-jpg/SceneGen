const express = require('express');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = new Set(['todo', 'in_progress', 'blocked', 'done']);
const cleanText = (value, maximum) => value == null || value === '' ? null : String(value).trim().slice(0, maximum);
const validDate = (value) => {
  if (value == null || value === '') return true;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() === Number(match[2]) - 1
    && date.getUTCDate() === Number(match[3]);
};
const canEdit = (req) => !req.isExternalDaySheetCollaborator || ['advance', 'full'].includes(req.daySheetPermissions?.editScope);

function createShowAdvanceRouter(pool) {
  const router = express.Router();

  router.use('/shows/:id/advance', (req, res, next) => {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: { message: 'Invalid show ID' } });
    next();
  });

  router.get('/shows/:id/advance', async (req, res) => {
    const result = await pool.query(`SELECT task.id, task.title, task.status, task.assignee, task.due_date,
        task.notes, task.sort_order, task.completed_at, task.updated_at
      FROM show_advance_tasks task JOIN shows show_record ON show_record.id = task.show_id
      WHERE task.show_id=$1::uuid AND show_record.entity_id::text=$2::text
      ORDER BY task.sort_order, task.created_at`, [req.params.id, req.entityId]);
    const done = result.rows.filter((item) => item.status === 'done').length;
    res.json({ tasks: result.rows, summary: { done, total: result.rowCount, percentage: result.rowCount ? Math.round(done * 100 / result.rowCount) : 0 } });
  });

  router.post('/shows/:id/advance', async (req, res) => {
    if (!canEdit(req)) return res.status(403).json({ error: { message: 'This invitation cannot edit advancing tasks' } });
    const title = cleanText(req.body.title, 160);
    if (!title) return res.status(422).json({ error: { message: 'Task title is required' } });
    if (!validDate(req.body.dueDate)) return res.status(422).json({ error: { message: 'Enter a valid due date' } });
    try {
      const result = await pool.query(`INSERT INTO show_advance_tasks (entity_id, show_id, title, assignee, due_date, notes, sort_order)
        SELECT show_record.entity_id, show_record.id, $3, $4, $5::date, $6,
          COALESCE((SELECT max(sort_order)+10 FROM show_advance_tasks WHERE show_id=show_record.id),10)
        FROM shows show_record WHERE show_record.id=$2::uuid AND show_record.entity_id::text=$1::text RETURNING *`,
      [req.entityId, req.params.id, title, cleanText(req.body.assignee, 120), req.body.dueDate || null, cleanText(req.body.notes, 2000)]);
      if (!result.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
      res.status(201).json({ task: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ error: { message: 'That task already exists for this show' } });
      throw error;
    }
  });

  router.patch('/shows/:id/advance/:taskId', async (req, res) => {
    if (!UUID.test(req.params.taskId)) return res.status(400).json({ error: { message: 'Invalid checklist record' } });
    if (!canEdit(req)) return res.status(403).json({ error: { message: 'This invitation cannot edit advancing tasks' } });
    const status = req.body.status;
    const title = req.body.title === undefined ? null : cleanText(req.body.title, 160);
    if (req.body.title !== undefined && !title) return res.status(422).json({ error: { message: 'Task title is required' } });
    if (status !== undefined && !STATUSES.has(status)) return res.status(422).json({ error: { message: 'Invalid task status' } });
    if (!validDate(req.body.dueDate)) return res.status(422).json({ error: { message: 'Enter a valid due date' } });
    const result = await pool.query(`UPDATE show_advance_tasks task SET
        title=CASE WHEN $4::boolean THEN $5 ELSE task.title END,
        status=CASE WHEN $6::boolean THEN $7 ELSE task.status END,
        assignee=CASE WHEN $8::boolean THEN $9 ELSE task.assignee END,
        due_date=CASE WHEN $10::boolean THEN $11::date ELSE task.due_date END,
        notes=CASE WHEN $12::boolean THEN $13 ELSE task.notes END,
        completed_at=CASE WHEN $6::boolean AND $7='done' AND task.status<>'done' THEN NOW()
          WHEN $6::boolean AND $7<>'done' THEN NULL ELSE task.completed_at END,
        completed_by=CASE WHEN $6::boolean AND $7='done' THEN $14::uuid
          WHEN $6::boolean AND $7<>'done' THEN NULL ELSE task.completed_by END,
        updated_at=NOW()
      FROM shows show_record
      WHERE task.id=$3::uuid AND task.show_id=$2::uuid AND show_record.id=task.show_id
        AND show_record.entity_id::text=$1::text RETURNING task.*`,
    [req.entityId, req.params.id, req.params.taskId,
      req.body.title !== undefined, title,
      status !== undefined, status || null,
      req.body.assignee !== undefined, cleanText(req.body.assignee, 120),
      req.body.dueDate !== undefined, req.body.dueDate || null,
      req.body.notes !== undefined, cleanText(req.body.notes, 2000), req.userId]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Advancing task not found' } });
    res.json({ task: result.rows[0] });
  });

  router.delete('/shows/:id/advance/:taskId', async (req, res) => {
    if (!UUID.test(req.params.taskId)) return res.status(400).json({ error: { message: 'Invalid checklist record' } });
    if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { message: 'Administrator access is required' } });
    const result = await pool.query(`DELETE FROM show_advance_tasks task USING shows show_record
      WHERE task.id=$1::uuid AND task.show_id=$2::uuid AND show_record.id=task.show_id
        AND show_record.entity_id::text=$3::text RETURNING task.id`, [req.params.taskId, req.params.id, req.entityId]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Advancing task not found' } });
    res.status(204).send();
  });

  return router;
}

module.exports = { createShowAdvanceRouter };
