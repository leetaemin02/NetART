# NÉT ART — Website giới thiệu và đặt tranh qua Zalo

Chạy `npm run dev`, mở http://127.0.0.1:3000. Không cần cài package. Có thể mở `index.html` trực tiếp; sao chép clipboard có phương án chọn văn bản thủ công khi trình duyệt không cho phép.

## Chức năng hiện có

- Trang chủ: giữ bảng màu kem, nâu đất và Newsreader/Manrope từ design system Stitch.
- `catalog.html`: tìm kiếm không dấu, lọc phối hợp chủ đề/chất liệu/khoảng giá/yêu thích, sắp xếp tên hoặc giá, xóa bộ lọc. Điều kiện được lưu trên URL để chia sẻ.
- `artwork.html?id=mien-yen`: trang riêng cho từng tranh, ảnh phóng to, mô tả, mã, chất liệu, kích thước và tác phẩm liên quan. Có trạng thái không tìm thấy với ID sai.
- `artist.html`: giới thiệu Nguyễn Thị Hồng Ngọc, sinh viên Đại học Kiến trúc TP.HCM, ngành Mỹ thuật đô thị và Kiến trúc theo thông tin chủ website cung cấp; phần tác phẩm tiêu biểu đang dùng minh họa.
- Đặt hàng: sao chép lời nhắn chứa tên/mã tranh, mở https://zalo.me/0339667601, khách tự điền và gửi thông tin liên hệ. Trao đổi đặt cọc, giao nhận qua Zalo. Website không tự gửi tin nhắn hoặc xác nhận đơn.
- Yêu thích lưu trên trình duyệt; không có đăng ký, đăng nhập hoặc thanh toán trực tuyến.

## Dữ liệu và giới hạn

Tranh SVG, giá, tên, kích thước và chất liệu đều là minh họa trong `data.js`, chưa phải tác phẩm của Nguyễn Thị Hồng Ngọc. Chưa có ảnh chân dung thật; vị trí chân dung được ghi rõ là chờ cập nhật. Chưa kết nối MongoDB hay dịch vụ lưu ảnh. Không lưu thông tin liên hệ khách hàng trên website.

Thiết kế lấy quy chuẩn qua Stitch MCP từ project 787674073304119694; không sửa project Stitch gốc. Google Fonts cần mạng và có font dự phòng.

## Kiểm tra

`npm run check`: kiểm tra cú pháp. `node scripts/check-flows.cjs`: mô phỏng DOM để kiểm tra logic danh mục, tìm kiếm, lọc kết hợp, sắp xếp, trạng thái rỗng, trang tác giả, chi tiết hợp lệ/không hợp lệ, mở hộp đặt tranh và liên kết tệp. Đây không thay thế kiểm tra trực quan trên browser. Browser trong môi trường làm việc hiện timeout khi truy cập localhost.
