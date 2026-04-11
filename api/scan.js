export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { url, siteType } = req.body;
    const WAVE_KEY = process.env.WAVE_API_KEY;
    const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;

    try {
        // الخطوة 1: فحص الموقع تقنياً عبر WAVE
        const waveUrl = `https://wave.webaim.org/api/v1/?key=${WAVE_KEY}&url=${encodeURIComponent(url)}`;
        const waveResponse = await fetch(waveUrl);
        const waveData = await waveResponse.json();

        if (!waveData.categories) throw new Error("WAVE API Error");

        // الخطوة 2: صياغة "برومبت" احترافي لـ Claude
        const prompt = `You are a Senior ADA Compliance Expert. Analyze these results for ${url} (${siteType}):
        - Errors: ${waveData.categories.error.count}
        - Contrast Issues: ${waveData.categories.contrast.count}
        - Alerts: ${waveData.categories.alert.count}
        
        Provide a professional report in JSON format with:
        1. "risk_level": (High/Medium/Low)
        2. "summary": (Short executive summary)
        3. "top_issues": (Array of 3 specific technical fixes)
        4. "legal_impact": (One sentence about potential lawsuits)`;

        // الخطوة 3: إرسال البيانات لـ Claude
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1000,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const claudeData = await claudeResponse.json();
        const report = JSON.parse(claudeData.content[0].text);

        res.status(200).json(report);

    } catch (error) {
        res.status(500).json({ error: "Failed to analyze site" });
    }
}
