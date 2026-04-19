# Meowlytics 修改记录

## 记录规则

每次修改请按以下格式记录：

```markdown
### [编号] 修改标题
**日期：** YYYY-MM-DD
**类型：** feature | fix | refactor | style | docs | chore

**修改内容：**
- 具体修改点 1
- 具体修改点 2

**涉及文件：**
- `path/to/file1.tsx`
- `path/to/file2.ts`

**备注：**（可选）
额外说明信息
```

### 类型说明

| 类型 | 说明 |
|------|------|
| feature | 新功能 |
| fix | Bug 修复 |
| refactor | 代码重构（不改变功能） |
| style | 样式/UI 修改 |
| docs | 文档更新 |
| chore | 构建/配置等杂项 |

### 编号规则

- 格式：`v0.X.Y` 或简单递增 `#001`、`#002`
- 建议按时间顺序递增

---

## 修改历史

### #019 产品对比
**日期：** 2026-04-11
**类型：** feature

**修改内容：**
- 收藏页新增对比模式，支持选择 2-3 个产品进入对比
- 新增 `/compare` 页面，展示评分对比、分类结构表、风险/优质配料对比表
- FavoriteCard 新增对比模式相关 props（`compareMode`、`selected`、`disabled`、`onToggleSelect`）
- 新增 CompareIcon 图标组件

**涉及文件：**
- `app/(main)/compare/page.tsx`
- `app/(main)/favorites/page.tsx`
- `app/(main)/components/FavoriteCard.tsx`
- `app/(main)/components/icons.tsx`

---

### #018 多图上传
**日期：** 2026-04-11
**类型：** feature

**修改内容：**
- 分析流程支持上传 1-3 张图片（适用于配料表较长、一张照片拍不完的情况）
- 前端上传区显示缩略图预览，支持添加/移除图片
- API 将多张图片一并发送给 Gemini，并使用适配的 prompt 进行合并分析

**涉及文件：**
- `app/(main)/page.tsx`
- `app/api/analyze/route.ts`

---

### #001 项目初始化
**日期：** 2026-01
**类型：** feature

**修改内容：**
- 创建 Next.js 16 项目
- 集成 Google Gemini API 进行图片分析
- 实现基础配料识别和评分功能

---

### #002 知识库系统
**日期：** 2026-01
**类型：** feature

**修改内容：**
- 添加本地配料知识库（60+ 种配料）
- 实现配料详情弹窗组件
- 添加模糊搜索算法

---

### #003 数据库集成
**日期：** 2026-01-24
**类型：** feature

**修改内容：**
- 集成 PostgreSQL + Prisma 7
- 将配料知识迁移到数据库存储
- 支持 AI 生成配料自动入库
- 实现 30 天过期刷新机制

**涉及文件：**
- `lib/db.ts`
- `lib/knowledge/db-search.ts`
- `prisma/schema.prisma`
- `app/api/knowledge/route.ts`

---

### #004 收藏功能
**日期：** 2026-01-24
**类型：** feature

**修改内容：**
- 添加收藏页面 `/favorites`
- 使用 Zustand + LocalStorage 持久化
- 实现收藏卡片和详情弹窗

**涉及文件：**
- `app/(main)/favorites/page.tsx`
- `app/(main)/components/FavoriteCard.tsx`
- `app/(main)/components/FavoriteDetailModal.tsx`
- `app/(main)/components/SaveFavoriteModal.tsx`
- `app/(main)/store/useFavoritesStore.ts`

---

### #005 收藏详情优化
**日期：** 2026-01-25
**类型：** refactor

**修改内容：**
- 收藏详情页移除"配料分析"部分
- 改为显示"识别的配料"列表
- 支持点击配料弹出详情弹窗（与主页一致）

**涉及文件：**
- `app/(main)/components/FavoriteDetailModal.tsx`

---

### #006 猫咪主题 UI
**日期：** 2026-01-25
**类型：** style

