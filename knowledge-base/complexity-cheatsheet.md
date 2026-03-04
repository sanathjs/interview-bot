# Time & Space Complexity Cheat Sheet

## Data Structures
| Structure       | Access | Search | Insert | Delete |
|----------------|--------|--------|--------|--------|
| Array          | O(1)   | O(n)   | O(n)   | O(n)   |
| Linked List    | O(n)   | O(n)   | O(1)   | O(1)   |
| HashMap        | -      | O(1)   | O(1)   | O(1)   |
| BST (balanced) | O(log n) | O(log n) | O(log n) | O(log n) |
| Heap           | O(1) top | O(n) | O(log n) | O(log n) |

## Sorting
| Algorithm  | Best     | Average  | Worst    | Space  |
|-----------|----------|----------|----------|--------|
| Quick Sort | O(n log n) | O(n log n) | O(n²) | O(log n) |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) |
| Heap Sort  | O(n log n) | O(n log n) | O(n log n) | O(1) |

## Common Patterns
- Two pointers:       O(n) time, O(1) space
- Sliding window:     O(n) time, O(k) space
- BFS/DFS on graph:   O(V + E) time, O(V) space
- Binary search:      O(log n) time, O(1) space
- DP (2D table):      O(n*m) time, O(n*m) space

## How I Analyze Complexity in Interviews
1. Count loops — nested loops usually mean O(n²)
2. Recursion — draw the tree, count nodes = total work
3. Always state both time AND space complexity
4. Mention best/average/worst when relevant
