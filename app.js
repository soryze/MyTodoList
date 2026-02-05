// -------------------------
// 1. Import các module cần thiết
// -------------------------

// Import module fs (File System) để đọc và ghi file
// fs là module có sẵn trong Node.js, không cần cài đặt thêm
const fs = require('fs');

// Import module readline có sẵn trong Node.js để đọc input từ Terminal
const readline = require('readline');

// -------------------------
// 2. Khai báo biến và đường dẫn file
// -------------------------

// Tên file JSON để lưu trữ danh sách công việc
const TASKS_FILE = 'tasks.json';

// Mảng chứa danh sách công việc (sẽ được nạp từ file khi khởi động)
// Khởi tạo ban đầu là mảng rỗng, sẽ được cập nhật sau khi đọc file
let todoList = [];

// -------------------------
// 3. Thiết lập readline để đọc input từ Terminal
// -------------------------
  
// Tạo interface để giao tiếp với người dùng qua stdin (bàn phím) và stdout (màn hình)
const rl = readline.createInterface({
  input: process.stdin,   // nơi nhận dữ liệu người dùng nhập
  output: process.stdout  // nơi hiển thị câu hỏi / thông tin cho người dùng
});

// -------------------------
// 4. CÁC HÀM ĐỌC VÀ GHI FILE (PERSISTENCE)
// -------------------------

/**
 * HÀM ĐỌC FILE tasks.json
 * 
 * Cách hoạt động:
 * 1. fs.existsSync(TASKS_FILE): Kiểm tra xem file tasks.json có tồn tại không
 *    - Trả về true nếu file tồn tại
 *    - Trả về false nếu file không tồn tại
 * 
 * 2. Nếu file TỒN TẠI:
 *    - fs.readFileSync(TASKS_FILE, 'utf8'): Đọc toàn bộ nội dung file dưới dạng chuỗi text
 *      + Tham số 1: Tên file cần đọc
 *      + Tham số 2: 'utf8' là encoding (mã hóa) để đọc file dạng text
 *      + Đây là hàm ĐỒNG BỘ (synchronous), nghĩa là chờ đọc xong mới chạy tiếp
 *    
 *    - JSON.parse(fileContent): Chuyển đổi chuỗi JSON thành mảng JavaScript
 *      + Ví dụ: '["Học code","Tập thể dục"]' → ['Học code', 'Tập thể dục']
 *      + Nếu file rỗng hoặc không hợp lệ, sẽ bị lỗi, nên ta dùng try-catch
 * 
 * 3. Nếu file KHÔNG TỒN TẠI:
 *    - Trả về mảng rỗng [] và file sẽ được tạo tự động khi lần đầu ghi
 */
function loadTasks() {
  try {
    // Kiểm tra xem file có tồn tại không
    if (fs.existsSync(TASKS_FILE)) {
      // Đọc nội dung file dưới dạng chuỗi text (UTF-8)
      const fileContent = fs.readFileSync(TASKS_FILE, 'utf8');
      
      // Chuyển đổi chuỗi JSON thành mảng JavaScript
      // Nếu file rỗng, JSON.parse sẽ lỗi, nên ta kiểm tra thêm
      if (fileContent.trim() === '') {
        todoList = [];
      } else {
        todoList = JSON.parse(fileContent);
      }
      
      console.log(`Đã tải ${todoList.length} công việc từ file tasks.json\n`);
    } else {
      // File chưa tồn tại, khởi tạo mảng rỗng
      todoList = [];
      console.log('File tasks.json chưa tồn tại. Bắt đầu với danh sách trống.\n');
    }
  } catch (error) {
    // Nếu có lỗi khi đọc file (ví dụ: JSON không hợp lệ), khởi tạo lại mảng rỗng
    console.error('Lỗi khi đọc file tasks.json:', error.message);
    console.log('Khởi tạo lại với danh sách trống.\n');
    todoList = [];
  }
}

/**
 * HÀM GHI FILE tasks.json
 * 
 * Cách hoạt động:
 * 1. JSON.stringify(todoList, null, 2): Chuyển đổi mảng JavaScript thành chuỗi JSON
 *    - Tham số 1: todoList - mảng cần chuyển đổi
 *    - Tham số 2: null - replacer function (không dùng)
 *    - Tham số 3: 2 - số khoảng trắng để format đẹp (indent)
 *    - Ví dụ: ['Học code', 'Tập thể dục'] → '[\n  "Học code",\n  "Tập thể dục"\n]'
 * 
 * 2. fs.writeFileSync(TASKS_FILE, jsonData, 'utf8'): Ghi chuỗi JSON vào file
 *    - Tham số 1: Tên file cần ghi (tasks.json)
 *    - Tham số 2: Nội dung cần ghi (chuỗi JSON)
 *    - Tham số 3: 'utf8' - encoding để ghi file dạng text
 *    - Đây là hàm ĐỒNG BỘ (synchronous), nghĩa là chờ ghi xong mới chạy tiếp
 *    - Nếu file chưa tồn tại, hàm này sẽ TỰ ĐỘNG TẠO FILE MỚI
 *    - Nếu file đã tồn tại, hàm này sẽ GHI ĐÈ (overwrite) toàn bộ nội dung cũ
 * 
 * 3. try-catch: Bắt lỗi nếu không thể ghi file (ví dụ: không có quyền ghi)
 */
