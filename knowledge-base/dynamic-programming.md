# Dynamic Programming

## How I Identify DP
- "How many ways" → DP count
- "Maximum / Minimum" → DP optimize
- "Is it possible" → DP boolean
- Recursion with overlapping subproblems → memoize

## My 4-Step Approach
1. Define the state — what does dp[i] mean?
2. Write the recurrence relation
3. Identify base cases
4. Top-down (memoization) or bottom-up (tabulation)?

## Patterns I Know Well

### Fibonacci / Climbing Stairs
dp[i] = dp[i-1] + dp[i-2]

### 0/1 Knapsack
dp[i][w] = max(dp[i-1][w], val[i] + dp[i-1][w-weight[i]])
Choice: take item OR skip item

### Longest Common Subsequence
if match:    dp[i][j] = 1 + dp[i-1][j-1]
if no match: dp[i][j] = max(dp[i-1][j], dp[i][j-1])

### Coin Change (Minimum Coins)
dp[i] = min(dp[i - coin] + 1) for each coin

## Problems I Have Practiced
- [ ] Climbing Stairs
- [ ] House Robber
- [ ] Coin Change
- [ ] Longest Common Subsequence
- [ ] 0/1 Knapsack
- [ ] Longest Increasing Subsequence
- [ ] Partition Equal Subset Sum
