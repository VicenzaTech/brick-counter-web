Nguyên tắc chung
Không dùng Markdown trong code comment và tài liệu nội bộ.
Không dùng emoji trong code, comment và commit message.
Giữ code đơn giản, dễ đọc, dễ hiểu theo KISS.
Chỉ implement khi thực sự cần theo YAGNI.
Tránh lặp lại logic, tuân thủ DRY.
Ưu tiên tính rõ ràng hơn sự thông minh.

Công nghệ và phạm vi
Front-end và back-end đều dùng TypeScript (TS/TSX).
Sử dụng Next.js theo hướng fullstack.
Ưu tiên các tính năng chuẩn của Next.js trước khi dùng thư viện ngoài.
Không thêm dependency nếu không có lý do rõ ràng.

Kiến trúc và tổ chức mã nguồn
Áp dụng lập trình hướng đối tượng khi phù hợp, không lạm dụng.
Cấu trúc module rõ ràng theo domain, không theo kỹ thuật thuần túy.
Tách biệt rõ các tầng:

UI (component, page)

Application / Service (xu ly nghiep vu)

Domain / Model

Infrastructure (API, database, external service)

Front-end không chứa logic nghiệp vụ phức tạp.
Logic dùng chung phải được đưa vào service hoặc hook riêng.
Mỗi dữ liệu chỉ có một nguồn duy nhất (single source of truth).
Giảm coupling giữa các module, tăng tính tái sử dụng.
Tên file, biến, hàm, class phải rõ ràng, nhất quán, không viết tắt mơ hồ.

Next.js conventions
Page và route chỉ đóng vai trò điều hướng và kết nối dữ liệu.
Component UI chỉ tập trung render, không xử lý nghiệp vụ.
Server Action / API Route chỉ làm nhiệm vụ orchestration, không chứa logic phức tạp.
Không gọi trực tiếp database từ component UI.

TypeScript
Bắt buộc dùng type hoặc interface, không dùng any.
Ưu tiên type an toàn hơn là linh hoạt.
Không dùng type quá tổng quát gây mất kiểm soát dữ liệu.
Luôn validate dữ liệu từ bên ngoài trước khi dùng.

SOLID
Tuân thủ đầy đủ năm nguyên tắc SOLID.
Single Responsibility: mỗi component, service chỉ có một nhiệm vụ.
Open/Closed: mở rộng bằng cách thêm, không sửa code cũ.
Liskov Substitution: class con thay thế được class cha.
Interface Segregation: interface nhỏ, tập trung đúng một mục đích.
Dependency Inversion: phụ thuộc vào abstraction, không phụ thuộc implementation.

Bất đồng bộ và an toàn
Xử lý async/await rõ ràng, không chain promise khó đọc.
Tránh race condition khi gọi API, ghi database hoặc update state.
Không dựa vào thứ tự thực thi ngầm định.
Luôn kiểm soát trạng thái loading, success, error.

State management
Chỉ dùng state global khi thật sự cần.
Ưu tiên state cục bộ và props.
Không để state trùng lặp giữa nhiều nơi.

Error handling và validation
Mọi input từ user hoặc API đều phải validate.
Sử dụng try-catch cho các thao tác có thể lỗi.
Không swallow error, luôn log hoặc trả lỗi rõ ràng.
Thông báo lỗi rõ ràng cho front-end, không leak thông tin nhạy cảm.

Comment và tài liệu
Comment bằng tiếng Việt không dấu.
Comment giải thích lý do, không mô tả lại code.
Không comment cho những đoạn code đã quá hiển nhiên.

Cấu hình
Tập trung cấu hình ở file config (config.ts hoặc tương đương).
Không hardcode giá trị môi trường trong code.
Sử dụng biến môi trường cho các thông tin nhạy cảm.

Testing và chất lượng code
Ưu tiên test cho logic nghiệp vụ quan trọng.
Code phải đọc được trước khi chạy được.
Refactor khi thấy code bắt đầu khó hiểu.