function saveTasks() {
  try {
    // Chuyển đổi mảng JavaScript thành chuỗi JSON với format đẹp (indent 2 spaces)
    const jsonData = JSON.stringify(todoList, null, 2);
    
    // Ghi chuỗi JSON vào file tasks.json
    // Nếu file chưa có, sẽ tự động tạo mới
    // Nếu file đã có, sẽ ghi đè toàn bộ nội dung cũ
    fs.writeFileSync(TASKS_FILE, jsonData, 'utf8');
    
    // Không cần in thông báo ở đây vì sẽ làm rối màn hình
    // Nhưng bạn có thể uncomment dòng dưới để debug nếu cần:
    // console.log('Đã lưu danh sách vào file tasks.json');
  } catch (error) {
    // Nếu có lỗi khi ghi file (ví dụ: không có quyền), in ra thông báo lỗi
    console.error('Lỗi khi lưu file tasks.json:', error.message);
  }
}

// -------------------------
// 5. Các hàm xử lý logic To-Do List
// -------------------------

// Hàm in danh sách công việc ra màn hình với số thứ tự
function printTodoList() {
  console.log('\n--- DANH SÁCH CÔNG VIỆC HIỆN TẠI ---');

  if (todoList.length === 0) {
    console.log('Danh sách hiện đang trống.');
  } else {
    for (let i = 0; i < todoList.length; i++) {
      console.log(`${i + 1}. ${todoList[i]}`);
    }
  }

  console.log('------------------------------------\n');
}
  
// Hàm thêm một công việc mới vào danh sách
function addTodo(newTask) {
  // Thêm công việc mới vào cuối mảng
  todoList.push(newTask);
  
  // QUAN TRỌNG: Sau khi thêm vào mảng, phải lưu ngay vào file để dữ liệu được lưu vĩnh viễn
  // Nếu không gọi saveTasks(), khi tắt app và mở lại, công việc mới sẽ bị mất
  saveTasks();
  
  console.log(`\nĐã thêm công việc mới: "${newTask}"\n`);
}

// -------------------------
// 6. Hàm hiển thị menu và xử lý chọn mục (CLI Loop)
// -------------------------

// Hàm hiển thị menu
function showMenu() {
  console.log('===== ỨNG DỤNG TO-DO LIST (CLI) =====');
  console.log('[1] Xem danh sách công việc');
  console.log('[2] Thêm công việc mới');
  console.log('[3] Thoát');
  console.log('=====================================');
}

// Hàm bắt đầu vòng lặp menu
function startMenuLoop() {
  // Luôn hiển thị menu trước
  showMenu();

  // -----------------------------
  // XỬ LÝ NHẬP LIỆU TỪ NGƯỜI DÙNG
  // -----------------------------
  // rl.question: in ra câu hỏi và CHỜ người dùng nhập rồi nhấn Enter
  // Tham số thứ 2 là một callback function, nhận giá trị người dùng nhập vào (ở đây là biến "answer")
  rl.question('Mời bạn chọn (1, 2, hoặc 3): ', (answer) => {
    // Lưu ý: answer luôn là chuỗi (string), dù người dùng nhập số.

    switch (answer.trim()) { // .trim() để bỏ khoảng trắng thừa
      case '1':
        // Người dùng chọn Xem danh sách
        printTodoList();
        // Sau khi xem xong, gọi lại startMenuLoop() để quay lại menu (vòng lặp)
        startMenuLoop();
        break;

      case '2':
        // Người dùng chọn Thêm công việc mới
        // Tiếp tục hỏi thêm một lần nữa: "Nhập tên công việc"
        rl.question('Nhập tên công việc mới: ', (taskName) => {
          // Ở đây cũng vậy, taskName là chuỗi do người dùng nhập

          const trimmedTask = taskName.trim();

          if (trimmedTask === '') {
            console.log('\nTên công việc không được để trống. Vui lòng thử lại.\n');
          } else {
            addTodo(trimmedTask);
          }

          // Sau khi xử lý xong (dù thành công hay không), quay lại menu
          startMenuLoop();
        });
        break;

      case '3':
        // Người dùng chọn Thoát
        console.log('\nCảm ơn bạn đã sử dụng ứng dụng To-Do List. Hẹn gặp lại!\n');
        // Đóng interface readline để kết thúc chương trình
        rl.close();
        break;

      default:
        // Người dùng nhập không đúng 1, 2, 3
        console.log('\nLựa chọn không hợp lệ. Vui lòng nhập 1, 2 hoặc 3.\n');
        // Quay lại menu để cho nhập lại
        startMenuLoop();
        break;
    }
  });
}
  
// -------------------------
// 7. Chạy chương trình
// -------------------------

// Khi khởi động app, đầu tiên phải đọc dữ liệu từ file tasks.json
// Nếu file chưa có, loadTasks() sẽ tạo mảng rỗng
// Sau khi đọc xong, mới bắt đầu hiển thị menu
loadTasks();

// Bắt đầu vòng lặp menu sau khi đã tải dữ liệu từ file
startMenuLoop();