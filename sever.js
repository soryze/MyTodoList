require('dotenv').config();

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Khởi tạo Supabase client từ biến môi trường
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('⚠️  Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong file .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Hàm tránh XSS khi hiển thị text lên HTML
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// GET / — Trang chủ: đọc danh sách từ bảng `tasks` và hiển thị HTML
app.get('/', async (req, res) => {
  let tasks = [];
  let dbError = null;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    tasks = data || [];
  } catch (err) {
    console.error('Lỗi khi lấy danh sách tasks từ Supabase:', err.message);
    dbError = err.message;
  }

  const listItems = tasks
    .map(
      (task) => `
        <li class="todo-item">
          <span class="todo-text">${escapeHtml(task.job_name || '')}</span>
          <form class="delete-form" method="GET" action="/delete">
            <input type="hidden" name="id" value="${task.id}">
            <button class="delete-btn" type="submit">Xóa</button>
          </form>
        </li>
      `
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>To-Do List (Supabase)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(135deg, #4f46e5, #06b6d4);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0f172a;
    }

    .card {
      background: #ffffff;
      width: 100%;
      max-width: 480px;
      border-radius: 16px;
      box-shadow:
        0 10px 25px rgba(15, 23, 42, 0.25),
        0 0 0 1px rgba(148, 163, 184, 0.25);
      padding: 24px 24px 20px;
    }

    .card-header {
      margin-bottom: 16px;
    }

    .card-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .card-subtitle {
      font-size: 0.9rem;
      color: #6b7280;
    }

    .error-box {
      margin-top: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      background-color: #fef2f2;
      color: #b91c1c;
      font-size: 0.85rem;
      border: 1px solid #fecaca;
    }

    .form-row {
      display: flex;
      gap: 8px;
      margin: 16px 0 12px;
    }

    .input-text {
      flex: 1;
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid #cbd5f5;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
      background-color: #f9fafb;
    }

    .input-text:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
      background-color: #ffffff;
    }

    .add-btn {
      padding: 10px 18px;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: #ffffff;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 6px 14px rgba(22, 163, 74, 0.4);
      transition: transform 0.1s ease, box-shadow 0.1s ease, opacity 0.1s ease;
    }

    .add-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 20px rgba(22, 163, 74, 0.5);
      opacity: 0.95;
    }

    .add-btn:active {
      transform: translateY(0);
      box-shadow: 0 4px 10px rgba(22, 163, 74, 0.3);
    }

    .todo-list {
      list-style: none;
      margin-top: 8px;
      max-height: 320px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .todo-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
      background-color: #f9fafb;
      font-size: 0.95rem;
      margin-bottom: 6px;
      gap: 8px;
    }

    .todo-item:nth-child(odd) {
      background-color: #eff6ff;
    }

    .todo-text {
      flex: 1;
      word-break: break-word;
    }

    .delete-form {
      margin: 0;
    }

    .delete-btn {
      border: none;
      background: #ef4444;
      color: #ffffff;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 3px 8px rgba(239, 68, 68, 0.4);
      transition: background-color 0.1s ease, box-shadow 0.1s ease, transform 0.1s ease;
    }

    .delete-btn:hover {
      background-color: #dc2626;
      box-shadow: 0 4px 10px rgba(239, 68, 68, 0.5);
      transform: translateY(-0.5px);
    }

    .delete-btn:active {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
    }

    .empty-text {
      font-size: 0.9rem;
      color: #9ca3af;
      text-align: center;
      padding: 16px 8px 8px;
    }

    .footer {
      margin-top: 10px;
      font-size: 0.8rem;
      color: #9ca3af;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-header">
      <div class="card-title">To-Do List</div>
      <div class="card-subtitle">
        Lưu dữ liệu bằng Supabase (PostgreSQL).
      </div>
      ${
        dbError
          ? `<div class="error-box">Có lỗi khi đọc dữ liệu Supabase: ${escapeHtml(dbError)}</div>`
          : ''
      }
    </div>

    <form class="form-row" method="GET" action="/add">
      <input
        class="input-text"
        type="text"
        name="job"
        placeholder="Ví dụ: Học Supabase, học Express..."
        autocomplete="off"
        required
      />
      <button class="add-btn" type="submit">Thêm</button>
    </form>

    ${
      tasks.length === 0
        ? '<div class="empty-text">(Chưa có công việc nào. Hãy thêm việc đầu tiên!)</div>'
        : `<ul class="todo-list">${listItems}</ul>`
    }

    <div class="footer">
      Trình duyệt → Express → Supabase (PostgreSQL) → trả HTML.
    </div>
  </div>
</body>
</html>`;

  res.send(html);
});

// GET /add?job=... — thêm công việc mới vào bảng `tasks`
app.get('/add', async (req, res) => {
  const job = (req.query.job || '').trim();

  if (job) {
    try {
      const { error } = await supabase.from('tasks').insert({ job_name: job });
      if (error) throw error;
    } catch (err) {
      console.error('Lỗi khi thêm task mới vào Supabase:', err.message);
      // Vẫn redirect về trang chủ, lỗi sẽ hiển thị trong console server
    }
  }

  res.redirect('/');
});

// GET /delete?id=... — xóa một công việc theo id
app.get('/delete', async (req, res) => {
  const id = parseInt(req.query.id, 10);

  if (!Number.isNaN(id)) {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Lỗi khi xóa task trên Supabase:', err.message);
    }
  }

  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});
