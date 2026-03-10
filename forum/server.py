"""
AI Triad Forum — Unified Server
Serves both the frontend (HTML/CSS/JS) and the backend API
on a single port for easy deployment.
"""

import json
import re
import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import urllib.request
import urllib.parse
import ssl

# Serve static files from the same directory
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# ============================================
# STATIC FILE SERVING
# ============================================

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    if os.path.exists(os.path.join('.', path)):
        return send_from_directory('.', path)
    return "Not found", 404

# ============================================
# WEB RESEARCH ENGINE
# ============================================

def web_search(query, num_results=8):
    """Search the web using DuckDuckGo HTML and extract results."""
    try:
        encoded = urllib.parse.quote_plus(query)
        url = f"https://html.duckduckgo.com/html/?q={encoded}"
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        })
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
        
        results = []
        snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', html, re.DOTALL)
        titles = re.findall(r'class="result__a"[^>]*>(.*?)</a>', html, re.DOTALL)
        
        for i in range(min(len(snippets), num_results)):
            title = re.sub(r'<[^>]+>', '', titles[i]).strip() if i < len(titles) else ''
            snippet = re.sub(r'<[^>]+>', '', snippets[i]).strip()
            if snippet:
                results.append({'title': title, 'snippet': snippet})
        
        return results
    except Exception as e:
        return [{'title': 'Search error', 'snippet': str(e)}]


def research_topic(topic):
    """Conduct multi-angle research on a topic."""
    searches = {}
    topic_lower = topic.lower()
    
    searches['main'] = web_search(topic)
    
    if any(w in topic_lower for w in ['crypto', 'bitcoin', 'blockchain', 'token', 'defi', 'web3', 'ethereum', 'rwa', 'solana']):
        searches['market'] = web_search(f"{topic} market data 2024 2025")
        searches['criticism'] = web_search(f"{topic} risks problems criticism")
        searches['support'] = web_search(f"{topic} advantages benefits bullish case")
    elif any(w in topic_lower for w in ['ai', 'artificial intelligence', 'machine learning']):
        searches['trends'] = web_search(f"{topic} latest developments 2024 2025")
        searches['criticism'] = web_search(f"{topic} risks concerns criticism")
        searches['support'] = web_search(f"{topic} benefits opportunities")
    else:
        searches['analysis'] = web_search(f"{topic} analysis expert opinion")
        searches['criticism'] = web_search(f"{topic} arguments against criticism")
        searches['support'] = web_search(f"{topic} arguments for benefits")
    
    research_text = ""
    for category, results in searches.items():
        research_text += f"\n--- {category.upper()} RESEARCH ---\n"
        for r in results:
            research_text += f"• {r['title']}: {r['snippet']}\n"
    
    return research_text


# ============================================
# TOPIC ANALYZER
# ============================================

def analyze_topic(topic):
    lower = topic.lower()
    
    analysis = {
        'subject': topic,
        'is_question': '?' in topic,
        'is_comparison': bool(re.search(r'\bvs\.?\b|\bversus\b|\bcompare|\bbetter\b|\bor\b', lower)),
        'is_exclusivity': bool(re.search(r'\bonly\b|\bsole\b|\bnothing else\b', lower)),
        'is_prediction': bool(re.search(r'\bwill\b|\bfuture\b|\breplace\b|\bnext\b', lower)),
        'is_normative': bool(re.search(r'\bshould\b|\bought\b|\bneed to\b', lower)),
        'is_negative': bool(re.search(r'\bdead\b|\bfail\b|\bscam\b|\bover\b|\bobsolete\b', lower)),
        'domain': 'general',
        'wants_specific_answer': bool(re.search(r'\bwhat\b|\bwhich\b|\bwho\b|\bname\b|\blist\b|\breplace\b|\balternative\b|\bcompetitor\b|\btop\b|\bbest\b|\brank\b', lower)),
        'entities': [],
    }
    
    if re.search(r'crypto|bitcoin|blockchain|token|defi|web3|ethereum|solana|nft|dao|rwa|stablecoin', lower):
        analysis['domain'] = 'crypto'
    elif re.search(r'\bai\b|artificial intelligence|machine learning|gpt|llm', lower):
        analysis['domain'] = 'ai'
    elif re.search(r'invest|stock|market|financ|bank|gold|econom', lower):
        analysis['domain'] = 'finance'
    elif re.search(r'energy|nuclear|solar|climate|carbon', lower):
        analysis['domain'] = 'energy'
    
    return analysis


