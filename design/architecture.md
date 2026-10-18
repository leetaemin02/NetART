# Phạm vi hiện tại và hướng triển khai

## Quyết định của chủ website

- MongoDB là database sẽ dùng; không dùng PostgreSQL.
- Khách mua không cần đăng ký/đăng nhập. Chưa tích hợp Firebase Authentication.
- Khách xem tranh, chọn đặt hàng và trao đổi qua Zalo 0339667601. Tiền cọc, giá, tình trạng và giao nhận do hai bên xác nhận trực tiếp.
- Hiện ưu tiên hoàn thiện giao diện và các chức năng chính trên mã HTML/CSS/JS đang có. Chưa chuyển framework hoặc triển khai backend.

## Đã triển khai

Trang chủ, danh mục và bộ lọc kết hợp, trang chi tiết có ảnh phóng to và tác phẩm liên quan, trang giới thiệu Nguyễn Thị Hồng Ngọc và phần tác phẩm tiêu biểu. Dữ liệu minh họa dùng chung trong data.js. Yêu thích chỉ lưu tại trình duyệt.

Đặt hàng mở hộp hướng dẫn và lời nhắn theo tác phẩm. Khách sao chép, mở Zalo và tự gửi. Mở Zalo không đồng nghĩa đơn hàng đã được xác nhận. Không gửi/lưu tên, số điện thoại hoặc địa chỉ tại website.

## Khi kết nối dữ liệu thật

Next.js + React + TypeScript trên Node.js, MongoDB Atlas + Mongoose là hướng phù hợp đã đề xuất. MongoDB lưu catalog; có thể dùng Cloudinary cho ảnh sau khi chọn tài khoản và hạn mức phù hợp. Không mặc định bật dịch vụ có phí.

artworks: slug unique, title, description, category, medium, dimensions, images (provider, publicId/storagePath, url, alt), priceVnd hoặc giá liên hệ, availability, featured, createdAt. Artist lưu tên, thông tin học tập đã cung cấp, chân dung và mô tả được xác nhận.

Không cần xây users, giỏ hàng, cổng thanh toán, webhook hay tự động giữ chỗ ở giai đoạn chỉ trao đổi qua Zalo. Khi cần quản lý trạng thái tranh/đơn trong hệ thống, bổ sung quy trình quản trị có bảo vệ quyền sửa dữ liệu; không công khai API cập nhật catalog. Nếu thêm form liên hệ sau này, phải có API lưu thật, xác nhận nhận thông tin, chống spam và cách quản lý yêu cầu; không hiển thị gửi thành công khi chưa lưu được.
