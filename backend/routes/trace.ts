import express, { Request, Response } from 'express';
import store from '../db';

const router = express.Router();

// 公开溯源接口 - 消费者扫码访问，无需登录
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const batch = await store.getBatchByIdPublic(id);
    if (!batch) {
      return res.status(404).json({ success: false, message: '未找到该产品信息，请确认二维码是否正确' });
    }

    const products = await store.getProducts(batch.tenant_id);
    const pt = products.find(p => p.id === batch.product_type_id);
    const events = (await store.getEventsByBatchPublic(id)).map(e => ({
      event_type: e.event_type, description: e.description, occurred_at: e.occurred_at
    }));

    const now = Math.floor(Date.now() / 1000);
    const isExpired = batch.expire_at ? batch.expire_at < now : false;
    const remainingSeconds = batch.expire_at ? Math.max(0, batch.expire_at - now) : null;

    res.json({
      success: true,
      data: {
        id: batch.id,
        product_name: batch.product_name,
        operator: batch.operator,
        weight: batch.weight,
        spec: batch.spec,
        notes: batch.notes,
        status: batch.status,
        started_at: batch.started_at,
        ended_at: batch.ended_at,
        production_time: batch.production_time,
        expire_at: batch.expire_at,
        is_expired: isExpired,
        remaining_seconds: remainingSeconds,
        video_url: batch.video_url,
        latitude: batch.latitude,
        longitude: batch.longitude,
        location_name: batch.location_name,
        product_type_name: pt ? pt.name : null,
        events,
        created_at: batch.created_at
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
