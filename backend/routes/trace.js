const express = require('express');
const router = express.Router();
const store = require('../db');

// 公开溯源接口 - 消费者扫码访问，无需登录
router.get('/:id', (req, res) => {
  try {
    const batch = store.getBatchById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: '未找到该产品信息，请确认二维码是否正确' });
    }

    const products = store.getProducts();
    const pt = products.find(p => p.id === batch.product_type_id);
    const events = store.getEventsByBatch(req.params.id).map(e => ({
      event_type: e.event_type, description: e.description, occurred_at: e.occurred_at
    }));

    const now = Math.floor(Date.now() / 1000);
    const isExpired = batch.expire_at && batch.expire_at < now;
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
        product_type_name: pt ? pt.name : null,
        events,
        created_at: batch.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
