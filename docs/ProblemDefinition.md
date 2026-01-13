# SpecCheck - Problem Definition

## Core Question

**Can this hardware physically do what the seller claims?**

This is the single question SpecCheck answers. Everything in the app serves this question.

## The Problem

Consumer electronics sellers routinely make false performance claims:
- Flashlights advertised at 10,000 lumens that output 800
- Power banks labeled 20,000mAh containing 6,000mAh of cells
- Chargers claiming 65W with chips rated for 30W
- Audio equipment boasting 1000W from 20W amplifiers

These lies persist because:
1. Most buyers cannot read a circuit board
2. Testing equipment is expensive and requires expertise
3. Marketplaces don't verify technical claims
4. By the time buyers discover the lie, returns are inconvenient

## Users

### Primary User: The Skeptical Buyer
- Purchases electronics online (Amazon, AliExpress, eBay)
- Has been burned by fake specs before
- Willing to open a device to verify claims
- Comfortable with basic tools (screwdriver)
- Not an electrical engineer, but technically curious

### Secondary User: The Community Contributor
- Opens and documents devices regularly
- Wants to warn others about fraudulent products
- May be a hobbyist, reviewer, or enthusiast
- Values building a shared knowledge base

### Tertiary User: The Pre-Purchase Researcher
- Wants to check if a product has been verified before buying
- Searches by product name or listing URL
- May never open a device themselves

## User Pain Points

| Pain Point | Current Workaround | Why It Fails |
|------------|-------------------|--------------|
| Can't verify seller claims | Trust reviews | Reviews are often fake or paid |
| Don't know what components mean | Google part numbers | Requires expertise to interpret datasheets |
| No way to calculate real output | Buy and hope | Expensive trial and error |
| Nowhere to report fakes | Leave negative review | Gets buried, doesn't prevent future sales |
| Takes expertise to spot fakes | Watch teardown videos | Time-consuming, specific product may not exist |

## Success Criteria

### For the User
1. Point camera at PCB → see component identification within 2 seconds
2. Tap component → see relevant specs in plain language
3. Enter claim → get verdict (plausible/impossible) within 5 seconds
4. Understand WHY a claim fails, not just that it fails

### For the Product
1. 80%+ accuracy on component identification for supported types
2. Verdict matches expert analysis in 90%+ of clear-cut cases
3. Users report feeling confident in purchasing decisions
4. Community database grows with verified products

### For the Ecosystem
1. Sellers face pressure to make accurate claims
2. Informed buyers make better purchasing decisions
3. Dangerous products (fire/health risk) get flagged before harm

## What Success Looks Like

A user considering a "10,000 lumen" flashlight on Amazon:
1. Searches SpecCheck community → finds existing teardown showing max 1,200 lumens
2. Decides not to buy, or buys knowing the real specs
3. If they buy anyway and open it, they can verify in 30 seconds
4. Optionally contributes their own verification

## Boundaries - What SpecCheck Is NOT

### Not a Review Platform
- No star ratings
- No comments on shipping, packaging, customer service
- No subjective quality assessments ("feels cheap")

### Not a Testing Lab
- Does not measure actual output (no lux meter, ammeter)
- Calculates theoretical maximum from component specs
- Verdict is "possible" vs "impossible", not measured performance

### Not a Surveillance Tool
- No purchase history tracking
- No browsing data collection
- No device fingerprinting
- Camera processing stays on-device

### Not a Legal Tool
- Does not file complaints
- Does not contact sellers
- Does not guarantee refunds
- Information only

### Not for Professionals
- Does not replace proper test equipment
- Does not provide certification
- Does not generate compliance reports

## The Core Insight

Every performance claim depends on a chain of physical components. Each component has hard limits set by physics and documented in manufacturer datasheets.

If ANY link in the chain cannot support the claimed output, the claim is false.

You don't need a test lab. You just need to see the parts and know their limits.

**SpecCheck makes those limits visible to anyone with a phone and a screwdriver.**

## Key Assumptions

1. Component markings are readable and not sanded off
2. Manufacturer datasheets are accurate
3. Components are genuine (not counterfeit with fake markings)
4. Users are willing to open devices
5. On-device ML can achieve sufficient accuracy for component detection

## Risks to Address

| Risk | Impact | Mitigation |
|------|--------|------------|
| Counterfeit components with fake markings | False "plausible" verdicts | Community flagging, known fake database |
| Obscured/sanded component markings | Can't identify components | Partial match handling, manual entry option |
| Datasheets not in database | Can't retrieve specs | LLM fallback, community contributions |
| Users misinterpret verdicts | Wrong purchasing decisions | Clear explanation of what verdict means |
| Legal threats from sellers | Service disruption | Focus on facts from datasheets, not accusations |

## Summary

**Problem**: Sellers lie about specs because buyers can't verify them.

**Solution**: An app that reads circuit boards and calculates what's physically possible.

**User**: Anyone who wants to know if a product can do what it claims.

**Scope**: Component identification → spec lookup → constraint chain → verdict.

**Not in scope**: Testing, reviews, legal action, professional certification.