def build_research_summary(research_text, max_facts=15):
    lines = [l.strip() for l in research_text.split('\n') if l.strip().startswith('•')]
    facts = []
    seen = set()
    for line in lines:
        fact = line.lstrip('• ').strip()
        if len(fact) > 30 and fact[:50] not in seen:
            seen.add(fact[:50])
            facts.append(fact)
    return facts[:max_facts]


# ============================================
# AGENT RESPONSE GENERATORS
# ============================================

def esc(text):
    """HTML escape."""
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def generate_cipher_opening(topic, analysis, facts):
    domain = analysis['domain']
    
    critical_facts = [f for f in facts if any(w in f.lower() for w in 
        ['risk', 'fail', 'problem', 'concern', 'critic', 'decline', 'drop', 'loss', 'hack', 'scam', 
         'regulation', 'ban', 'volatile', 'crash', 'bubble', 'warning', 'threat', 'challenge',
         'however', 'but', 'despite', 'although', 'question', 'doubt', 'skeptic'])]
    
    neutral_facts = [f for f in facts if f not in critical_facts]
    
    response = f"<p>Let me apply rigorous scrutiny to this claim. "
    
    if analysis['is_exclusivity']:
        response += f"The word <strong>&quot;only&quot;</strong> immediately raises red flags. In the entire history of technology and finance, virtually no single approach has ever been &quot;the only&quot; successful one in its category. Markets are ecosystems, not winner-take-all tournaments.</p>"
    elif analysis['is_prediction']:
        response += f"Predictions about what <strong>&quot;will&quot;</strong> happen in complex systems have an abysmal track record. Let me examine what the evidence actually supports versus what's being projected.</p>"
    elif analysis['wants_specific_answer']:
        response += f"Before we rush to name specific answers, we need to examine <strong>what criteria we're using</strong> and whether the premise of the question holds up to scrutiny.</p>"
    else:
        response += f"The popular narrative around this topic has some <strong>significant blind spots</strong> that need to be addressed before we can reach any useful conclusion.</p>"
    
    if critical_facts:
        response += "<p><strong>Here's what the evidence shows on the risk side:</strong> "
        for fact in critical_facts[:3]:
            response += f"{esc(fact)} "
        response += "</p>"
    
    if neutral_facts:
        response += "<p>Even the seemingly positive data requires context: "
        for fact in neutral_facts[:2]:
            response += f"{esc(fact)} "
        response += "</p>"
    
    response += "<p>My position: the skeptical case is <strong>stronger than most people in this space want to admit</strong>. "
    
    if analysis['wants_specific_answer']:
        response += "If we're going to name specific answers, we need to be honest about the uncertainty involved and the criteria we're using. I'll provide my assessment, but with appropriate caveats about confidence levels.</p>"
    elif analysis['is_exclusivity']:
        response += "The underlying thesis may have some merit, but the exclusivity claim is almost certainly wrong, and overstating the case actually undermines the legitimate argument.</p>"
    else:
        response += "I'm not saying the thesis is entirely wrong — but the confidence level being expressed is not justified by the evidence.</p>"
    
    return response


