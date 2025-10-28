import express from 'express'
import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.json()) // 미들웨어: JSON 요청 파싱
app.use(express.urlencoded({ extended: true })) // 미들웨어: URL-encoded 요청 파싱
app.use(express.static('public')) // 정적 파일 제공 (index.html, ejs 등 템플릿을 사용하지 않고 index.html에서 API 호출)

const DB_PATH = path.join(__dirname, 'database.sqlite') // DB 경로

const db = new sqlite3.Database(DB_PATH, (err) => { // 데이터베이스 연결
    if (err) {
        console.error('Error opening database:', err)
    } else {
        console.log('Database opened successfully')
    }
})

db.serialize(() => { // DB 초기화: posts 테이블 생성
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/api/posts', (req, res) => { // GET /posts: 모든 게시물 조회
    db.all('SELECT id, title, content, created_at FROM posts', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message })
            return
        }
        res.json(rows)
    })
})

app.get('/api/post/:id', (req, res) => { // GET /post/:id: 특정 게시물 조회
    const { id } = req.params

    db.get('SELECT id, title, content, created_at FROM posts WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message })
            return
        }
        if (!row) {
            res.status(404).json({ error: 'Post not found' })
            return
        }
        res.json(row)
    })
})

app.post('/api/posts', (req, res) => { // POST /posts: 새 게시물 생성
    const { title, content, password } = req.body

    db.run('INSERT INTO posts (title, content, password) VALUES (?, ?, ?)', [title, content, password], function (err) {
        if (err) {
            res.status(500).json({ error: err.message })
            return
        }
        res.status(201).json({ id: this.lastID })
    })
})

app.put('/api/posts/:id', (req, res) => { // PUT /posts/:id: 게시물 수정
    const { id } = req.params
    const { title, content, password } = req.body

    db.get('SELECT password FROM posts WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message })
            return
        }
        if (!row) {
            res.status(404).json({ error: 'Post not found' })
            return
        }
        if (row.password !== password) {
            res.status(403).json({ error: 'Incorrect password' })
            return
        }
        db.run('UPDATE posts SET title = ?, content = ? WHERE id = ?', [title, content, id], function (err) {
            if (err) {
                res.status(500).json({ error: err.message })
                return
            }
            res.json({ message: 'Post updated successfully' })
        })
    })
})

app.delete('/api/posts/:id', (req, res) => { // DELETE /posts/:id: 게시물 삭제
    const { id } = req.params
    const { password } = req.body

    db.get('SELECT password FROM posts WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message })
            return
        }

        if (!row) {
            res.status(404).json({ error: 'Post not found' })
            return
        }

        if (row.password !== password) {
            res.status(403).json({ error: 'Incorrect password' })
            return
        }

        db.run('DELETE FROM posts WHERE id = ?', [id], function (err) {
            if (err) {
                res.status(500).json({ error: err.message })
                return
            }
            res.json({ message: 'Post deleted successfully' })
        })
    })
})

app.listen(3000, () => {
    console.log('Server is running on port 3000')
})
