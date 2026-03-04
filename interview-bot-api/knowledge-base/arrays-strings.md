# Arrays & Strings

## My Mental Triggers
- Is it sorted? → Two pointers or binary search
- Finding subarray/substring? → Sliding window
- Track frequency? → HashMap
- Running total? → Prefix sum

## Two Pointers
Use when: sorted array, finding pairs, palindrome check
Time: O(n), Space: O(1)
Problems: Two Sum (sorted), Container With Most Water, Valid Palindrome

## Sliding Window
Use when: contiguous subarray/substring, max/min of size k
Time: O(n)
Problems: Longest Substring Without Repeating Characters, Max Sum Subarray K

## HashMap / Frequency Counter
Use when: duplicates, counting, anagram check
Problems: Two Sum, Group Anagrams, Top K Frequent Elements

## Prefix Sum
Use when: range sum queries, subarray sum equals k
prefix[i] = prefix[i-1] + arr[i]
Sum from i to j = prefix[j] - prefix[i-1]

## Kadane's Algorithm (Maximum Subarray)
currentMax = max(arr[i], currentMax + arr[i])
globalMax = max(globalMax, currentMax)

## Problems I Have Practiced
- [ ] Two Sum
- [ ] Best Time to Buy and Sell Stock
- [ ] Contains Duplicate
- [ ] Maximum Subarray
- [ ] Longest Substring Without Repeating Characters
- [ ] Product of Array Except Self
