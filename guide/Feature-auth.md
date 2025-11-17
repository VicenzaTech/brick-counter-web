# Feature: Auth, Session & RBAC (frontend)

Tài liệu này mô tả luồng auth, session và RBAC đã được triển khai trong frontend, tập trung vào:

- Store Zustand (`store/auth.store.ts`)
- HTTP client (`lib/http/http.ts`)
- AuthProvider (`lib/auth/AuthProvider.tsx` + `app/layout.tsx`)
- RBAC helpers (`lib/auth/*`)
- Cách sử dụng trong page / component

---

## 1. Auth store với Zustand

**File:** `store/auth.store.ts`

### 1.1. Kiểu dữ liệu chính

- `AuthUser`
  - `id: string`
  - `username: string`
  - `email: string`
  - `roles: string` (hoặc sau này có thể chuyển thành `string[]` / enum)
  - `permissions?: string[]`

- `AuthState`
  - `user: AuthUser | null` – thông tin user hiện tại
  - `accessToken: string | null` – access token JWT đang dùng
  - `isAuthenticated: boolean` – trạng thái đã đăng nhập hay chưa

### 1.2. Actions

- `setAuth({ user, accessToken? })`
  - Set lại user và (tuỳ chọn) accessToken.
  - Tự động đặt `isAuthenticated = true`.
  - Nếu không truyền `accessToken` mới → giữ nguyên token cũ trong store.

- `updateUser(partial: Partial<AuthUser>)`
  - Cập nhật một phần thông tin user (`user = { ...user, ...partial }`).

- `setAccessToken(token: string | null)`
  - Cập nhật token; nếu có token mới → đánh dấu `isAuthenticated = true` (nếu trước đó chưa).

- `clearAuth()`
  - Xoá toàn bộ thông tin đăng nhập trên client:
  - `user = null`, `accessToken = null`, `isAuthenticated = false`.

### 1.3. Persist

- Dùng `persist` + `createJSONStorage(() => localStorage)` với key `auth-store`.
- `partialize` hiện đang lưu:
  - `user`
  - `isAuthenticated`
  - `accessToken`

> Lưu ý: việc persist `accessToken` vào `localStorage` tiện cho DX, nhưng về bảo mật nên cân nhắc dùng HttpOnly cookie + `/me` nếu muốn chặt hơn.

### 1.4. Selectors

- `authStateSelector(s)` → `{ user, isAuthenticated }`
- `tokenStateSelector(s)` → `{ accessToken, isAuthenticated }`
- `authActionsSelector(s)` → `{ setAuth, updateUser, setAccessToken, clearAuth }`

Khuyến nghị:

- Component UI đọc state qua selector:

  ```ts
  const { user, isAuthenticated } = useAuthStore(authStateSelector);
  ```

- Component cần thao tác (login/logout) lấy action qua `authActionsSelector`:

  ```ts
  const { setAuth, clearAuth } = useAuthStore(authActionsSelector);
  ```

---

## 2. HTTP client & refresh token

**File:** `lib/http/http.ts`

Mục tiêu: mọi request protected đều đi qua `apiFetch`, tự gắn token + xử lý refresh khi 401.

### 2.1. `apiFetch`

```ts
export async function apiFetch(
  input: string,
  init?: RequestInit & { retry?: boolean },
): Promise<Response>
```

- Build URL:
  - Nếu `input` là URL tuyệt đối (`http...`) → dùng nguyên.
  - Nếu không → prefix bằng `process.env.NEXT_PUBLIC_API_BASE_URL`.

- Headers:
  - Gộp `init.headers` với một object mới.
  - Nếu store có `accessToken` → thêm:

    ```ts
    headers.authorization = `Bearer ${accessToken}`;
    ```

- Luôn `credentials: 'include'` để backend sử dụng cookie (refresh token / session id).

### 2.2. Luồng khi gặp 401

1. Nếu `res.status !== 401` → trả về `res` bình thường.
2. Nếu `res.status === 401` và **`init?.retry === true`**:
   - Xem như đã thử refresh mà vẫn fail.
   - Thực hiện:
     - `clearAuth()`
     - Nếu `window.location.pathname !== '/auth'` → redirect về `/auth`.
   - Trả lại `res` cho caller.
3. Nếu `res.status === 401` và **chưa retry**:
   - Gọi `callRefresh()`:

     ```ts
     POST ${NEXT_PUBLIC_API_BASE_URL}/api/auth/refresh
     ```

   - Nếu refresh **thành công** (`res.ok`):
     - Parse JSON theo shape:

       ```ts
       type RefreshResponse = {
         tokens: { accessToken: string; refreshtoken: string };
         user: AuthUser;
       };
       ```

     - Gọi `setAuth({ user, accessToken: tokens.accessToken })`.
     - Gọi lại `apiFetch(url, { ...init, retry: true })` để retry request gốc.
   - Nếu refresh **thất bại** (`!refreshRes.ok`):
     - `clearAuth()`
     - Nếu không ở `/auth` → redirect `/auth`.
     - Trả về `res` ban đầu.

