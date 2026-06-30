# Dynamic Programming

## DP — How I Identify a DP Problem

**Verbal triggers I listen for in the prompt.**

- "**How many ways**" → DP **count**
- "**Maximum / Minimum**" → DP **optimize**
- "**Is it possible**" → DP **boolean**
- **Recursion with overlapping subproblems** → memoize / tabulate

## DP — My 4-Step Approach

> Same template every time. Saying it out loud makes the recurrence fall out naturally.

1. **Define the state** — what does `dp[i]` (or `dp[i][j]`) mean?
2. **Write the recurrence relation** — how does `dp[i]` build on smaller states?
3. **Identify base cases** — `dp[0]`, `dp[1]`, edges of the grid.
4. **Choose direction** — top-down (memoization) or bottom-up (tabulation)?

## DP — Fibonacci / Climbing Stairs Pattern

> The simplest DP — one dimension, two predecessors.

```text
dp[i] = dp[i-1] + dp[i-2]
```

**Base cases:** `dp[0] = 1`, `dp[1] = 1`. **Complexity:** Time `O(n)`, Space `O(1)` if you only keep the last two values.

## DP — 0/1 Knapsack Pattern

> Classic "take it or leave it" — each item either goes in the bag once or not at all.

```text
dp[i][w] = max(
    dp[i-1][w],                          // skip item i
    val[i] + dp[i-1][w - weight[i]]      // take item i
)
```

**Choice:** take item OR skip item. **Complexity:** Time `O(n × W)`, Space `O(n × W)` (compressible to `O(W)`).

## DP — Longest Common Subsequence Pattern

> Two-dimensional DP over two strings. Branch on whether the current characters match.

```text
if s1[i] == s2[j]:  dp[i][j] = 1 + dp[i-1][j-1]
else:               dp[i][j] = max(dp[i-1][j], dp[i][j-1])
```

**Complexity:** Time `O(n × m)`, Space `O(n × m)` (compressible to `O(min(n,m))`).

## DP — Coin Change (Minimum Coins) Pattern

> Unbounded knapsack variant — pick the **minimum** number of coins to make a target amount.

```text
dp[i] = min(dp[i - coin] + 1)  for each coin
```

**Base case:** `dp[0] = 0`. **Initial fill:** `Int32.MaxValue` (or `amount + 1`) for impossible amounts.

## DP — Practice Checklist

**Core problems I revise before any interview.**

- [ ] Climbing Stairs
- [ ] House Robber
- [ ] Coin Change
- [ ] Longest Common Subsequence
- [ ] 0/1 Knapsack
- [ ] Longest Increasing Subsequence
- [ ] Partition Equal Subset Sum
