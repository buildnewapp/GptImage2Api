# Git 上游合并任务

本文件是长期维护的项目清单和执行规则。每次开始新一轮运行时，都要处理当时列出的全部项目；不要把单次运行状态写回本文件。

按顺序逐条执行以下任务。每次只处理一个目录，完成并确认推送成功后，再继续下一个目录。

## 运行记录

1. 运行记录保存在 `/Users/syx/WebstormProjects/Nexty-template/nexty.dev-cf-pg/git-merge-logs/`，该目录中的文件不提交到 Git。
2. 开始新一轮运行时，创建以本地时间命名的日志，例如 `2026-09-16-143000.md`，并将本轮开始时的完整项目清单写入日志。
3. 日志至少记录项目名称、完整目录、状态、当前分支、提交哈希和说明。状态使用：`待处理`、`处理中`、`成功`、`已是最新`、`等待人工确认` 或 `失败`。
4. 开始处理项目前将状态改为 `处理中`；每个项目处理结束或暂停时立即更新日志。不要在本文件中添加或修改完成标记。
5. 用户明确要求“继续”或“恢复”时，读取最近一份未完成日志，从其中第一个未完成项目继续。本轮开始后新增到本文件的项目留到下一轮，除非用户明确要求加入当前运行。
6. 直接调用执行任务时，如果最近一份日志尚未完成，优先恢复该运行；没有未完成日志时才开始新一轮。用户明确要求“开始新一轮”时，先确认没有遗留的合并状态，再创建新日志。

## 统一执行规则

每个目录都按以下规则处理：

1. 进入指定目录，确认它是 Git 仓库，并记录当前分支。
2. 执行 `git status --short`。如果工作区已有未提交或未跟踪的改动，不要覆盖、丢弃、暂存或提交这些改动；在运行日志中标记为 `失败`，停止本轮运行并报告具体情况。
3. 确认存在 `upstream` 远程仓库，然后执行：

   ```bash
   git fetch upstream
   git merge --no-ff --no-commit upstream/main
   ```

4. 如果发生冲突，逐个检查并解决。以当前目录现有代码和当前分支的业务逻辑为主，`upstream/main` 的改动作为辅助；不要简单整批选择 `ours` 或 `theirs`。解决后确认没有未合并文件。
5. 检查合并结果、`git diff --cached` 和 `git diff --cached --name-only`。不要运行 build，除非另有明确要求。
6. 如果合并结果包含数据库相关文件（例如 `*.sql`、migration、Drizzle、Prisma、`lib/db` 或项目现有数据库目录中的文件）或 `.env.example` 的变更：
   - 不要执行 `db:migrate`、`db:push`、SQL 或其他会修改数据库的命令。
   - 不要自行决定如何处理这些文件，也不要提交或推送当前合并结果。
   - 向用户报告项目名称、项目完整目录，以及所有相关变更文件的路径，并简要说明变更内容。
   - 在运行日志中标记为 `等待人工确认`，停止本轮运行，等待用户确认后再继续提交和推送。
7. 如果没有上述需要人工确认的变更，并且产生了待提交的合并结果，创建合并提交，提交信息使用 `Merge upstream/main`；如果提示已经是最新状态，则不要创建空提交。
8. 将当前分支推送到 `origin`。推送完成后报告当前目录、分支、提交哈希和推送结果。
9. 不要自动创建分支或 worktree，不要修改 Git 历史，不要使用会丢失现有改动的命令。

## Step 1

### 1. sdanceai

- 进入 `/Users/syx/WebstormProjects/sdanceai/sdanceai`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 2. tikdek-web

- 进入 `/Users/syx/WebstormProjects/tikdek/tikdek-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 3. gptimage2-web

- 进入 `/Users/syx/WebstormProjects/GptImage2Api/gptimage2-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 4. spicy-video-web

- 进入 `/Users/syx/WebstormProjects/Spicy/spicy-video-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

## Step 2-1

### 1. fsg-web

- 进入 `/Users/syx/idea/FreeSoraGenerator/fsg-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