### 2.3. Cách dùng khuyến nghị

- Với mọi API protected: **luôn dùng `apiFetch`** thay vì `fetch` thô.

  ```ts
  const res = await apiFetch('/api/production-metrics/summary');
  if (!res.ok) {
    // handle error
  }
  const data = await res.json();
  ```

- Trang login có thể vẫn dùng `fetch` thô để gọi `/api/auth/login` (do chưa có token), sau đó set lại store.

---

## 3. AuthProvider & hydrate session

**Files:**

- `app/layout.tsx`
- `lib/auth/AuthProvider.tsx`

### 3.1. Bọc layout

```tsx
// app/layout.tsx
import { AuthProvider } from '@/lib/auth/AuthProvider';
import Loading from '@/components/Loading/Loading';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialUser = undefined;

  return (
    <html lang="vi">
      <body>
        <AuthProvider initialUser={initialUser} fallback={<Loading />}>
          <div className="app-layout">
            <Navbar />
            <main className="main-content">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- `initialUser`: hiện đang để `undefined` (chưa SSR user). Nếu sau này SSR từ cookie, có thể truyền user vào đây.
- `fallback`: component hiển thị trong lúc hydrate session lần đầu (trừ trang `/auth`).

### 3.2. Luồng trong `AuthProvider`

**File:** `lib/auth/AuthProvider.tsx`

- Đọc state + actions từ store:

  ```ts
  const { user, isAuthenticated } = useAuthStore(useShallow(authStateSelector));
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const pathname = usePathname();
  ```

- `isLoading` được khởi tạo:

  ```ts
  const [isLoading, setIsLoading] = useState(
    !initialUser && pathname !== '/auth',
  );
  ```

- `useEffect` hydrate session:

  1. Nếu có `initialUser`:
     - `setAuth({ user: initialUser, accessToken })`
     - `setIsLoading(false)`
  2. Nếu đang ở `/auth`:
     - `clearAuth()`
     - `setIsLoading(false)`
  3. Nếu store đã có `user` và `isAuthenticated`:
     - Tin tưởng state persist, không gọi backend.
     - `setIsLoading(false)`
  4. Ngược lại:
     - Gọi `apiFetch('/api/auth/me', { method: 'GET' })`
     - Nếu response không `ok` hoặc JSON không có `user`:
       - `clearAuth()` + `setIsLoading(false)`
     - Nếu có `user`:
       - `setAuth({ user: json.user })`
       - `setIsLoading(false)`

- Trong lúc `isLoading` và không có `initialUser` và không ở `/auth`:

  ```tsx
  if (isLoading && !initialUser && pathname !== '/auth') {
    if (fallback) return <>{fallback}</>;
    return <Loading />;
  }
  ```

→ Kết quả:

- Trang login (`/auth`) luôn hiển thị ngay form, không bị che bởi fallback.
- Các trang protected khác sẽ:
  - Dùng state từ localStorage nếu đã có (F5 vẫn nhanh).
  - Nếu chưa có state nhưng có cookie session → gọi `/api/auth/me` để tự login lại.
  - Trong thời gian đó hiển thị màn hình loading trắng nhẹ (`components/Loading/Loading.tsx`).

---

## 4. RBAC: Roles & Permissions

**Files:**

- `lib/auth/permission.constant.ts`
- `lib/auth/rbarc.ts`
- `lib/auth/OnlyRole.tsx`

### 4.1. Permission constants

**File:** `lib/auth/permission.constant.ts`

- `PERMISSIONS`: liệt kê các mã quyền (string) cho:
  - User, role, workshop, production line, position
  - Device, production, brick type
  - Production metrics, quota targets
  - Maintenance logs

  Ví dụ:

  ```ts
  export const PERMISSIONS = {
    USER_READ: 'user.read',
    USER_CREATE: 'user.create',
    // ...
    BRICK_TYPE_READ: 'brick-type.read',
    // ...
  } as const;
  ```

- `PERMISSION_GROUPS`: gom các quyền theo nhóm (USER_MANAGE, ROLE_MANAGE, ...).
- Type tiện dụng:
  - `PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]`
  - `PermissionGroupKey = keyof typeof PERMISSION_GROUPS`

### 4.2. Helpers RBAC

**File:** `lib/auth/rbarc.ts`

- `hasRole(user, role: Role)`
  - Trả về `true` nếu user có role (tuỳ cách biểu diễn `user.roles`).

- `hasAnyRole(user, roles: Role[])`
  - Trả về `true` nếu user có ít nhất một trong các role truyền vào.

- `hasPermission(user, perm: string)`
  - Trả về `true` nếu `perm` nằm trong `user.permissions`.

> Lưu ý: hiện tại `AuthUser.roles` là `string`, nhưng helpers giả định có thể check `includes`. Khi backend trả roles cụ thể (mảng), cần align lại kiểu.

### 4.3. Component `OnlyRoles`

**File:** `lib/auth/OnlyRole.tsx`

```tsx
type Props = {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
};

