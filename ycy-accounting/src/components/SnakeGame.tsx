/**
 * SnakeGame — 贪吃蛇小游戏组件
 *
 * 一个在 Canvas 上运行的经典贪吃蛇游戏：
 * - 20x20 网格，方向键/WASD 控制
 * - 手机端支持滑动和屏幕按钮
 * - 最高分记录保存在浏览器本地
 */
import { useRef, useEffect, useState, useCallback } from 'react'
import { Play, RotateCcw } from 'lucide-react'

// ═══ 游戏配置 ═══
const GRID = 20           // 20×20 网格
const CELL = 20           // 每格像素
const SPEED = 120         // 移动间隔（毫秒），越小越快
const INITIAL_LENGTH = 3  // 蛇初始长度（finalScore 以此为准）
const STORAGE_KEY = 'ycy-accounting-snake-best'  // localStorage 键名

type Point = { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right'

/** 初始蛇身 */
function initSnake(): Point[] {
  return [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ]
}

/** 生成随机食物（从空闲格子中选，避免死循环） */
function randomFood(snake: Point[]): Point | null {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`))
  // 收集所有空闲格子
  const free: Point[] = []
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      if (!occupied.has(`${x},${y}`)) {
        free.push({ x, y })
      }
    }
  }
  if (free.length === 0) return null // 棋盘已满
  return free[Math.floor(Math.random() * free.length)]
}

/** 方向对应的向量 */
const DIR_VEC: Record<Direction, Point> = {
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
}

/** 判断是否为反向（不能掉头） */
function isOpposite(a: Direction, b: Direction): boolean {
  return (
    (a === 'up' && b === 'down') ||
    (a === 'down' && b === 'up') ||
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left')
  )
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null) // 缓存 context 避免重复获取
  const snakeRef = useRef<Point[]>(initSnake())
  const foodRef = useRef<Point | null>(randomFood(snakeRef.current))
  const dirRef = useRef<Direction>('right')
  const nextDirRef = useRef<Direction>('right')
  const timerRef = useRef<number | null>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const bestScoreRef = useRef(0) // 用 ref 存最高分，避免闭包陈旧问题

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle')
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem(STORAGE_KEY) || '0')
      bestScoreRef.current = saved
      return saved
    } catch {
      return 0
    }
  })

  /** 绘制游戏画面 */
  const draw = useCallback(() => {
    // 首次绘制时缓存 context
    if (!ctxRef.current) {
      const canvas = canvasRef.current
      if (!canvas) return
      ctxRef.current = canvas.getContext('2d')
      if (!ctxRef.current) return
    }
    const ctx = ctxRef.current

    const size = GRID * CELL
    const snake = snakeRef.current
    const food = foodRef.current

    // 背景
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, size, size)

    // 网格线
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath()
      ctx.moveTo(i * CELL, 0)
      ctx.lineTo(i * CELL, size)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * CELL)
      ctx.lineTo(size, i * CELL)
      ctx.stroke()
    }

    // 食物
    if (food) {
      ctx.fillStyle = '#f43f5e'
      ctx.beginPath()
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 1, 0, Math.PI * 2)
      ctx.fill()
    }

    // 蛇身
    snake.forEach((p, i) => {
      if (i === 0) {
        // 蛇头（圆形 + 眼睛）
        ctx.fillStyle = '#34d399'
        ctx.beginPath()
        const cx = p.x * CELL + CELL / 2
        const cy = p.y * CELL + CELL / 2
        ctx.arc(cx, cy, CELL / 2 - 2, 0, Math.PI * 2)
        ctx.fill()
        // 眼睛
        ctx.fillStyle = '#064e3b'
        const d = DIR_VEC[dirRef.current]
        ctx.beginPath()
        ctx.arc(cx + d.x * 4, cy + d.y * 4, 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // 身体（矩形）
        ctx.fillStyle = '#6ee7b7'
        ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2)
      }
    })
  }, [])

  /** 保存最高分（带异常保护） */
  const saveBestScore = (newScore: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(newScore))
    } catch {
      // localStorage 不可用（满/隐私模式等），静默忽略
    }
  }

  /** 游戏结束 */
  const gameOver = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setGameState('over')
    const finalScore = snakeRef.current.length - INITIAL_LENGTH
    // 从 ref 读取最新最高分，避免闭包陈旧问题
    if (finalScore > bestScoreRef.current) {
      bestScoreRef.current = finalScore
      setBestScore(finalScore)
      saveBestScore(finalScore)
    }
  }, [])

  /** 游戏主循环 */
  const tick = useCallback(() => {
    const dir = nextDirRef.current
    dirRef.current = dir
    const head = snakeRef.current[0]
    const vec = DIR_VEC[dir]
    const newHead: Point = { x: head.x + vec.x, y: head.y + vec.y }

    // 撞墙检测
    if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
      gameOver()
      return
    }

    // 撞自己检测（检查 old snake 除了尾部之外的部分，因为尾部本 tick 会移走）
    const body = snakeRef.current
    for (let i = 0; i < body.length - 1; i++) {
      if (body[i].x === newHead.x && body[i].y === newHead.y) {
        gameOver()
        return
      }
    }

    // 移动蛇
    const ateFood = foodRef.current !== null &&
      newHead.x === foodRef.current.x && newHead.y === foodRef.current.y
    const newSnake = [newHead, ...body]
    if (!ateFood) {
      newSnake.pop()
    }

    snakeRef.current = newSnake

    if (ateFood) {
      const newFood = randomFood(newSnake)
      if (newFood === null) {
        // 棋盘已满（胜利！），结束游戏
        gameOver()
        return
      }
      foodRef.current = newFood
      setScore((s) => s + 1)
    }

    draw()
  }, [draw, gameOver])

  /** 开始游戏 */
  const startGame = useCallback(() => {
    snakeRef.current = initSnake()
    const food = randomFood(snakeRef.current)
    if (food === null) return // 极端情况：初始蛇就占满棋盘（不会发生）
    foodRef.current = food
    dirRef.current = 'right'
    nextDirRef.current = 'right'
    setScore(0)
    setGameState('playing')
    draw()

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = window.setInterval(tick, SPEED)
  }, [tick, draw])

  // 键盘控制
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
      }
      const newDir = keyMap[e.key]
      if (!newDir) return
      e.preventDefault()
      e.stopPropagation()
      if (isOpposite(newDir, dirRef.current)) return
      nextDirRef.current = newDir
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // 触摸滑动控制（手机）
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    touchStart.current = null

    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return // 忽略短距离

    let newDir: Direction
    if (Math.abs(dx) > Math.abs(dy)) {
      newDir = dx > 0 ? 'right' : 'left'
    } else {
      newDir = dy > 0 ? 'down' : 'up'
    }
    if (isOpposite(newDir, dirRef.current)) return
    nextDirRef.current = newDir
  }

  /** 方向按钮点击（手机端） */
  const handleDirButton = (dir: Direction) => (e: React.TouchEvent) => {
    e.preventDefault()
    if (!isOpposite(dir, dirRef.current)) {
      nextDirRef.current = dir
    }
  }

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const canvasSize = GRID * CELL

  return (
    <div className="max-w-lg mx-auto p-4 select-none">
      {/* 分数栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-xs text-slate-400">得分</span>
            <p className="text-2xl font-bold text-slate-800 tabular-nums">{score}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">最佳</span>
            <p className="text-2xl font-bold text-amber-500 tabular-nums">{bestScore}</p>
          </div>
        </div>
        {gameState === 'idle' && (
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl
              hover:bg-primary-600 active:scale-95 transition-all cursor-pointer font-medium"
          >
            <Play size={18} />
            开始游戏
          </button>
        )}
        {gameState === 'over' && (
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl
              hover:bg-primary-600 active:scale-95 transition-all cursor-pointer font-medium"
          >
            <RotateCcw size={18} />
            再来一局
          </button>
        )}
        {gameState === 'playing' && (
          <span className="text-xs text-slate-400">方向键 / WASD 控制</span>
        )}
      </div>

      {/* 游戏画布 */}
      <div className="flex justify-center">
        <div
          className="rounded-2xl overflow-hidden shadow-lg border-4 border-slate-700"
          style={{ width: canvasSize, height: canvasSize }}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="block"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      </div>

      {/* 游戏结束弹层 */}
      {gameState === 'over' && (
        <div className="text-center mt-4">
          <p className="text-lg font-semibold text-slate-700">游戏结束！</p>
          <p className="text-sm text-slate-400">最终得分：{score}</p>
        </div>
      )}

      {/* 空闲状态提示 */}
      {gameState === 'idle' && (
        <div className="text-center mt-6">
          <p className="text-sm text-slate-400">点击「开始游戏」或按方向键开始</p>
          <p className="text-xs text-slate-300 mt-1">电脑：↑↓←→ / WASD ｜ 手机：滑动屏幕</p>
        </div>
      )}

      {/* 操作按钮（手机端） */}
      {gameState === 'playing' && (
        <div className="mt-4 flex flex-col items-center gap-1 sm:hidden">
          {/* 上按钮 */}
          <button
            onTouchStart={handleDirButton('up')}
            className="w-14 h-14 bg-slate-200 rounded-xl flex items-center justify-center text-slate-600 active:bg-slate-300"
          >▲</button>
          <div className="flex gap-1">
            <button
              onTouchStart={handleDirButton('left')}
              className="w-14 h-14 bg-slate-200 rounded-xl flex items-center justify-center text-slate-600 active:bg-slate-300"
            >◀</button>
            <button
              onTouchStart={handleDirButton('down')}
              className="w-14 h-14 bg-slate-200 rounded-xl flex items-center justify-center text-slate-600 active:bg-slate-300"
            >▼</button>
            <button
              onTouchStart={handleDirButton('right')}
              className="w-14 h-14 bg-slate-200 rounded-xl flex items-center justify-center text-slate-600 active:bg-slate-300"
            >▶</button>
          </div>
        </div>
      )}
    </div>
  )
}
