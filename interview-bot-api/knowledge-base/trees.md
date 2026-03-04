# Trees & Binary Search Trees

## Traversal Memory Trick
- Inorder  (L Root R) → sorted output for BST
- Preorder (Root L R) → root is first → use for copying tree
- Postorder(L R Root) → root is last  → use for deleting tree
- Level order          → BFS with Queue

## My Recursive Template (fits most tree problems)
function solve(node):
    if node == null: return base_case
    left  = solve(node.left)
    right = solve(node.right)
    return combine(left, right, node.val)

## DFS vs BFS
DFS: path problems, height, subtree comparison
BFS: nearest node, minimum depth, level-by-level

## BST Properties I Always State
- Left < Root < Right
- Inorder traversal gives sorted array
- Search/Insert/Delete: O(log n) average, O(n) worst

## Problems I Have Practiced
- [ ] Maximum Depth of Binary Tree
- [ ] Invert Binary Tree
- [ ] Symmetric Tree
- [ ] Path Sum
- [ ] Lowest Common Ancestor (BST + general)
- [ ] Validate Binary Search Tree
- [ ] Level Order Traversal

## Mistake I Used to Make
I used to forget the null base case. Now I write that first, before any logic.
