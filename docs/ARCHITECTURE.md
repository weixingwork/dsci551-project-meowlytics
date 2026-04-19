# Meowlytics 架构与目录规范

## 核心原则：功能隔离

所有代码按功能模块组织，而不是按文件类型分散。

## 目录结构

```
meowlytics/
├── app/
│   ├── (main)/                      # 主功能模块（分析页面）
│   │   ├── components/              # 模块专用组件
│   │   │   ├── IngredientPopover.tsx
│   │   │   ├── FavoriteCard.tsx     # 收藏卡片（支持对比模式 props）
│   │   │   └── icons.tsx            # 图标组件（含 CompareIcon）
│   │   ├── compare/
│   │   │   └── page.tsx             # 产品对比页面
│   │   ├── hooks/                   # 模块专用 hooks
│   │   ├── store/                   # 模块专用状态（Zustand）
│   │   ├── types.ts                 # 模块专用类型
│   │   ├── page.tsx                 # 首页（支持多图上传分析）
│   │   └── layout.tsx               # 模块布局
│   │
│   ├── (auth)/                      # 认证模块（未来）
│   │   ├── login/
│   │   └── register/
│   │
│   ├── api/                         # API 路由
│   │   ├── analyze/route.ts         # 图片分析 API（支持 1-3 张多图）
│   │   ├── auth/                    # 用户认证 API
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── session/route.ts
│   │   ├── favorites/               # 用户收藏 API
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── knowledge/               # 知识库 API
│   │       └── route.ts             # 查询配料
│   │
│   ├── layout.tsx                   # 全局布局
│   └── globals.css
│
├── lib/
│   ├── db.ts                        # Prisma 数据库客户端
│   ├── knowledge/                   # 知识库系统
│   │   ├── db-search.ts             # 数据库查询函数
│   │   └── types.ts                 # 知识库类型定义
│
├── prisma/
│   └── schema.prisma                # 数据库 Schema
│
├── docs/
│   ├── ARCHITECTURE.md              # 架构与目录规范
│   ├── DEVELOPMENT.md               # 开发约定
│   └── CHANGELOG.md                 # 修改记录
│
├── .claude/
│   └── instructions.md              # Agent 指令（仅工具/代理相关）
│
└── README.md
```

## 开发规范

### 1. Route Groups（路由分组）

- 用 `(括号)` 的文件夹不影响 URL
- `app/(main)/page.tsx` → URL 是 `/`
- `app/(auth)/login/page.tsx` → URL 是 `/login`

### 2. 文件放置原则

| 情况 | 放置位置 |
|------|----------|
| 只有当前模块使用 | `app/(模块名)/components/` |
| 多个模块共享 | `components/` |
| 业务逻辑/工具 | `lib/` |
| API 接口 | `app/api/` |
| 数据库相关 | `lib/` 或 `prisma/` |

### 3. 每个页面的标准结构

```
app/(模块)/功能名/
├── page.tsx              # 页面主组件（Server Component）
├── XxxClient.tsx         # 客户端交互（Client Component）
├── actions.ts            # Server Actions
├── loading.tsx           # 加载状态
└── error.tsx             # 错误边界
```

### 4. 命名规范

- 组件文件：`PascalCase.tsx`（如 `ScoreRing.tsx`）
- 工具/hooks：`camelCase.ts`（如 `useAnalysis.ts`）
- 类型文件：`types.ts`
- 常量文件：`constants.ts`

### 5. 状态管理

- 使用 Zustand
- 每个功能模块一个 store
- 文件命名：`use[功能]Store.ts`

### 6. 组件分类

```
components/
├── ui/                   # 纯 UI 组件（无业务逻辑）
│   ├── Button.tsx
│   ├── Modal.tsx
│   └── Input.tsx
└── shared/               # 共享业务组件
    └── Header.tsx
```

### 7. 知识库系统

```
lib/knowledge/
├── db-search.ts          # 数据库查询（搜索、保存、更新）
└── types.ts              # IngredientKnowledge 类型定义
```

数据流：
```
用户查询配料 → /api/knowledge
    ↓
数据库搜索 (searchIngredientFromDB)
    ├── 找到 knowledge_base 数据 → 直接返回
    ├── 找到 ai_generated 且未过期 → 直接返回
    ├── 找到 ai_generated 但已过期 → 调用 AI → 更新数据库 → 返回
    └── 未找到 → 调用 AI → 存入数据库 → 返回
```

另外支持批量导入：
`POST /api/knowledge/upload` 用于批量写入/更新 `IngredientKnowledge`（仅管理员可用）。

## 新增功能检查清单

添加新功能时，确认以下事项：

- [ ] 是否需要新建 Route Group？
- [ ] 组件是模块专用还是全局共享？
- [ ] 是否需要新的 Zustand store？
- [ ] API 路由是否放在 `app/api/` 下？
- [ ] 类型定义是否在正确的 `types.ts` 中？
- [ ] 数据库操作是否在 `lib/` 中？

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: PostgreSQL (Prisma Postgres 托管)
- **ORM**: Prisma 7 (with adapter)
- **AI**: Google Gemini API
