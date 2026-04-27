// ============================================================
// DISSENSUS AI — Debate Export (JSON + PDF)
// ============================================================

const PDFDocument = require('pdfkit');

function formatDebateJSON(debate) {
    const structured = {
        metadata: {
            id: debate.id,
            topic: debate.topic,
            provider: debate.provider,
            model: debate.model,
            agentModels: debate.agentModels || null,
            timestamp: debate.timestamp,
            permalink: `https://app.dissensus.fun/?debate=${debate.id}`
        },
        agents: {
            cipher: { name: 'CIPHER', role: 'Skeptic / Red-Team Auditor' },
            nova: { name: 'NOVA', role: 'Advocate / Blue-Sky Thinker' },
            prism: { name: 'PRISM', role: 'Synthesizer / Neutral Analyst' }
        },
        phases: {
            phase1_analysis: {},
            phase2_arguments: {},
            phase3_cross_examination: {},
            phase4_verdict: {}
        },
        verdict: null
    };

    let currentAgent = null;
    let currentPhase = null;
    let agentText = {};

    for (const event of debate.phases) {
        if (event.type === 'phase-start') {
            currentPhase = event.phase;
            agentText = {};
        }
        if (event.type === 'agent-start') {
            currentAgent = event.agent;
            if (!agentText[currentAgent]) agentText[currentAgent] = '';
        }
        if (event.type === 'agent-chunk' && currentAgent) {
            agentText[currentAgent] = (agentText[currentAgent] || '') + (event.chunk || '');
        }
        if (event.type === 'agent-done' && currentPhase) {
            const phaseKey = `phase${currentPhase}_${['', 'analysis', 'arguments', 'cross_examination', 'verdict'][currentPhase]}`;
            if (structured.phases[phaseKey]) {
                structured.phases[phaseKey][event.agent] = (agentText[event.agent] || '').trim();
            }
        }
        if (event.type === 'debate-done') {
            structured.verdict = (event.verdict || '').trim();
        }
    }

    return structured;
}

function generateDebatePDF(debate) {
    const structured = formatDebateJSON(debate);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Title page
    doc.fontSize(24).font('Helvetica-Bold').text('DISSENSUS VERDICT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text(structured.metadata.topic, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666666')
       .text(`Generated: ${new Date(structured.metadata.timestamp).toLocaleString()}`, { align: 'center' });
    doc.text(`Provider: ${structured.metadata.provider} | Model: ${structured.metadata.model}`, { align: 'center' });
    doc.text(`Permalink: ${structured.metadata.permalink}`, { align: 'center' });
    doc.moveDown(2);

    // Agent profiles
    doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold').text('Debate Participants');
    doc.moveDown(0.5);
    const agents = [
        { id: 'cipher', name: 'CIPHER', role: 'Skeptic / Red-Team Auditor', color: '#ff3b3b' },
        { id: 'nova', name: 'NOVA', role: 'Advocate / Blue-Sky Thinker', color: '#00cc66' },
        { id: 'prism', name: 'PRISM', role: 'Synthesizer / Neutral Analyst', color: '#0099cc' }
    ];
    agents.forEach(a => {
        doc.fontSize(12).font('Helvetica-Bold').fillColor(a.color).text(a.name, { continued: true });
        doc.fillColor('#000000').font('Helvetica').text(` — ${a.role}`);
    });
    doc.moveDown(1);

    // Phase content
    const phaseNames = [
        { key: 'phase1_analysis', title: 'Phase 1: Independent Analysis' },
        { key: 'phase2_arguments', title: 'Phase 2: Opening Arguments' },
        { key: 'phase3_cross_examination', title: 'Phase 3: Cross-Examination' },
        { key: 'phase4_verdict', title: 'Phase 4: Final Verdict' }
    ];

    phaseNames.forEach(phase => {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text(phase.title);
        doc.moveDown(0.5);

        const phaseData = structured.phases[phase.key] || {};
        for (const [agentId, content] of Object.entries(phaseData)) {
            if (!content) continue;
            const agent = agents.find(a => a.id === agentId);
            doc.fontSize(12).font('Helvetica-Bold').fillColor(agent ? agent.color : '#000000')
               .text(agent ? agent.name : agentId.toUpperCase());
            doc.fontSize(10).font('Helvetica').fillColor('#333333').text(content);
            doc.moveDown(1);
        }
    });

    // Final verdict page
    if (structured.verdict) {
        doc.addPage();
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#000000').text('FINAL VERDICT', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(11).font('Helvetica').fillColor('#333333').text(structured.verdict);
    }

    return doc;
}

module.exports = { formatDebateJSON, generateDebatePDF };