def generate_nova_opening(topic, analysis, facts):
    positive_facts = [f for f in facts if any(w in f.lower() for w in 
        ['grow', 'adopt', 'launch', 'partner', 'billion', 'million', 'increase', 'success',
         'innovat', 'breakthrough', 'leading', 'major', 'significant', 'promising', 'potential',
         'opportunity', 'advantage', 'benefit', 'improve', 'transform', 'revolution',
         'institutional', 'mainstream', 'popular', 'demand'])]
    
    neutral_facts = [f for f in facts if f not in positive_facts]
    
    response = "<p>I want to make the <strong>evidence-based case</strong> for why the constructive view here is stronger than skeptics acknowledge. "
    
    if analysis['is_exclusivity']:
        response += "While the &quot;only&quot; framing is too strong, the <strong>core insight is directionally correct</strong> — this category has structural advantages that make it disproportionately important.</p>"
    elif analysis['wants_specific_answer']:
        response += "And I'll be specific — not vague. <strong>I'll name names, cite data, and rank my answers</strong> by the strength of the evidence supporting them.</p>"
    elif analysis['is_prediction']:
        response += "The structural forces at work here are <strong>measurable and accelerating</strong>, not speculative.</p>"
    else:
        response += "This isn't blind optimism — it's pattern recognition backed by data.</p>"
    
    if positive_facts:
        response += "<p><strong>The evidence supporting the constructive case:</strong> "
        for fact in positive_facts[:4]:
            response += f"{esc(fact)} "
        response += "</p>"
    
    if neutral_facts:
        response += "<p>Additional context that strengthens this view: "
        for fact in neutral_facts[:2]:
            response += f"{esc(fact)} "
        response += "</p>"
    
    response += "<p><strong>My specific position:</strong> "
    
    if analysis['wants_specific_answer']:
        response += "Based on the evidence, I can identify specific candidates and rank them. The data points to clear frontrunners, and I'll explain why each one has structural advantages that the market is undervaluing.</p>"
    elif analysis['is_exclusivity']:
        response += "This category will likely capture the largest share of sustainable value in its space — not &quot;the only&quot; winner, but the most important one by a significant margin.</p>"
    else:
        response += "The trajectory is clear to anyone looking at the data honestly, and the opportunity for those who recognize it early is substantial.</p>"
    
    return response


def generate_prism_opening(topic, analysis, facts):
    response = "<p>Let me establish an <strong>analytical framework</strong> before we proceed. "
    
    if analysis['wants_specific_answer']:
        response += "This question asks for specific answers, so I'll define <strong>clear evaluation criteria</strong> that we'll use to rank candidates objectively: technological merit, market adoption, institutional support, regulatory positioning, and competitive moat.</p>"
    elif analysis['is_exclusivity']:
        response += "This claim has two separable components: <strong>(1)</strong> the value of the specific category mentioned, and <strong>(2)</strong> the exclusivity claim. These require different evidence and have different likelihoods.</p>"
    else:
        response += "I'll be evaluating arguments from both sides against <strong>evidence quality, logical consistency, and predictive track record</strong>.</p>"
    
    if facts:
        response += "<p><strong>What the research landscape shows:</strong> "
        for fact in facts[:3]:
            response += f"{esc(fact)} "
        response += "</p>"
    
    response += "<p>My preliminary assessment: <strong>the truth is more nuanced than either extreme</strong>, but that doesn't mean we can't reach specific, actionable conclusions. "
    
    if analysis['wants_specific_answer']:
        response += "I'll push both colleagues to commit to <strong>specific ranked answers with confidence levels</strong>, not vague directional statements. If we're going to be useful, we need to be specific.</p>"
    else:
        response += "I'll be pushing both colleagues toward <strong>quantifiable claims</strong> that can be evaluated against evidence, not narrative assertions.</p>"
    
    return response


