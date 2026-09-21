// 日付をグループ化する関数
export function groupHistoryByDate<T extends { created_at: string }>(items: T[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)
  const monthAgo = new Date(today.getTime() - 30 * 86400000)

  const groups: { label: string; items: T[] }[] = [
    { label: '今日', items: [] },
    { label: '昨日', items: [] },
    { label: '1週間以内', items: [] },
    { label: '30日以内', items: [] },
  ]

  for (const item of items) {
    const d = new Date(item.created_at)
    if (d >= today) groups[0].items.push(item)
    else if (d >= yesterday) groups[1].items.push(item)
    else if (d >= weekAgo) groups[2].items.push(item)
    else if (d >= monthAgo) groups[3].items.push(item)
  }
  return groups.filter((g) => g.items.length > 0)
}
