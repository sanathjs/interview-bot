# Time & Space Complexity Cheat Sheet

## Complexity — Data Structures (Access / Search / Insert / Delete)

**Reference table for the most common containers.**

| Structure | Access | Search | Insert | Delete |
|---|---|---|---|---|
| Array | `O(1)` | `O(n)` | `O(n)` | `O(n)` |
| Linked List | `O(n)` | `O(n)` | `O(1)` | `O(1)` |
| HashMap | — | `O(1)` | `O(1)` | `O(1)` |
| BST (balanced) | `O(log n)` | `O(log n)` | `O(log n)` | `O(log n)` |
| Heap | `O(1)` top | `O(n)` | `O(log n)` | `O(log n)` |

## Complexity — Sorting Algorithms (Best / Average / Worst / Space)

**Big-O for the sorts you'll be asked about.**

| Algorithm | Best | Average | Worst | Space |
|---|---|---|---|---|
| Quick Sort | `O(n log n)` | `O(n log n)` | `O(n²)` | `O(log n)` |
| Merge Sort | `O(n log n)` | `O(n log n)` | `O(n log n)` | `O(n)` |
| Heap Sort | `O(n log n)` | `O(n log n)` | `O(n log n)` | `O(1)` |

## Complexity — Common Algorithmic Patterns

**Default time / space for patterns I use daily.**

- **Two pointers** — `O(n)` time, `O(1)` space
- **Sliding window** — `O(n)` time, `O(k)` space
- **BFS / DFS on graph** — `O(V + E)` time, `O(V)` space
- **Binary search** — `O(log n)` time, `O(1)` space
- **DP (2D table)** — `O(n × m)` time, `O(n × m)` space *(compressible to a row or two)*

## Complexity — How I Analyse Complexity in an Interview

**My 4-line script when an interviewer asks "what's the complexity?"**

1. **Count the loops** — nested loops usually mean `O(n²)`.
2. **Recursion** — draw the call tree; **count the nodes** = total work.
3. **Always state BOTH** time AND space complexity.
4. **Mention best / average / worst** when they differ meaningfully (Quick Sort, hash maps with collisions, etc.).
