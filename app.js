class TodoApp {
    constructor() {
        this.todoList = document.getElementById('todoList');
        this.todoInput = document.getElementById('todoInput');
        this.todoDate = document.getElementById('todoDate');
        this.todoTime = document.getElementById('todoTime');
        this.addTodoBtn = document.getElementById('addTodo');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        
        // Edit modal elements
        this.editModal = document.getElementById('editModal');
        this.editTodoInput = document.getElementById('editTodoInput');
        this.editTodoDate = document.getElementById('editTodoDate');
        this.editTodoTime = document.getElementById('editTodoTime');
        this.saveEditBtn = document.getElementById('saveEditBtn');
        this.closeModalBtn = document.querySelector('.close-btn');
        
        // Current todo being edited
        this.currentEditTodo = null;

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        this.todoDate.value = today;
        this.editTodoDate.value = today;

        // Event Listeners
        this.addTodoBtn.addEventListener('click', () => this.addTodo());
        this.todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        // Filter event listeners
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => this.filterTodos(btn.dataset.filter));
        });

        // Edit modal event listeners
        this.saveEditBtn.addEventListener('click', () => this.saveEditedTodo());
        this.closeModalBtn.addEventListener('click', () => this.closeEditModal());

        this.loadTodos();

        // Request notification permission on initialization
        this.requestNotificationPermission();

        // Set up a periodic check for due tasks every minute
        this.notificationInterval = setInterval(() => this.checkDueTasks(), 60000);
    }

    addTodo() {
        const todoText = this.todoInput.value.trim();
        if (!todoText) return;

        const todo = {
            id: Date.now(),
            text: todoText,
            completed: false,
            date: this.todoDate.value || null,
            time: this.todoTime.value || null
        };

        if (todo.date && todo.time) {
            this.requestNotificationPermission();
        }

        this.renderTodo(todo);
        this.saveTodo(todo);
        
        // Reset inputs
        this.todoInput.value = '';
        const today = new Date().toISOString().split('T')[0];
        this.todoDate.value = today;
        this.todoTime.value = '';
    }

    renderTodo(todo) {
        const todoItem = document.createElement('div');
        todoItem.classList.add('todo-item');
        todoItem.dataset.id = todo.id;
        
        // Check if the task is overdue
        const isOverdue = this.isTaskOverdue(todo);
        if (isOverdue) {
            todoItem.classList.add('overdue');
        }

        // Create date display string
        const dateString = todo.date ? this.formatDateString(todo.date, todo.time) : '';
        
        todoItem.innerHTML = `
            <input type="checkbox" ${todo.completed ? 'checked' : ''}>
            <div>
                <label>${todo.text}</label>
                ${dateString ? `<div class="todo-date">${dateString}</div>` : ''}
            </div>
            <div class="todo-actions">
                <button class="edit-btn">✏️</button>
                <button class="delete-btn">🗑️</button>
            </div>
        `;

        const checkbox = todoItem.querySelector('input[type="checkbox"]');
        const deleteBtn = todoItem.querySelector('.delete-btn');
        const editBtn = todoItem.querySelector('.edit-btn');

        checkbox.addEventListener('change', () => this.toggleTodo(todo.id));
        deleteBtn.addEventListener('click', () => this.deleteTodo(todo.id));
        editBtn.addEventListener('click', () => this.openEditModal(todo));

        if (todo.completed) {
            todoItem.classList.add('completed');
        }

        this.todoList.appendChild(todoItem);
    }

    toggleTodo(id) {
        const todos = this.getTodos();
        const todo = todos.find(t => t.id === id);
        todo.completed = !todo.completed;
        
        const todoItem = this.todoList.querySelector(`[data-id="${id}"]`);
        todoItem.classList.toggle('completed');
        
        this.saveTodos(todos);
    }

    deleteTodo(id) {
        const todoItem = this.todoList.querySelector(`[data-id="${id}"]`);
        todoItem.style.animation = 'fadeOut 0.3s ease';
        
        setTimeout(() => {
            todoItem.remove();
            const todos = this.getTodos().filter(t => t.id !== id);
            this.saveTodos(todos);
        }, 300);
    }

    openEditModal(todo) {
        this.currentEditTodo = todo;
        this.editTodoInput.value = todo.text;
        this.editTodoDate.value = todo.date || new Date().toISOString().split('T')[0];
        this.editTodoTime.value = todo.time || '';
        this.editModal.style.display = 'block';
    }

    saveEditedTodo() {
        if (!this.currentEditTodo) return;

        const newText = this.editTodoInput.value.trim();
        if (!newText) return;

        const todos = this.getTodos();
        const todoToEdit = todos.find(t => t.id === this.currentEditTodo.id);
        
        if (todoToEdit) {
            todoToEdit.text = newText;
            todoToEdit.date = this.editTodoDate.value || null;
            todoToEdit.time = this.editTodoTime.value || null;
            this.saveTodos(todos);

            // Update the rendered todo
            const todoItem = this.todoList.querySelector(`[data-id="${this.currentEditTodo.id}"]`);
            if (todoItem) {
                const label = todoItem.querySelector('label');
                const dateEl = todoItem.querySelector('.todo-date');
                
                // Update text
                label.textContent = newText;

                // Update date/time display
                const dateString = todoToEdit.date ? this.formatDateString(todoToEdit.date, todoToEdit.time) : '';
                if (dateEl) {
                    dateEl.textContent = dateString;
                } else if (dateString) {
                    const dateDiv = document.createElement('div');
                    dateDiv.classList.add('todo-date');
                    dateDiv.textContent = dateString;
                    label.after(dateDiv);
                }

                // Check and update overdue status
                todoItem.classList.remove('overdue');
                if (this.isTaskOverdue(todoToEdit)) {
                    todoItem.classList.add('overdue');
                }
            }
        }

        this.closeEditModal();
    }

    closeEditModal() {
        this.editModal.style.display = 'none';
        this.currentEditTodo = null;
    }

    filterTodos(filter) {
        // Remove active class from all filter buttons
        this.filterBtns.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to the clicked button
        const activeBtn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        const todoItems = this.todoList.querySelectorAll('.todo-item');
        todoItems.forEach(item => {
            const isCompleted = item.classList.contains('completed');
            
            switch(filter) {
                case 'all':
                    item.style.display = 'flex';
                    break;
                case 'active':
                    item.style.display = !isCompleted ? 'flex' : 'none';
                    break;
                case 'completed':
                    item.style.display = isCompleted ? 'flex' : 'none';
                    break;
            }
        });
    }

    isTaskOverdue(todo) {
        // Only consider overdue for non-completed tasks
        if (todo.completed) return false;
        
        if (!todo.date) return false;

        const taskDate = new Date(`${todo.date}T${todo.time || '23:59'}`);
        const now = new Date();
        
        return taskDate < now;
    }

    formatDateString(date, time) {
        // Create a formatted date string
        const taskDate = new Date(`${date}T${time || '00:00'}`);
        const options = { 
            month: 'short', 
            day: 'numeric', 
            hour: time ? '2-digit' : undefined, 
            minute: time ? '2-digit' : undefined 
        };
        return taskDate.toLocaleString('en-US', options);
    }

    loadTodos() {
        const todos = this.getTodos();
        todos.forEach(todo => this.renderTodo(todo));
    }

    getTodos() {
        return JSON.parse(localStorage.getItem('todos') || '[]');
    }

    saveTodo(todo) {
        const todos = this.getTodos();
        todos.push(todo);
        this.saveTodos(todos);
    }

    saveTodos(todos) {
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    requestNotificationPermission() {
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notifications");
            return;
        }

        if (Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }

    checkDueTasks() {
        if (Notification.permission !== "granted") return;

        const todos = this.getTodos();
        const now = new Date();

        todos.forEach(todo => {
            // Skip completed or tasks without date/time
            if (todo.completed || !todo.date || !todo.time) return;

            const taskDate = new Date(`${todo.date}T${todo.time}`);
            
            // Check if task is due within the next minute
            const timeDiff = taskDate.getTime() - now.getTime();
            if (timeDiff > 0 && timeDiff <= 60000) {
                this.sendTaskNotification(todo);
            }
        });
    }

    sendTaskNotification(todo) {
        if (Notification.permission !== "granted") return;

        const options = {
            body: todo.text,
            icon: 'path/to/icon.png', // Optional: add an app icon
            tag: `todo-${todo.id}` // Unique identifier to prevent duplicate notifications
        };

        new Notification('Task Due Soon', options);
    }

    destroy() {
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    const todoApp = new TodoApp();

    // Optional: Clean up on page unload
    window.addEventListener('beforeunload', () => {
        todoApp.destroy();
    });
});