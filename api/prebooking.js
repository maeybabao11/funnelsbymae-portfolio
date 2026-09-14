const CRM_PREBOOKING_URL =
  process.env.CRM_PREBOOKING_URL || 'https://funnelsbymae-crm.up.railway.app/api/prebooking';

/**
 * Proxies the marketing site's "Book a Discovery Call" form to the CRM's
 * /api/prebooking endpoint. Exists only because that endpoint requires an
 * x-api-key that can't be shipped to the browser — this function holds the
 * key server-side (CRM_INGEST_API_KEY) and forwards the request, renaming
 * fields to match what savePreBooking() in the CRM actually expects.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.CRM_INGEST_API_KEY;
  if (!apiKey) {
    console.error('CRM_INGEST_API_KEY is not configured');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const body = req.body || {};

  const payload = {
    fullName: body.fullName,
    email: body.email,
    phone: body.phone,
    businessType: body.businessType,
    currentSetup: body.currentTools,
    topProblem: body.topProblem,
    priorExperience: body.pastAgencyExperience,
    reasonNow: body.reasonNow,
    audienceRange: body.volumeRange
  };

  try {
    const crmRes = await fetch(CRM_PREBOOKING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await crmRes.json().catch(() => ({}));

    if (!crmRes.ok) {
      console.error('CRM prebooking rejected', crmRes.status, data);
      return res.status(502).json({ error: 'CRM rejected submission' });
    }

    return res.status(200).json({ ok: true, ...data });
  } catch (err) {
    console.error('prebooking proxy failed', err);
    return res.status(500).json({ error: 'Failed to reach CRM' });
  }
};
