const express = require('express');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOUR_HEALTH_SQL = `SELECT show_record.id,show_record.date,show_record.status,
    show_record.venue_name,show_record.city,show_record.country,
    COALESCE(task_stats.task_total,0)::int AS task_total,
    COALESCE(task_stats.task_done,0)::int AS task_done,
    COALESCE(task_stats.outstanding,'[]'::jsonb) AS outstanding,
    ((SELECT count(*) FROM day_sheet_changes change_record
        WHERE change_record.show_id=show_record.id AND change_record.entity_id::text=$2::text
          AND change_record.status='applied'
          AND COALESCE(change_record.reviewed_at,change_record.created_at)>=NOW()-INTERVAL '7 days')
     +(SELECT count(*) FROM show_notices notice
        WHERE notice.entity_id::text=$2::text AND notice.archived_at IS NULL
          AND (notice.expires_at IS NULL OR notice.expires_at>NOW())
          AND notice.created_at>=NOW()-INTERVAL '7 days'
          AND (notice.show_id=show_record.id OR notice.tour_id=show_record.tour_id)))::int AS recent_updates
  FROM shows show_record
  LEFT JOIN LATERAL (
    SELECT count(task.id)::int AS task_total,
      count(task.id) FILTER (WHERE task.status='done')::int AS task_done,
      jsonb_agg(jsonb_build_object(
        'id',task.id,'title',task.title,'status',task.status,'assignee',task.assignee,
        'dueDate',task.due_date,
        'overdue',(task.due_date IS NOT NULL AND task.due_date<CURRENT_DATE AND task.status<>'done')
      ) ORDER BY task.sort_order,task.created_at)
        FILTER (WHERE task.status<>'done') AS outstanding
    FROM show_advance_tasks task
    WHERE task.show_id=show_record.id AND task.entity_id::text=show_record.entity_id::text
  ) task_stats ON TRUE
  WHERE show_record.tour_id=$1::uuid AND show_record.entity_id::text=$2::text
  ORDER BY show_record.date,show_record.start_time NULLS LAST,show_record.id`;

function taskPriority(task) {
  if (task.status === 'blocked') return 0;
  if (task.overdue) return 1;
  if (task.status === 'in_progress') return 2;
  return 3;
}

function createTourHealthRouter(pool) {
  const router = express.Router();

  router.get('/tours/:id/health', async (req, res) => {
    if (!UUID.test(req.params.id)) {
      return res.status(400).json({ error: { message: 'Invalid tour ID' } });
    }

    try {
      const tourResult = await pool.query(
        'SELECT id,name FROM tours WHERE id=$1::uuid AND entity_id::text=$2::text',
        [req.params.id, req.entityId],
      );
      if (!tourResult.rowCount) return res.status(404).json({ error: { message: 'Tour not found' } });

      const result = await pool.query(TOUR_HEALTH_SQL, [req.params.id, req.entityId]);

      const shows = result.rows.map((row) => {
        const total = Number(row.task_total) || 0;
        const done = Number(row.task_done) || 0;
        const outstanding = Array.isArray(row.outstanding)
          ? row.outstanding.sort((left, right) => taskPriority(left) - taskPriority(right))
          : [];
        return {
          id: row.id,
          date: row.date,
          status: row.status,
          venueName: row.venue_name || null,
          city: row.city || null,
          country: row.country || null,
          readiness: total ? Math.round(done * 100 / total) : 0,
          tasks: { done, total, outstanding },
          recentUpdates: Number(row.recent_updates) || 0,
        };
      });
      const active = shows.filter((show) => show.status !== 'cancelled');
      const roadReady = active.filter((show) => show.readiness === 100).length;

      res.json({
        tour: { id: tourResult.rows[0].id, name: tourResult.rows[0].name },
        generatedAt: new Date().toISOString(),
        windowDays: 7,
        summary: {
          activeDates: active.length,
          cancelledDates: shows.length - active.length,
          roadReady,
          needAttention: active.length - roadReady,
          datesWithUpdates: active.filter((show) => show.recentUpdates > 0).length,
        },
        shows,
      });
    } catch (error) {
      console.error('Unable to calculate tour health:', error);
      res.status(500).json({ error: { message: 'Unable to calculate tour health' } });
    }
  });

  return router;
}

module.exports = { createTourHealthRouter, taskPriority, TOUR_HEALTH_SQL };
