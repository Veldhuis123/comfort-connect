const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;

// GET /api/analytics/visitors — admin only
router.get('/visitors', authMiddleware, adminMiddleware, async (req, res) => {
  if (!CF_API_TOKEN || !CF_ZONE_ID) {
    return res.status(503).json({ error: 'Cloudflare API niet geconfigureerd' });
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const today = now.toISOString().split('T')[0];
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    const query = `
      query {
        viewer {
          zones(filter: { zoneTag: "${CF_ZONE_ID}" }) {
            httpRequests1dGroups(
              limit: 31
              filter: { date_geq: "${startDate}", date_leq: "${today}" }
              orderBy: [date_ASC]
            ) {
              dimensions { date }
              sum { requests pageViews }
              uniq { uniques }
            }
          }
        }
      }
    `;

    const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Cloudflare API error:', response.status, text);
      return res.status(502).json({ error: 'Cloudflare API fout' });
    }

    const data = await response.json();

    if (data.errors && data.errors.length > 0) {
      console.error('Cloudflare GraphQL errors:', data.errors);
      return res.status(502).json({ error: 'Cloudflare query fout' });
    }

    const groups = data.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];

    // Build daily data
    const daily = groups.map(g => ({
      date: new Date(g.dimensions.date).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' }),
      rawDate: g.dimensions.date,
      views: g.sum.pageViews || 0,
      visitors: g.uniq.uniques || 0,
      requests: g.sum.requests || 0,
    }));

    // Calculate totals
    const todayData = daily.find(d => d.rawDate === today);
    const totalViews = daily.reduce((s, d) => s + d.views, 0);
    const totalVisitors = daily.reduce((s, d) => s + d.visitors, 0);

    // This week (last 7 days)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekStart = sevenDaysAgo.toISOString().split('T')[0];
    const thisWeekViews = daily
      .filter(d => d.rawDate >= weekStart)
      .reduce((s, d) => s + d.views, 0);

    res.json({
      total: totalViews,
      totalVisitors,
      today: todayData?.views || 0,
      todayVisitors: todayData?.visitors || 0,
      thisWeek: thisWeekViews,
      thisMonth: totalViews,
      daily: daily.map(({ rawDate, ...rest }) => rest),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Kon analytics niet ophalen' });
  }
});

module.exports = router;