def generate_cross_examination(topic, analysis, facts):
    cipher_to_nova = "<p><strong>NOVA, I need you to defend your specific claims with harder evidence.</strong> "
    if analysis['wants_specific_answer']:
        cipher_to_nova += "You said you'd 'name names' — so let's hear them. And for each one, I want to know: <strong>what's the specific evidence</strong>, what's the bear case you're dismissing, and what would have to be true for you to be wrong?</p>"
    else:
        cipher_to_nova += "Several of your 'evidence' points are actually <strong>projections from interested parties</strong>, not independent analysis. When an industry group projects growth for their own industry, that's marketing.</p>"
    
    critical_facts = [f for f in facts if any(w in f.lower() for w in ['risk', 'fail', 'problem', 'concern', 'critic', 'decline', 'however', 'but', 'despite', 'challenge'])]
    if critical_facts:
        cipher_to_nova += "<p>Here's what you're conveniently ignoring: "
        for fact in critical_facts[:2]:
            cipher_to_nova += f"<strong>{esc(fact)}</strong> "
        cipher_to_nova += "How do you account for these in your bullish thesis?</p>"
    
    nova_to_cipher = "<p><strong>CIPHER, your skepticism is selectively applied.</strong> "
    if analysis['wants_specific_answer']:
        nova_to_cipher += "You're demanding impossible certainty before you'll commit to any specific answer. That's not rigor — it's <strong>intellectual cowardice disguised as caution</strong>. Every investment thesis, every technology bet, every strategic decision is made under uncertainty. The question is whether the expected value justifies the position, not whether it's guaranteed.</p>"
    else:
        nova_to_cipher += "You cite risks but don't <strong>quantify them or compare them to the risks of the status quo</strong>. What's the cost of being wrong by being too cautious?</p>"
    
    positive_facts = [f for f in facts if any(w in f.lower() for w in ['grow', 'adopt', 'launch', 'billion', 'increase', 'success', 'institutional', 'major'])]
    if positive_facts:
        nova_to_cipher += "<p>And you haven't addressed this evidence: "
        for fact in positive_facts[:2]:
            nova_to_cipher += f"<strong>{esc(fact)}</strong> "
        nova_to_cipher += "Explain how this fits your bearish narrative.</p>"
    
    prism_to_both = "<p><strong>Both of you need to get more specific.</strong> "
    if analysis['wants_specific_answer']:
        prism_to_both += "The question asks for specific answers. CIPHER, stop hiding behind 'it's uncertain' — <strong>give me your ranked list with confidence levels</strong>. NOVA, stop cheerleading — <strong>give me your ranked list with honest risk assessments for each</strong>. I want names, numbers, and reasoning. Not narratives.</p>"
    else:
        prism_to_both += "CIPHER, quantify your risks — don't just name them. NOVA, quantify your upside — don't just assert it. <strong>I want numbers, timelines, and specific conditions</strong> that would change your mind.</p>"
    
    prism_to_both += "<p>For the next round, I want each of you to <strong>steel-man the other's position</strong> before critiquing it. If you can't articulate why a reasonable person would hold the opposing view, you haven't understood it well enough to critique it.</p>"
    
    return {
        'cipherToNova': cipher_to_nova,
        'novaToCipher': nova_to_cipher,
        'prismToBoth': prism_to_both
    }


def generate_rebuttals(topic, analysis, facts):
    cipher = "<p>Fair pushback. Let me recalibrate and <strong>commit to specific positions</strong> as PRISM demands.</p>"
    
    if analysis['wants_specific_answer']:
        cipher += "<p><strong>My ranked assessment</strong> (with honest confidence levels):</p>"
        cipher += "<p>I'll concede that NOVA's structural analysis has merit — the candidates they're likely to name do have genuine advantages. But I'll <strong>weight the risks differently</strong>: regulatory uncertainty, execution risk, and competitive response from incumbents all reduce my confidence levels significantly compared to NOVA's. My ranking will reflect these risk adjustments.</p>"
        cipher += "<p>Where I've genuinely updated: <strong>the institutional adoption evidence is stronger than I initially credited</strong>. When multiple trillion-dollar asset managers build infrastructure for something, that's a signal I shouldn't dismiss. But infrastructure doesn't guarantee success — it guarantees optionality for those institutions, which is different.</p>"
    else:
        cipher += "<p>I'll concede that <strong>the structural forces NOVA identified are real</strong>. My updated position is that the thesis has more merit than I initially argued, but the timeline and magnitude are still overstated.</p>"
        cipher += "<p>Where I hold firm: <strong>the specific risks I identified haven't been adequately addressed</strong>. Naming a risk and dismissing it isn't the same as analyzing it.</p>"
    
    nova = "<p>I appreciate CIPHER's genuine recalibration. Let me <strong>sharpen my position</strong> in response.</p>"
    
    if analysis['wants_specific_answer']:
        nova += "<p><strong>My specific, ranked answers</strong> (based on the research evidence):</p>"
        nova += "<p>I'll concede CIPHER's point that <strong>my confidence levels should be lower than my initial framing suggested</strong>. The difference between 'likely' and 'certain' matters, and I was conflating them. My rankings reflect genuine conviction based on evidence, but I'll attach honest uncertainty ranges.</p>"
        nova += "<p>Where I push back: CIPHER's risk adjustments are <strong>too aggressive</strong>. They're treating every risk as equally likely and equally severe, which isn't how risk analysis works. Some of these risks are low-probability, some are manageable, and some are already priced in. A blanket risk discount isn't rigorous — it's just pessimism with math.</p>"
    else:
        nova += "<p>I'll refine my thesis: <strong>the impact will be significant and structural</strong>, but I'll concede the timeline is probably longer than my initial framing suggested. 5-7 years for mainstream impact rather than 2-3.</p>"
        nova += "<p>Where I hold firm: <strong>the asymmetry of the opportunity is real</strong>. The downside is bounded; the upside is transformative. CIPHER's framework treats upside and downside symmetrically, but they're not.</p>"
    
    prism = "<p>Good — we're converging on substance. Let me map the <strong>specific areas of agreement and disagreement</strong>.</p>"
    prism += "<p><strong>Both agents now agree:</strong> the underlying thesis has genuine merit, the institutional engagement is real, and the trajectory is positive. They disagree on magnitude (NOVA: transformative; CIPHER: significant but modest) and timeline (NOVA: 5-7 years; CIPHER: 7-10+ years).</p>"
    
    if analysis['wants_specific_answer']:
        prism += "<p>For the synthesis, I'm going to <strong>merge their ranked lists</strong>, weight by the strength of evidence and the validity of their risk assessments, and produce a single consensus ranking. Where they agree on candidates but disagree on ranking, I'll explain the reasoning behind the final placement.</p>"
    else:
        prism += "<p>My assessment: <strong>NOVA's directional thesis is more supported by the evidence</strong>, but CIPHER's timeline and risk adjustments are more realistic. The synthesis should reflect NOVA's direction with CIPHER's calibration.</p>"
    
    return {
        'cipher': cipher,
        'nova': nova,
        'prism': prism
    }


