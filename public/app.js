const App = {
    async init() {
        this.setupEventListeners()
        await this.loadPosts()
    },

    setupEventListeners() {
        document.getElementById('createForm').addEventListener('submit', (e) => {
            e.preventDefault()
            this.handleCreate()
        })

        document.getElementById('postsList').addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-edit')) {
                const postId = e.target.dataset.id
                this.handleEditClick(postId)
            } else if (e.target.classList.contains('btn-delete')) {
                const postId = e.target.dataset.id
                this.handleDeleteClick(postId)
            }
        })

        document.querySelector('.close').addEventListener('click', () => {
            UI.closeModal()
        })

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('modal')
            if (e.target === modal) {
                UI.closeModal()
            }
        })

        document.getElementById('modalBody').addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-cancel')) {
                UI.closeModal()
            }
        })

        document.getElementById('modalBody').addEventListener('submit', (e) => {
            e.preventDefault()
            if (e.target.id === 'editForm') {
                this.handleUpdate()
            } else if (e.target.id === 'deleteForm') {
                this.handleDelete()
            }
        })
    },

    async loadPosts() {
        try {
            const posts = await API.getPosts()
            UI.renderPosts(posts)
        } catch (error) {
            alert(error.message)
        }
    },

    async handleCreate() {
        const title = document.getElementById('createTitle').value.trim()
        const content = document.getElementById('createContent').value.trim()
        const password = document.getElementById('createPassword').value

        if (!title || !content || !password) {
            alert('모든 필드를 입력해주세요.')
            return
        }

        try {
            await API.createPost(title, content, password)
            document.getElementById('createForm').reset()
            await this.loadPosts()
            alert('게시물이 작성되었습니다.')
        } catch (error) {
            alert(error.message)
        }
    },

    async handleEditClick(postId) {
        try {
            const post = await API.getPost(postId)
            UI.renderEditForm(post)
            UI.openModal()
            this.currentEditId = postId
        } catch (error) {
            alert(error.message)
        }
    },

    async handleUpdate() {
        const title = document.getElementById('editTitle').value.trim()
        const content = document.getElementById('editContent').value.trim()
        const password = document.getElementById('editPassword').value

        if (!title || !content || !password) {
            alert('모든 필드를 입력해주세요.')
            return
        }

        try {
            await API.updatePost(this.currentEditId, title, content, password)
            UI.closeModal()
            await this.loadPosts()
            alert('게시물이 수정되었습니다.')
        } catch (error) {
            alert(error.message)
        }
    },

    handleDeleteClick(postId) {
        UI.renderDeleteForm(postId)
        UI.openModal()
        this.currentDeleteId = postId
    },

    async handleDelete() {
        const password = document.getElementById('deletePassword').value

        if (!password) {
            alert('비밀번호를 입력해주세요.')
            return
        }

        try {
            await API.deletePost(this.currentDeleteId, password)
            UI.closeModal()
            await this.loadPosts()
            alert('게시물이 삭제되었습니다.')
        } catch (error) {
            alert(error.message)
        }
    },
}

document.addEventListener('DOMContentLoaded', () => {
    App.init()
})

const API = {
    async getPosts() {
        const response = await fetch('/api/posts')
        if (!response.ok) {
            throw new Error('게시물 목록을 불러오는데 실패했습니다.')
        }
        return await response.json()
    },
    async getPost(id) {
        const response = await fetch(`/api/post/${id}`)
        if (!response.ok) {
            throw new Error('게시물을 불러오는데 실패했습니다.')
        }
        return await response.json()
    },
    async createPost(title, content, password) {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, content, password }),
        })
        if (!response.ok) {
            throw new Error('게시물 작성에 실패했습니다.')
        }
        return await response.json()
    },
    async updatePost(id, title, content, password) {
        const response = await fetch(`/api/posts/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, content, password }),
        })
        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || '게시물 수정에 실패했습니다.')
        }
        return await response.json()
    },
    async deletePost(id, password) {
        const response = await fetch(`/api/posts/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password }),
        })
        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || '게시물 삭제에 실패했습니다.')
        }
        return await response.json()
    },
}

const UI = {
    renderPosts(posts) {
        const postsList = document.getElementById('postsList')

        if (posts.length === 0) {
            postsList.innerHTML = '<p class="empty-message">게시물이 없습니다.</p>'
            return
        }

        postsList.innerHTML = posts
            .sort((a, b) => b.id - a.id)
            .map(
                (post) => `
                <div class="post-item" data-id="${post.id}">
                    <h3>${this.escapeHtml(post.title)}</h3>
                    <p>${this.escapeHtml(post.content)}</p>
                    <small>${this.formatDate(post.created_at)}</small>
                    <div class="post-actions">
                        <button class="btn-edit" data-id="${post.id}">수정</button>
                        <button class="btn-delete" data-id="${post.id}">삭제</button>
                    </div>
                </div>
            `
            )
            .join('')
    },

    renderEditForm(post) {
        const modalBody = document.getElementById('modalBody')
        modalBody.innerHTML = `
            <h2>게시물 수정</h2>
            <form id="editForm">
                <input type="text" id="editTitle" value="${this.escapeHtml(post.title)}" required>
                <textarea id="editContent" rows="4" required>${this.escapeHtml(post.content)}</textarea>
                <input type="password" id="editPassword" placeholder="비밀번호" required>
                <button type="submit">수정</button>
                <button type="button" class="btn-cancel">취소</button>
            </form>
        `
    },

    renderDeleteForm(postId) {
        const modalBody = document.getElementById('modalBody')
        modalBody.innerHTML = `
            <h2>게시물 삭제</h2>
            <p>삭제하시려면 비밀번호를 입력하세요.</p>
            <form id="deleteForm">
                <input type="password" id="deletePassword" placeholder="비밀번호" required>
                <button type="submit">삭제</button>
                <button type="button" class="btn-cancel">취소</button>
            </form>
        `
    },

    openModal() {
        document.getElementById('modal').style.display = 'block'
    },

    closeModal() {
        document.getElementById('modal').style.display = 'none'
    },

    escapeHtml(text) {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    },

    formatDate(dateString) {
        const date = new Date(dateString)
        return date.toLocaleString('ko-KR')
    },
}
