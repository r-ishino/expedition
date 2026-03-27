import { Hono } from 'hono';
import type { QuestAttachmentType } from '@expedition/shared';
import { findQuestById } from '~/repos/quests.repo';
import {
  insertAttachment,
  deleteAttachment,
} from '~/repos/quest-attachments.repo';

const app = new Hono();

// POST /api/quests/:id/attachments — 添付追加
app.post('/:id/attachments', async (c) => {
  const id = c.req.param('id');
  const quest = await findQuestById(id);
  if (!quest) {
    return c.json({ error: 'quest not found' }, 404);
  }

  const body = await c.req.json<{
    type: QuestAttachmentType;
    name: string;
    path: string;
  }>();

  if (!body.type || !body.name || !body.path) {
    return c.json({ error: 'type, name, and path are required' }, 400);
  }

  const attachment = await insertAttachment({
    questId: id,
    type: body.type,
    name: body.name,
    path: body.path,
  });
  return c.json(attachment, 201);
});

// DELETE /api/quests/:questId/attachments/:attachmentId — 添付削除
app.delete('/:questId/attachments/:attachmentId', async (c) => {
  const { attachmentId } = c.req.param();
  const deleted = await deleteAttachment(attachmentId);
  if (!deleted) {
    return c.json({ error: 'attachment not found' }, 404);
  }
  return c.json({ ok: true });
});

export { app };