export function OnlyRoles({ roles, children, fallback = null }: Props) {
  const user = useAuthStore((s) => s.user);
  if (!hasAnyRole(user, roles)) return <>{fallback}</>;
  return <>{children}</>;
}
```

- Cách dùng:

  ```tsx
  <OnlyRoles roles={['ADMIN', 'SUPERADMIN']} fallback={null}>
    <Button>Tạo người dùng</Button>
  </OnlyRoles>
  ```

→ Nếu user không có role tương ứng → render `fallback` (mặc định `null`). Nếu có → hiển thị children.

---

## 5. Hướng dẫn sử dụng trong UI

### 5.1. Login

**File:** `app/auth/page.tsx`

- Dùng Formik + Yup để validate `identifier` + `password`.
- Gửi request login:

  ```ts
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(values),
    headers: { 'Content-Type': 'application/json' },
  });
  ```

- Parse response theo shape backend:

  ```ts
  const loginData = (await res.json()) as {
    tokens?: { accessToken: string; refreshtoken: string };
    user?: AuthUser;
    sessionId?: string;
  };
  ```

- Nếu `user` + `tokens.accessToken` tồn tại:

  ```ts
  setAuth({ user, accessToken: tokens.accessToken });
  router.push('/dashboard');
  ```

- Nếu lỗi:
  - Hiển thị message ngay dưới nút submit (state `loginError` + `styles.formError`). 
  - Thử đọc `errorBody.message` từ backend nếu có.

### 5.2. Logout

**File:** `components/UserInfo/UserInfo.tsx`

- Button “Đăng xuất” thực hiện:

  ```ts
  const logoutResult = await apiFetch('/api/auth/logout', { method: 'POST' });
  if (!logoutResult.ok) return;

  const logoutData = await logoutResult.json();
  if (logoutData?.sessionId) {
    clearAuth();
    window.location.href = '/auth';
  }
  ```

- Nhờ dùng `apiFetch`, nếu accessToken hết hạn, client sẽ refresh trước khi logout khi cần.

### 5.3. Gating UI bằng `isAuthenticated`

- `components/Navbar.tsx` và `components/Footer.tsx`:
  - Đọc `isAuthenticated` từ store.
  - Chỉ render giao diện khi user đã đăng nhập.

  ```tsx
  const { user, isAuthenticated } = useAuthStore(useShallow(authStateSelector));
  return (
    isAuthenticated && (
      <nav>...</nav>
    )
  );
  ```

### 5.4. Gọi API trong các page

- Ví dụ `app/analytics/page.tsx`:

  ```ts
  const dailyRes = await apiFetch(
    `${API_URL}/production-metrics/daily-breakdown?${queryParams}`,
  );
  const summaryRes = await apiFetch(
    `${API_URL}/production-metrics/summary?${queryParams}`,
  );
  ```

- Ví dụ `app/brick-types/page.tsx`:

  ```ts
  const res = await apiFetch(`${API_URL}/brick-types`);
  const resLines = await apiFetch(`${API_URL}/production-lines`);
  const resActivate = await apiFetch(
    `${API_URL}/brick-types/${selectedBrickForLine}/activate`,
  );
  ```

→ Tất cả page dùng chung luồng token/refresh, nên không phải tự xử lý 401 ở từng chỗ.

---

## 6. Ghi chú về middleware / proxy

**File:** `proxy.ts`

- Hiện tại là skeleton cho middleware bảo vệ route:
  - `publicRoutes = ['/auth']`
  - Mọi route khác (theo `config.matcher`) coi là protected.
  - Dùng cookie `x-session-id` để xác định có session hay không.
  - Nếu protected route mà không có cookie → redirect `/auth`.
  - Nếu public route mà đã có cookie → redirect `/dashboard`.
- Để sử dụng thực tế, cần:
  - Đưa logic này vào `middleware.ts` đúng chuẩn Next.
  - Dùng `req.cookies.get('x-session-id')` trong middleware.
  - Đảm bảo backend set cookie `x-session-id` đúng như mong đợi.

---

Tài liệu này tập trung vào frontend. Mọi thay đổi thêm về shape API (`/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout`) nên được cập nhật đồng bộ ở đây để tránh lệch giữa backend và client. 

