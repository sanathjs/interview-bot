# Trees & Binary Search Trees

## Trees — Traversal Memory Trick

**One-line mnemonic per traversal.**

- **Inorder** *(L → Root → R)* — sorted output for a BST.
- **Preorder** *(Root → L → R)* — root visited first → use for **copying** a tree.
- **Postorder** *(L → R → Root)* — root visited last → use for **deleting** a tree.
- **Level-order** — BFS with a `Queue<T>`.

## Trees — My Recursive Template

> Almost every tree problem fits this shape — base case first, recurse, combine.

```csharp
TResult Solve(TreeNode node)
{
    if (node == null) return BaseCase();

    var left  = Solve(node.Left);
    var right = Solve(node.Right);

    return Combine(left, right, node.Value);
}
```

**Three slots to fill:** `BaseCase()`, the two recursive calls, and `Combine(...)`. Once you can identify all three, the problem is solved.

## Trees — DFS vs BFS

> Pick by the shape of the answer, not the shape of the tree.

| Use **DFS** for | Use **BFS** for |
|---|---|
| Path problems | Nearest node |
| Height / depth | Minimum depth |
| Subtree comparison | Level-by-level processing |

## Trees — BST Properties I Always State

**Things I say aloud before writing code on a BST problem.**

- **Left < Root < Right** at every node.
- **Inorder traversal** of a BST gives a **sorted array**.
- **Search / Insert / Delete:** `O(log n)` average, `O(n)` worst (unbalanced).

## Trees — Practice Checklist

**Core problems I revise before any interview.**

- [ ] Maximum Depth of Binary Tree
- [ ] Invert Binary Tree
- [ ] Symmetric Tree
- [ ] Path Sum
- [ ] Lowest Common Ancestor (BST + general)
- [ ] Validate Binary Search Tree
- [ ] Level Order Traversal

## Trees — Mistake I Used to Make

> I used to forget the `null` base case. Now I write that first, before any logic.

This one habit alone has saved me from more bugs than any other tree-problem rule. Every recursive function starts with the null check; only then do I write the recursive body.