## Step 2-2

### 1. Submify2-web

- 进入 `/Users/syx/WebstormProjects/Submify/Submify2-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 2. autogeo-v2

- 进入 `/Users/syx/WebstormProjects/autogeo/autogeo-v2`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 3. gptimage25-web

- 进入 `/Users/syx/WebstormProjects/aimodels/gptimage25-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 4. GptImage4

- 进入 `/Users/syx/WebstormProjects/GptImage2Api/GptImage4`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 5. GptImage5

- 进入 `/Users/syx/WebstormProjects/GptImage2Api/GptImage5`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 6. GptImage6

- 进入 `/Users/syx/WebstormProjects/GptImage2Api/GptImage6`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 7. FreeOmni-web

- 进入 `/Users/syx/WebstormProjects/Omni/FreeOmni-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 8. Omniink-web

- 进入 `/Users/syx/WebstormProjects/Omni/Omniink-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 9. Jsontranslate-new

- 进入 `/Users/syx/WebstormProjects/Jsontranslate/Jsontranslate-new`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 10. spicy-ai-web

- 进入 `/Users/syx/WebstormProjects/Spicy/spicy-ai-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 11. spicy-image-web

- 进入 `/Users/syx/WebstormProjects/Spicy/spicy-image-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 12. spicy-chat-web

- 进入 `/Users/syx/WebstormProjects/Spicy/spicy-chat-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 13. GptApi-web

- 进入 `/Users/syx/WebstormProjects/GptApi/GptApi-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

## Step 2-3

### 1. seedance25-web

- 进入 `/Users/syx/WebstormProjects/sdanceai/seedance25-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 2. freemusevideo-web

- 进入 `/Users/syx/WebstormProjects/freemusevideo/freemusevideo-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 3. metamuse-web

- 进入 `/Users/syx/WebstormProjects/freemusevideo/metamuse-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 4. aiexplainervideo-web

- 进入 `/Users/syx/WebstormProjects/aimodels/aiexplainervideo-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 5. aiugcvideo-web

- 进入 `/Users/syx/WebstormProjects/aimodels/aiugcvideo-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 6. audiotovideoai-web

- 进入 `/Users/syx/WebstormProjects/aimodels/audiotovideoai-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 7. fluxlora-web

- 进入 `/Users/syx/WebstormProjects/aimodels/fluxlora-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 8. hailuoaivideo-web

- 进入 `/Users/syx/WebstormProjects/aimodels/hailuoaivideo-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 9. happyhorseaistudio-web

- 进入 `/Users/syx/WebstormProjects/aimodels/happyhorseaistudio-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 10. ideogramstudio-web

- 进入 `/Users/syx/WebstormProjects/aimodels/ideogramstudio-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 11. ltx23free-web

- 进入 `/Users/syx/WebstormProjects/aimodels/ltx23free-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 12. motioncontrolai-web

- 进入 `/Users/syx/WebstormProjects/aimodels/motioncontrolai-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 13. qwenimageedit-web

- 进入 `/Users/syx/WebstormProjects/aimodels/qwenimageedit-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 14. runwayai-web

- 进入 `/Users/syx/WebstormProjects/aimodels/runwayai-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 15. seedream-web

- 进入 `/Users/syx/WebstormProjects/aimodels/seedream-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 16. trygrokimagine-web

- 进入 `/Users/syx/WebstormProjects/aimodels/trygrokimagine-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 17. tryklingai-web

- 进入 `/Users/syx/WebstormProjects/aimodels/tryklingai-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 18. viduai-web

- 进入 `/Users/syx/WebstormProjects/aimodels/viduai-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 19. wanvideo-web

- 进入 `/Users/syx/WebstormProjects/aimodels/wanvideo-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。

### 20. zimage-web

- 进入 `/Users/syx/WebstormProjects/aimodels/zimage-web`，严格按照“统一执行规则”完成 `upstream/main` 的合并、冲突处理、提交和推送。