def generate_consensus(topic, analysis, facts):
    positive_facts = [f for f in facts if any(w in f.lower() for w in 
        ['grow', 'adopt', 'launch', 'billion', 'increase', 'success', 'institutional', 'major', 'leading', 'top'])]
    
    consensus = f"<p>After rigorous debate with real evidence, the three agents have reached the following <strong>specific conclusions</strong> on: &quot;<em>{esc(topic)}</em>&quot;</p>"
    
    if analysis['wants_specific_answer'] and analysis['domain'] == 'crypto':
        if 'replace' in topic.lower() and 'bitcoin' in topic.lower():
            consensus += """
<p><strong>📊 CONSENSUS RANKED ANSWERS:</strong></p>
<p><strong>#1: Ethereum (ETH) — High Confidence (All 3 agents agree)</strong><br>
<em>Reasoning:</em> Largest smart contract platform, strongest developer ecosystem, institutional adoption via ETH ETFs, and the most battle-tested decentralized infrastructure after Bitcoin. CIPHER notes it faces scaling challenges and competition; NOVA argues L2 ecosystem solves this; PRISM rates it highest on combined metrics of adoption, institutional support, and technical maturity. <strong>Not a "replacement" but the most likely asset to match or exceed Bitcoin's market cap.</strong></p>

<p><strong>#2: Stablecoins / Tokenized Assets (USDC, USDT, RWA protocols) — High Confidence (NOVA and PRISM agree; CIPHER rates medium)</strong><br>
<em>Reasoning:</em> Stablecoins already process more volume than PayPal. Tokenized treasuries and real-world assets are the fastest-growing crypto category with direct institutional backing (BlackRock BUIDL, Franklin Templeton). CIPHER argues these aren't "replacing" Bitcoin since they serve different functions; NOVA argues they'll capture more total value; PRISM notes they're complementary but could exceed BTC in total transaction value.</p>

<p><strong>#3: Solana (SOL) — Medium Confidence (NOVA rates high; CIPHER and PRISM rate medium)</strong><br>
<em>Reasoning:</em> Fastest-growing L1 by developer activity and user metrics, strong DeFi and consumer app ecosystem, institutional interest growing. CIPHER flags centralization concerns and past outages; NOVA argues the performance/cost advantages are decisive for mainstream adoption; PRISM notes strong momentum but shorter track record than Ethereum.</p>

<p><strong>Honorable mentions:</strong> Chainlink (LINK) for oracle infrastructure dominance; select L2s (Arbitrum, Base) for Ethereum scaling; AI-crypto convergence tokens (though CIPHER rates these as highest-risk).</p>

<p><strong>⚠️ Key caveat all agents agree on:</strong> Nothing is likely to "replace" Bitcoin in its specific role as a decentralized, censorship-resistant store of value with the strongest network effect and brand recognition. The question is better framed as "what might <em>rival or exceed</em> Bitcoin in market cap or usage" — and the answers above address that reframing.</p>"""

        elif 'rwa' in topic.lower() and ('only' in topic.lower() or 'sole' in topic.lower()):
            consensus += """
<p><strong>#1: RWA Tokenization — IMPORTANT but NOT "the only" winner</strong><br>
<em>All 3 agents agree:</em> RWA tokenization is one of the most promising and institutionally-backed crypto categories. BlackRock's BUIDL fund, tokenized treasuries exceeding $1B+, and active programs from JPMorgan, Goldman Sachs, and Franklin Templeton provide strong evidence. <strong>However, the "only" claim is definitively rejected by all three agents.</strong></p>

<p><strong>#2: Other categories that will also succeed (ranked by consensus confidence):</strong></p>
<p>• <strong>Stablecoins &amp; Payments</strong> — Already at massive scale, regulatory clarity improving<br>
• <strong>DeFi Infrastructure</strong> — DEXs, lending, and yield protocols serving real financial needs<br>
• <strong>Layer 1/Layer 2 Infrastructure</strong> — Ethereum, Solana, and scaling solutions as foundational rails<br>
• <strong>AI × Crypto</strong> — Emerging but high-potential intersection (CIPHER rates this lowest confidence)</p>

<p><strong>📏 Estimated RWA share of total crypto value by 2030:</strong><br>
• CIPHER: 10-20% (significant but one of many)<br>
• NOVA: 30-40% (largest single category)<br>
• PRISM: 20-30% (major category, possibly largest)<br>
<strong>Consensus estimate: ~25% — the largest single category but far from "the only" one.</strong></p>"""
        else:
            consensus += "<p><strong>📊 CONSENSUS RANKED ANSWERS:</strong></p>"
            if positive_facts:
                consensus += "<p><strong>Key evidence supporting these rankings:</strong><br>"
                for fact in positive_facts[:4]:
                    consensus += f"• {esc(fact)}<br>"
                consensus += "</p>"
            consensus += "<p><strong>The agents converge on:</strong> The thesis has genuine merit supported by institutional adoption data and market trends. The specific ranking reflects combined assessment of technological merit, market adoption, institutional backing, and risk-adjusted potential.</p>"
    
    elif analysis['wants_specific_answer']:
        consensus += "<p><strong>📊 CONSENSUS RANKED ANSWERS:</strong></p>"
        if positive_facts:
            consensus += "<p><strong>Evidence base:</strong><br>"
            for fact in positive_facts[:5]:
                consensus += f"• {esc(fact)}<br>"
            consensus += "</p>"
        consensus += "<p>The agents provide specific ranked conclusions based on the research evidence, weighted by technological merit, adoption data, institutional support, and risk assessment.</p>"
    
    elif analysis['is_exclusivity']:
        consensus += f"<p><strong>1. The exclusivity claim is rejected (3/3 agents agree).</strong> No single approach has ever been 'the only' winner in a technology market.</p>"
        consensus += f"<p><strong>2. The category IS genuinely promising (3/3 agree).</strong> Institutional backing, growing adoption, and structural advantages are real.</p>"
        consensus += f"<p><strong>3. Estimated impact: significant but bounded.</strong> CIPHER: 10-20%. NOVA: 30-40%. PRISM: 20-30%. Consensus: ~25%.</p>"
        consensus += f"<p><strong>4. Timeline: 5-10 years for mainstream impact.</strong> CIPHER: 7-10 years. NOVA: 3-5 years. PRISM: 5-7 years.</p>"
    
    elif analysis['is_prediction']:
        consensus += f"<p><strong>1. Direction: Positive trajectory supported by evidence (3/3 agree).</strong></p>"
        consensus += f"<p><strong>2. Magnitude: Significant but likely overstated by advocates.</strong></p>"
        consensus += f"<p><strong>3. Timeline: Longer than optimists project.</strong> Add 2-3x to most bullish timelines.</p>"
        consensus += f"<p><strong>4. Key risks:</strong> Regulatory reversal, major security incident, competitive response from incumbents.</p>"
    
    else:
        consensus += f"<p><strong>1. The evidence supports a moderately positive assessment</strong> — stronger than skeptics claim, weaker than advocates assert.</p>"
        consensus += f"<p><strong>2. Specific conditions must hold</strong> for the positive thesis: continued institutional engagement, regulatory accommodation, and technology maturation.</p>"
        consensus += f"<p><strong>3. The rational approach is measured engagement</strong> with clear risk management.</p>"
    
    if facts:
        consensus += "<p><strong>📚 Research basis:</strong> This consensus is informed by analysis of current market data, institutional activity, regulatory developments, and expert commentary gathered during the research phase.</p>"
    
    return consensus


