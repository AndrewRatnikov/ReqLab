# Token Usage Summary (heuristic estimate — see note below)

| Stage | Input tok (est) | Output tok (est) | Stage total tok (est) |
|-------|------------------|-------------------|------------------------|
| product-agent | 802 | 984 | 1786 |
| architect-agent | 2656 | 2906 | 5562 |
| tester-agent | 4190 | 550 | 4740 |
| test-reviewer | 4772 | 300 | 5072 |
| coder-agent | 5577 | 630 | 6207 |
| **TOTAL** | 17997 | 5370 | 23367 |

> Estimated from artifact file sizes (chars/4). Excludes conversation
> context, agent reasoning, and retries — real usage is substantially
> higher. Use for RELATIVE stage comparison only, never as an exact count.
