# Token Usage Summary (heuristic estimate — see note below)

| Stage | Input tok (est) | Output tok (est) | Stage total tok (est) |
|-------|------------------|-------------------|------------------------|
| product-agent | 1317 | 1057 | 2374 |
| architect-agent | 2941 | 2121 | 5062 |
| tester-agent | 3405 | 2520 | 5925 |
| test-reviewer | 5866 | 300 | 6166 |
| coder-agent | 6700 | 744 | 7444 |
| **TOTAL** | 20229 | 6742 | 26971 |

> Estimated from artifact file sizes (chars/4). Excludes conversation
> context, agent reasoning, and retries — real usage is substantially
> higher. Use for RELATIVE stage comparison only, never as an exact count.