**修改内容：**
- 全新猫咪主题设计
- 橙色/琥珀色渐变配色
- 猫耳朵装饰元素
- 猫爪印背景图案
- 猫咪表情评分（😻/😺/🙀）
- 自定义动画效果（摇摆、跳跃、挥爪）
- 毛玻璃效果模态框
- 悬停抬升卡片效果

**涉及文件：**
- `app/globals.css`
- `app/(main)/layout.tsx`
- `app/(main)/page.tsx`
- `app/(main)/components/Navbar.tsx`
- `app/(main)/components/FavoriteCard.tsx`
- `app/(main)/components/FavoriteDetailModal.tsx`
- `app/(main)/components/IngredientPopover.tsx`
- `app/(main)/components/SaveFavoriteModal.tsx`
- `app/(main)/favorites/page.tsx`

---

<!-- 在此处添加新的修改记录 -->

### #007 /api/analyze 校验增强
**日期：** 2026-02-04
**类型：** fix

**修改内容：**
- 增加 AI 输出最小 schema 校验，防止字段缺失导致前端崩溃
- 增加图片类型与大小校验（允许 jpeg/png/webp，最大 5MB）

**涉及文件：**
- `app/api/analyze/route.ts`

---

### #008 配料搜索优化
**日期：** 2026-02-04
**类型：** refactor

**修改内容：**
- 避免同一请求内重复 `findMany()` 全表扫描

**涉及文件：**
- `lib/knowledge/db-search.ts`

---

### #009 架构文档同步
**日期：** 2026-02-04
**类型：** docs

**修改内容：**
- README 指向 `.claude/ARCHITECTURE.md`
- 移除文档中不存在的 `app/api/knowledge/upload/route.ts`

**涉及文件：**
- `README.md`
- `.claude/ARCHITECTURE.md`

---

### #010 文档路径修正
**日期：** 2026-02-04
**类型：** docs

**修改内容：**
- 架构文档目录树改为 `.claude/ARCHITECTURE.md`
- 开发指令更新架构文档路径并移除不存在的上传 API

**涉及文件：**
- `.claude/ARCHITECTURE.md`
- `.claude/instructions.md`

---

### #011 配料查询容错
**日期：** 2026-02-04
**类型：** fix

**修改内容：**
- 知识库 AI 生成使用稳定模型并在不可用时返回 503
- 前端查询失败时展示服务错误信息，避免控制台错误提示

**涉及文件：**
- `app/api/knowledge/route.ts`
- `app/(main)/components/IngredientPopover.tsx`

---

### #012 文档结构重组与进度同步
**日期：** 2026-02-27
**类型：** docs

**修改内容：**
- 将项目文档统一迁移到 `docs/` 目录集中管理
- 新增 `docs/DEVELOPMENT.md`，承接开发约定与维护流程
- README 更新文档入口，区分项目文档与 `.claude` Agent 指令
- 同步修正文档与现状不一致问题：明确 `app/api/knowledge/upload/route.ts` 为现有接口

