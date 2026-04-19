# Meowlytics 开发约定

## 开发前必读

在对项目进行修改前，请先阅读：

1. `docs/ARCHITECTURE.md`
2. 本文档

## 核心原则

1. **功能隔离**：按功能模块组织代码，不按文件类型分散
2. **Route Groups**：用 `(括号)` 组织代码但不影响 URL
3. **就近原则**：模块专用的组件/hooks/store 放在模块内
4. **页面完整性**：页面按需补齐 `loading.tsx` 和 `error.tsx`

## 文件放置速查

| 文件类型 | 放置位置 |
|---------|---------|
| 模块专用组件 | `app/(模块名)/components/` |
| 全局共享组件 | `components/ui/` 或 `components/shared/` |
| API 路由 | `app/api/` |
| 工具函数 | `lib/` |
| 数据库操作 | `lib/db.ts` 或 `lib/knowledge/db-search.ts` |
| 知识库类型 | `lib/knowledge/types.ts` |
| 页面类型 | `app/(模块名)/types.ts` |
| 项目文档 | `docs/` |

## 知识库系统

所有配料查询都通过 `/api/knowledge` API，统一使用数据库：

```text
查询配料 → searchIngredientFromDB()
    ├── 找到 knowledge_base 数据 → 返回
    ├── 找到未过期 ai_generated → 返回
    ├── 找到过期 ai_generated → AI 重新生成 → 更新数据库
    └── 未找到 → AI 生成 → 存入数据库
```

批量导入通过 `/api/knowledge/upload`（需要管理员账号，邮箱在 `ADMIN_EMAILS` 中）。

关键文件：
- `lib/db.ts` - Prisma 客户端（使用 adapter）
- `lib/knowledge/db-search.ts` - 数据库查询函数
- `lib/knowledge/types.ts` - IngredientKnowledge 类型
- `app/api/knowledge/route.ts` - 查询 API
- `app/api/knowledge/upload/route.ts` - 批量上传 API

## 修改代码前检查

1. 确认文件应该放在哪个位置
2. 检查是否有现有的类似组件可以复用
3. 更新相关 import 路径
4. 确保类型定义在正确的 `types.ts` 中
5. 数据库操作使用 `lib/db.ts` 中的 Prisma 实例

## 文档维护约定

1. 结构/规范变动：更新 `docs/ARCHITECTURE.md`
2. 过程性约定变动：更新 `docs/DEVELOPMENT.md`
3. 每次功能变更：追加 `docs/CHANGELOG.md`

## 环境变量约定

- 必填环境变量由 `lib/env.ts` 在服务启动时集中校验（`DATABASE_URL`、`GOOGLE_API_KEY`、`AUTH_SECRET`）。
- `ADMIN_EMAILS` 为可选白名单，用于管理接口权限控制（逗号分隔邮箱）。