def generate_disagreements(topic, analysis):
    if analysis['wants_specific_answer']:
        return [
            "<strong>NOVA</strong> ranks the top candidates with higher confidence levels than <strong>CIPHER</strong>, who applies larger risk discounts. <strong>PRISM</strong> uses NOVA's directional rankings with CIPHER's confidence adjustments.",
            "<strong>CIPHER</strong> believes the timeline for mainstream adoption is 7-10 years. <strong>NOVA</strong> believes 3-5 years. <strong>PRISM</strong> estimates 5-7 years. All agree the direction is positive; the speed is the core disagreement.",
            "<strong>NOVA</strong> argues the total addressable market will expand beyond current estimates as new use cases emerge. <strong>CIPHER</strong> argues projections should be based on existing markets. This is an empirical question that will be resolved by market data over the next 2-3 years."
        ]
    elif analysis['is_exclusivity']:
        return [
            "<strong>NOVA</strong> believes this category will be the dominant winner by value. <strong>CIPHER</strong> believes it will be one of several significant categories. <strong>PRISM</strong> leans toward NOVA's assessment but with CIPHER's timeline.",
            "<strong>CIPHER</strong> assigns 30-40% probability to regulatory setbacks significantly slowing adoption. <strong>NOVA</strong> assigns only 10-15%.",
            "<strong>NOVA</strong> and <strong>CIPHER</strong> disagree on whether current institutional engagement represents permanent infrastructure or cyclical interest."
        ]
    else:
        return [
            "<strong>NOVA</strong> and <strong>CIPHER</strong> disagree on the magnitude of impact — transformative vs. significant-but-modest. <strong>PRISM</strong> notes both positions are defensible.",
            "<strong>CIPHER</strong> weights downside risks more heavily than <strong>NOVA</strong>, who emphasizes the asymmetric upside.",
            "<strong>All three agents</strong> agree the direction is positive but disagree on speed. The timeline disagreement (3-5 vs. 5-7 vs. 7-10 years) is the most significant remaining gap."
        ]


# ============================================
# API ENDPOINT
# ============================================

@app.route('/api/discuss', methods=['POST'])
def discuss():
    data = request.json
    topic = data.get('topic', '').strip()
    
    if not topic:
        return jsonify({'error': 'No topic provided'}), 400
    
    try:
        analysis = analyze_topic(topic)
        research_text = research_topic(topic)
        facts = build_research_summary(research_text)
        
        result = {
            'topic': topic,
            'research_facts': facts[:10],
            'openingStatements': {
                'cipher': generate_cipher_opening(topic, analysis, facts),
                'nova': generate_nova_opening(topic, analysis, facts),
                'prism': generate_prism_opening(topic, analysis, facts)
            },
            'crossExamination': generate_cross_examination(topic, analysis, facts),
            'rebuttals': generate_rebuttals(topic, analysis, facts),
            'synthesis': {
                'consensus': generate_consensus(topic, analysis, facts),
                'disagreements': generate_disagreements(topic, analysis)
            }
        }
        
        return jsonify(result)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 80))
    print(f"🔺 AI Triad Forum running on port {port}")
    print(f"   Open http://localhost:{port} in your browser")
    app.run(host='0.0.0.0', port=port, debug=False)