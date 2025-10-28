import express from 'express' // Express 프레임워크
import sqlite3 from 'sqlite3' // SQLite3(파일 기반 경량 DB) 모듈
import path from 'path' // 파일 및 디렉토리 경로 조작을 위한 path 모듈
import bcrypt from 'bcrypt' // 비밀번호 해싱을 위한 bcrypt 모듈
import morgan from 'morgan' // 요청 로깅을 위한 morgan 모듈
import { fileURLToPath } from 'url' // __dirname 대체용(ESM 환경)

const app = express() // Express 애플리케이션 생성

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename) // __dirname 대체

app.use(express.json()) // 미들웨어: JSON 요청 파싱
app.use(express.urlencoded({ extended: true })) // 미들웨어: URL-encoded 요청 파싱
app.use(express.static('public')) // 정적 파일 제공 (index.html, ejs 등 템플릿을 사용하지 않고 index.html에서 API 호출)
app.use(morgan('dev')) // 미들웨어: 요청 로깅

const DB_PATH = path.join(__dirname, 'database.sqlite') // DB 경로

const db = new sqlite3.Database(DB_PATH, (err) => {
    // 데이터베이스 연결
    if (err) {
        // DB 커넥션 시 에러 핸들링
        console.error('Error opening database:', err)
    } else {
        console.log('Database opened successfully')
    }
})

db.serialize(() => {
    // DB 초기화: posts 테이블 생성
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)
})

// GET / (홈)에서 index.html 정적으로 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// GET /posts: 모든 게시물 조회
app.get('/api/posts', (req, res) => {
    db.all('SELECT id, title, content, created_at FROM posts', [], (err, rows) => {
        // 모든 게시글 조회 후 응답(배열로 반환 => rows)
        if (err) {
            res.status(500).json({ error: err.message }) // 에러 시 500(Internal Server Error) 응답
            return
        }

        res.json(rows) // 성공 시 게시글 목록 응답
    })
})

// GET /post/:id: 특정 게시물 조회
app.get('/api/post/:id', (req, res) => {
    const { id } = req.params

    db.get('SELECT id, title, content, created_at FROM posts WHERE id = ?', [id], (err, row) => {
        // where 절로 특정 게시글 조회
        if (err) {
            res.status(500).json({ error: err.message })
            return
        }

        if (!row) {
            res.status(404).json({ error: 'Post not found' }) // 게시글이 없을 때 404(Not Found) 응답
            return
        }

        res.json(row)
    })
})

// POST /posts: 새 게시물 생성
app.post('/api/posts', (req, res) => {
    const { title, content, password } = req.body
    const hashedPassword = bcrypt.hashSync(password, 10) // 비밀번호는 해시화하여 저장해야함

    db.run('INSERT INTO posts (title, content, password) VALUES (?, ?, ?)', [title, content, hashedPassword], (err) => {
        // 게시글 삽입
        if (err) {
            res.status(500).json({ error: err.message })
            return
        }

        res.status(201).json({ message: 'Post created successfully' }) // 성공 시 201(Created) 응답
    })
})

// PUT /posts/:id: 게시물 수정
app.put('/api/posts/:id', (req, res) => {
    const { id } = req.params
    const { title, content, password } = req.body

    db.get('SELECT password FROM posts WHERE id = ?', [id], (err, row) => {
        // 수정할 게시글이 존재하는지 확인
        if (err) {
            res.status(500).json({ error: err.message })
            return
        }

        if (!row) {
            res.status(404).json({ error: 'Post not found' })
            return
        }

        if (!bcrypt.compareSync(password, row.password)) {
            res.status(403).json({ error: 'Incorrect password' }) // 비밀번호 불일치 시 403(Forbidden) 응답
            return
        }

        db.run('UPDATE posts SET title = ?, content = ? WHERE id = ?', [title, content, id], (err) => {
            // 게시글 수정
            if (err) {
                res.status(500).json({ error: err.message })
                return
            }
            res.json({ message: 'Post updated successfully' })
        })
    })
})

// DELETE /posts/:id: 게시물 삭제
app.delete('/api/posts/:id', (req, res) => {
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

        if (!bcrypt.compareSync(password, row.password)) {
            res.status(403).json({ error: 'Incorrect password' })
            return
        }

        db.run('DELETE FROM posts WHERE id = ?', [id], (err) => {
            if (err) {
                res.status(500).json({ error: err.message })
                return
            }
            res.json({ message: 'Post deleted successfully' })
        })
    })
})

// 3000번 포트를 할당하여 서버 시작
app.listen(3000, () => {
    console.log('Server is running on port 3000')
})
