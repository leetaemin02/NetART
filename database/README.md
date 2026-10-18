# MongoDB cho NÉT ART

Phần này triển khai thiết kế trong `THIET_KE_HE_THONG_BAN_TRANH.md`. Backend hiện tại vẫn phục vụ trang HTML tĩnh; các endpoint API và trang quản trị chưa được xây dựng.

1. Cài MongoDB Community Server hoặc tạo MongoDB Atlas cluster. MongoDB local cần đang chạy ở cổng `27017`.
2. Chạy `npm install` trong thư mục dự án.
3. Sao chép `.env.example` thành `.env`, thay `MONGODB_URI` và `MONGODB_DB_NAME` cho phù hợp. Đối với Atlas, cần kết nối mạng, Database User và IP Access List phù hợp.
4. Chạy `npm run db:setup`. Script tạo hoặc cập nhật schema validation và indexes, tạo `artist_profile` cùng `site_settings` mặc định nếu chưa tồn tại. Chạy lại không xóa dữ liệu có sẵn.
5. Điền `ADMIN_FULL_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (tối thiểu 12 ký tự) trong `.env`, rồi chạy `npm run db:admin` để tạo tài khoản quản trị đầu tiên. Xóa `ADMIN_PASSWORD` khỏi `.env` sau khi dùng.

Các collection mặc định: `admins`, `artworks`, `categories`, `artist_profile`, `site_settings`. Khi triển khai biểu mẫu tư vấn, chạy `npm run db:setup -- --with-inquiries` để thêm `inquiries` và indexes tương ứng.

`artist_profile` và `site_settings` sử dụng `singletonKey: 'main'` để truy xuất và `upsert` một bản ghi ổn định. Các ảnh được lưu dưới dạng URL và publicId; không lưu ảnh nhị phân trong MongoDB. Không tự thêm các collection giỏ hàng, đơn hàng hay thanh toán.

**Các kiểm tra thuộc logic backend, không chỉ ở MongoDB:** trước khi publish, tranh phải có đúng một ảnh chính, thuộc danh mục tồn tại, và `showPrice=true` yêu cầu `price` hợp lệ. Không trả tranh `draft` hoặc `hidden` từ API công khai. Không xóa danh mục đang được tranh sử dụng. MongoDB không tự kiểm tra quan hệ tham chiếu `categoryId`.

**Kiểm tra kết nối:** có thể dùng MongoDB Compass kết nối bằng cùng URI, mở database `net_art_gallery` và xem Collections / Indexes / Validation. Khi chưa cấu hình `.env` hoặc MongoDB server/Atlas chưa truy cập được, `db:setup` sẽ báo lỗi và không thể tạo database thực tế.

## API giai đoạn đầu

Chạy `npm run dev` rồi gọi `GET /api/health` để xác nhận kết nối MongoDB. Các API công khai: `GET /api/categories`, `GET /api/artist`, `GET /api/site-settings/public`, `GET /api/artworks` và `GET /api/artworks/:slug`. Danh sách tranh hỗ trợ `q`, `categoryId`, `material`, `surface`, `style`, `subject`, `orientation`, `saleStatus`, `color`, `yearCreated`, `minPrice`, `maxPrice`, `sort`, `page`, `limit`. Chỉ hiển thị tranh `published`.

API quản trị hiện có: `POST /api/admin/auth/login` với JSON `{ "email": "...", "password": "..." }`, `POST /api/admin/auth/logout`, `GET /api/admin/dashboard`. Đăng nhập trả cookie HttpOnly cho cùng origin. Các session hiện lưu trong bộ nhớ server và sẽ hết hiệu lực khi server khởi động lại. Chỉ dùng HTTPS khi triển khai công khai; cần thêm rate limiting, CSRF protection và session store lâu dài trước khi public trang quản trị.

Phần upload ảnh trực tiếp và thay toàn bộ dữ liệu minh họa `data.js` của trang chủ/catalog bằng API còn nằm ở các giai đoạn tiếp theo.

## Quản lý họa sĩ

Mở `/admin.html`, đăng nhập rồi chọn tab **Thông tin họa sĩ**. Tại đây có thể sửa tên, nghệ danh, giới thiệu, tiểu sử, chuyên môn, địa điểm, liên hệ, URL ảnh đại diện/bìa; thêm, xóa hoặc sắp xếp ảnh trình chiếu bằng cách sửa từng dòng URL. Ảnh trên `/artist.html` đổi sau mỗi 5 giây nếu có từ hai ảnh. Chọn các tranh `published` để đưa vào phần tác phẩm tiêu biểu; tranh bị ẩn hoặc chuyển về bản nháp sẽ tự động không hiện ở trang công khai. Không cần nhập dữ liệu thật ngay từ đầu.

API quản trị được bảo vệ bởi session: `GET /api/admin/artist`, `PATCH /api/admin/artist`. API công khai `GET /api/artist` trả thêm `featuredArtworks` đã lọc trạng thái. Ảnh lưu bằng URL, tối đa 30 ảnh trình chiếu; chỉ có một hồ sơ họa sĩ. Sau khi cập nhật mã nguồn, **chạy lại `npm run db:setup`** để áp dụng MongoDB validator mới cho `galleryImages` và `featuredArtworkIds` mà không xóa dữ liệu cũ.

## Trang quản trị (bản đầu)

Sau khi chạy `npm run db:setup` và `npm run db:admin`, khởi động bằng `npm run dev`, mở `http://127.0.0.1:3000/admin.html`. Đăng nhập bằng tài khoản vừa tạo. Quản trị có thể thêm/sửa/xóa danh mục, thêm/sửa/xóa tranh, đổi trạng thái bán và công khai tranh, xem thống kê. Cần tạo danh mục trước khi tạo tranh. Tranh mới mặc định là `draft`; để chuyển sang `published` cần có ít nhất một URL ảnh, dòng đầu là ảnh chính. Xóa danh mục đang có tranh sẽ bị từ chối.

Các ảnh hiện nhập bằng URL đã được lưu ở dịch vụ ảnh hoặc hosting; chức năng upload Cloudinary chưa có. Trang khách hiện vẫn sử dụng `data.js` minh họa nên tranh vừa nhập chưa tự hiện trên trang chủ/catalog cũ. API khách `GET /api/artworks` đã đọc tranh `published` từ MongoDB. Phiên đăng nhập chỉ lưu trong RAM nên khi khởi động lại server phải đăng nhập lại. Cần bổ sung giới hạn đăng nhập, CSRF token và lưu session bền vững trước khi đưa admin lên internet.
