# Arrays & Strings

## DSA — Mental Triggers for Array / String Problems

**Pattern triggers I run through in the first 30 seconds of any array/string problem.**

- **Is it sorted?** → Two pointers or binary search
- **Finding a subarray / substring?** → Sliding window
- **Track frequency?** → HashMap / frequency counter
- **Running total?** → Prefix sum
- **Maximum contiguous sum?** → Kadane's

## DSA — Two Pointers

> Walk two indices through a sequence to find pairs or shrink a window without nested loops.

**Use when:** sorted array, finding pairs, palindrome check.

**Complexity:** Time `O(n)`, Space `O(1)`.

**Classic problems**

- Two Sum (sorted)
- Container With Most Water
- Valid Palindrome

## DSA — Sliding Window

> Maintain a moving range over the array and update incrementally as the window expands or contracts.

**Use when:** contiguous subarray / substring, max / min of size `k`.

**Complexity:** Time `O(n)`.

**Classic problems**

- Longest Substring Without Repeating Characters
- Maximum Sum Subarray of size K

## DSA — HashMap / Frequency Counter

> Trade space for time: a `Dictionary<T, int>` turns most "do I have X?" loops into `O(1)` lookups.

**Use when:** duplicates, counting, anagram check.

**Classic problems**

- Two Sum
- Group Anagrams
- Top K Frequent Elements

## DSA — Prefix Sum

> Precompute cumulative sums once so any range query is `O(1)`.

**Use when:** range sum queries, "subarray sum equals K".

**Formulas**

```text
prefix[i]      = prefix[i - 1] + arr[i]
sum(i..j)      = prefix[j] - prefix[i - 1]
```

## DSA — Kadane's Algorithm (Maximum Subarray)

> Greedily track the best ending-here vs. best so-far. One pass, no extra space.

```text
currentMax = max(arr[i], currentMax + arr[i])
globalMax  = max(globalMax, currentMax)
```

**Complexity:** Time `O(n)`, Space `O(1)`.

## DSA — Practice Checklist (Arrays & Strings)

**Core problems I revise before any interview.**

- [ ] Two Sum
- [ ] Best Time to Buy and Sell Stock
- [ ] Contains Duplicate
- [ ] Maximum Subarray
- [ ] Longest Substring Without Repeating Characters
- [ ] Product of Array Except Self