**涉及文件：**
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT.md`
- `docs/CHANGELOG.md`
- `.claude/instructions.md`

---

### #013 用户登录与收藏持久化
**日期：** 2026-02-27
**类型：** feature

**修改内容：**
- 新增用户注册/登录/登出/会话接口，使用 HttpOnly Cookie 维持登录状态
- 新增 `User` 与 `Favorite` 数据模型，收藏与分析结果改为数据库持久化
- 收藏接口改为按用户隔离（`/api/favorites` 与 `/api/favorites/[id]`）
- 前端收藏 store 从 LocalStorage 改为服务端同步，Navbar 增加登录入口

**涉及文件：**
- `prisma/schema.prisma`
- `lib/auth/password.ts`
- `lib/auth/session.ts`
- `lib/auth/require-user.ts`
- `app/api/auth/register/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/session/route.ts`
- `app/api/favorites/route.ts`
- `app/api/favorites/[id]/route.ts`
- `app/(main)/store/useFavoritesStore.ts`
- `app/(main)/components/AuthModal.tsx`
- `app/(main)/components/Navbar.tsx`
- `app/(main)/components/SaveFavoriteModal.tsx`
- `app/(main)/components/FavoriteCard.tsx`
- `app/(main)/components/FavoriteDetailModal.tsx`
- `app/(main)/favorites/page.tsx`
- `app/(main)/types.ts`

---

### #014 安全与数据一致性修复
**日期：** 2026-02-27
**类型：** fix

**修改内容：**
- 为 `/api/knowledge/upload` 增加管理员鉴权（登录 + `ADMIN_EMAILS` 白名单）
- 登录与注册接口增加内存限流，降低暴力尝试风险
- 为知识库 AI 生成结果与收藏 `analysis` 入库增加 schema 校验，避免脏数据落库
- 修复收藏初始化时迁移失败导致登录态被错误清空的问题
- 同步 README 的 `Ingredient` schema 示例与实际 Prisma 字段

**涉及文件：**
- `app/api/knowledge/upload/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/knowledge/route.ts`
- `app/api/favorites/route.ts`
- `app/(main)/store/useFavoritesStore.ts`
- `lib/auth/admin.ts`
- `lib/auth/rate-limit.ts`
- `lib/knowledge/validation.ts`
- `lib/validation/analysis.ts`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT.md`

---

### #015 环境变量集中校验
**日期：** 2026-02-27
**类型：** refactor

**修改内容：**
- 新增 `lib/env.ts`，在启动时集中校验关键环境变量
- 数据库、会话签名、AI 客户端、管理员白名单统一从 `env` 模块读取
- 新增 `.env.example`，补充本地与部署所需变量模板

**涉及文件：**
- `lib/env.ts`
- `lib/db.ts`
- `lib/auth/session.ts`
- `lib/auth/admin.ts`
- `app/api/analyze/route.ts`
- `app/api/knowledge/route.ts`
- `.env.example`
- `README.md`
- `docs/DEVELOPMENT.md`

---

### #016 管理台与导航改版
**日期：** 2026-02-27
**类型：** feature

**修改内容：**
- 登录态返回增加 `isAdmin`，用于前端按权限展示功能入口
- 新增管理员管理页 `/admin`，支持 JSON 粘贴和文件导入后调用知识库上传接口
- 导航头重构：支持管理员 tab、账号 tab、登录态信息增强
- 新增用户账号页 `/account`，展示权限与收藏统计
- 收藏页头部视觉与信息结构优化，统一页面层次

**涉及文件：**
- `app/api/auth/login/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/auth/session/route.ts`
- `app/(main)/types.ts`
- `app/(main)/components/Navbar.tsx`
- `app/(main)/admin/page.tsx`
- `app/(main)/account/page.tsx`
- `app/(main)/favorites/page.tsx`

---

### #017 UIUX 统一改版（主站 + 用户端）
**日期：** 2026-02-27
**类型：** style

**修改内容：**
- 重建全局视觉变量与背景层（暖橙 + 青绿点缀），统一卡片/按钮/动效风格
- 导航头重构为更清晰的信息层级（品牌、功能 tab、账号状态）
- 首页首屏、上传区、结果区改为统一的玻璃卡片和强调色体系
- 收藏页、账号页、管理页的布局与信息密度统一，移动端可读性提升
- 登录弹窗、收藏卡片、收藏详情、配料弹窗完成样式语言统一

**涉及文件：**
- `app/globals.css`
- `app/(main)/layout.tsx`
- `app/(main)/components/Navbar.tsx`
- `app/(main)/page.tsx`
- `app/(main)/favorites/page.tsx`
- `app/(main)/account/page.tsx`
- `app/(main)/admin/page.tsx`
- `app/(main)/components/AuthModal.tsx`
- `app/(main)/components/FavoriteCard.tsx`
- `app/(main)/components/FavoriteDetailModal.tsx`
- `app/(main)/components/SaveFavoriteModal.tsx`
- `app/(main)/components/IngredientPopover.tsx`
