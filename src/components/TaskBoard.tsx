import { useEffect, useState } from 'react'
import './TaskBoard.css'
import SidebarLayout from './SidebarLayout'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'

// Step1: 型定義 → 何を扱うかを決める
type Task = {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  order_index: number
  source?: string
}

function TaskBoard() {
  // Step2: State定義(画面が持つデータ) → 型が決まったら画面で何を保持するかを決める
  const [tasks, setTasks] = useState<Task[]>([])
  const [showModal, setShowModal] = useState(false)
  const columns = ['todo', 'in_progress', 'done'] as const

  const columnLabels: Record<string, string> = {
    todo: 'To Do',
    in_progress: '進行中',
    done: '完了',
  }

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newDueDate, setNewDueDate] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showMinutesModal, setShowMinutesModal] = useState(false)
  const [minutesList, setMinutesList] = useState<{ id: string; filename: string }[]>([])
  const [selectedMinutesIds, setSelectedMinutesIds] = useState<Set<string>>(new Set())
  const [extracting, setExtracting] = useState(false)

  // Step3: データ取得 → 画面を表示するにはデータが必要なので、GETだけは作る
  const fetchTasks = () => {
    fetch('http://localhost:9000/tasks/test-user')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTasks(data)
      })
      .catch((e) => {
        console.log('errorが発生しました', e)
      })
  }

  // Step5: 操作関数(moveTask / deleteTask)
  // 移動関数
  const moveTask = async (taskId: string, newStatus: string) => {
    await fetch(`http://localhost:9000/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    // 再取得して画面更新
    fetchTasks()
  }

  const deleteTask = async (taskId: string) => {
    await fetch(`http://localhost:9000/tasks/${taskId}`, {
      method: 'DELETE',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({}),
    })
    fetchTasks()
  }

  const createTask = async () => {
    if (!newTitle.trim()) return
    await fetch('http://localhost:9000/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        due_date: newDueDate || null,
        user_id: 'test-user',
      }),
    })
    setNewTitle('')
    setNewDescription('')
    setNewPriority('medium')
    setNewDueDate('')
    setShowModal(false)
    fetchTasks()
  }

  const handleDragEnd = (result: DropResult) => {
    // ドロップ先がなければ何もしない
    if (!result.destination) return
    // ドロップ先の列 = 新しいstatus
    const newStatus = result.destination.droppableId
    // ドロップしたカードのid
    const taskId = result.draggableId
    // 既存のmoveTaskを呼ぶ
    moveTask(taskId, newStatus)
  }

  const updateTask = async () => {
    if (!editingTask) return
    await fetch(`http://localhost:9000/tasks/${editingTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        due_date: editingTask.due_date,
      }),
    })
    setEditingTask(null)
    fetchTasks()
  }

  // 議事録一覧を取得
  const fetchMinutesList = () => {
    fetch('http://localhost:9000/minutes/history/test-user')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setMinutesList(data)
      })
      .catch(() => {})
  }

  // 議事録の選択トグル
  const toggleMinutesSelect = (id: string) => {
    setSelectedMinutesIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 議事録からタスク抽出
  const extractTasks = async () => {
    if (selectedMinutesIds.size === 0) return
    setExtracting(true)

    // 1. 選択した議事録をベクトルDBに登録
    for (const id of selectedMinutesIds) {
      await fetch(`http://localhost:9000/minutes-rag/register/${id}`, {
        method: 'POST',
      })
    }

    // 2. タスク抽出
    await fetch(`http://localhost:9000/minutes-rag/extract-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minutes_ids: Array.from(selectedMinutesIds),
        user_id: 'test-user',
      }),
    })

    setExtracting(false)
    setShowMinutesModal(false)
    setSelectedMinutesIds(new Set())
    fetchTasks()
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  // Step4: 最小限のHTML(カンバン3列) → データが取れたら、表示だけ確認する。ここで一度ブラウザで動確
  return (
    <SidebarLayout
      sidebarTitle="タスク管理"
      sidebarOpen={sidebarOpen}
      onToggle={() => setSidebarOpen(!sidebarOpen)}
      sidebar={
        // ← サイドバーの中身だけ
        <>
          <button
            className="extract-task-button"
            onClick={() => {
              fetchMinutesList()
              setShowMinutesModal(true)
            }}
          >
            議事録からタスク抽出
          </button>
          <button className="add-task-button" onClick={() => setShowModal(true)}>
            + タスク追加
          </button>
          <div className="task-stats">
            <div className="stat-item">
              <span>To Do</span>
              <span className="stat-count todo">
                {tasks.filter((t) => t.status === 'todo').length}
              </span>
            </div>
            <div className="stat-item">
              <span>進行中</span>
              <span className="stat-count in-progress">
                {tasks.filter((t) => t.status === 'in_progress').length}
              </span>
            </div>
            <div className="stat-item">
              <span>完了</span>
              <span className="stat-count done">
                {tasks.filter((t) => t.status === 'done').length}
              </span>
            </div>
          </div>
        </>
      }
    >
      {/* ← ここがメインエリア（カンバン） */}
      <div className="kanban-columns">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="kanban-columns">
            {columns.map((status) => (
              <Droppable droppableId={status} key={status}>
                {(provided, snapshot) => (
                  <div
                    className={`kanban-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <h3>{columnLabels[status]}</h3>
                    {tasks
                      .filter((t) => t.status === status)
                      .map((task, index) => {
                        const currentIndex = columns.indexOf(task.status)
                        return (
                          <Draggable draggableId={task.id} index={index} key={task.id}>
                            {(provided, snapshot) => (
                              <div
                                className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => setEditingTask(task)}
                              >
                                <p className="task-title">{task.title}</p>
                                <p className="task-description">{task.description}</p>
                                <div className="task-meta">
                                  <span className={`priority-badge ${task.priority}`}>
                                    {task.priority}
                                  </span>
                                  {task.due_date && (
                                    <span className="due-date">{task.due_date}</span>
                                  )}
                                </div>
                                {task.source && (
                                  <div className="task-source-list">
                                    {task.source.split('、').map((s, i) => (
                                      <span key={i} className="task-source">
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="task-actions">
                                  {currentIndex > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        moveTask(task.id, columns[currentIndex - 1])
                                      }}
                                    >
                                      ←
                                    </button>
                                  )}
                                  {currentIndex < columns.length - 1 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        moveTask(task.id, columns[currentIndex + 1])
                                      }}
                                    >
                                      →
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteTask(task.id)
                                    }}
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        )
                      })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>新しいタスク</h3>
              <input
                type="text"
                placeholder="タイトル"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <textarea
                placeholder="説明"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
              <div className="modal-actions">
                <button onClick={createTask}>作成</button>
                <button onClick={() => setShowModal(false)}>キャンセル</button>
              </div>
            </div>
          </div>
        )}

        {editingTask && (
          <div className="modal-overlay" onClick={() => setEditingTask(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>タスクを編集</h3>
              <input
                type="text"
                placeholder="タイトル"
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
              />
              <textarea
                placeholder="説明"
                value={editingTask.description}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
              />
              <select
                value={editingTask.priority}
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    priority: e.target.value as 'low' | 'medium' | 'high',
                  })
                }
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
              <input
                type="date"
                value={editingTask.due_date ?? ''}
                onChange={(e) =>
                  setEditingTask({ ...editingTask, due_date: e.target.value || null })
                }
              />
              <div className="modal-actions">
                <button onClick={updateTask}>保存</button>
                <button onClick={() => setEditingTask(null)}>キャンセル</button>
              </div>
            </div>
          </div>
        )}

        {showMinutesModal && (
          <div className="modal-overlay" onClick={() => setShowMinutesModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>議事録を選択</h3>
              <div className="minutes-select-list">
                {minutesList.map((m) => (
                  <label key={m.id} className="minutes-select-item">
                    <input
                      type="checkbox"
                      checked={selectedMinutesIds.has(m.id)}
                      onChange={() => toggleMinutesSelect(m.id)}
                    />
                    <span>{m.filename}</span>
                  </label>
                ))}
              </div>
              <div className="modal-actions">
                <button
                  onClick={extractTasks}
                  disabled={extracting || selectedMinutesIds.size === 0}
                >
                  {extracting ? '抽出中...' : `${selectedMinutesIds.size} 件からタスク抽出`}
                </button>
                <button onClick={() => setShowMinutesModal(false)}>キャンセル</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  )
}

export default TaskBoard
