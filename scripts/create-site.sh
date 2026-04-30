#!/bin/bash

set -e

# ==============================
# 配置区
# ==============================
TEMPLATE_REPO="git@github.com:buildnewapp/nexty-cf-template.git"
GITHUB_OWNER="buildnewapp"

# ==============================
# 参数
# ==============================
SITE_NAME=$1
TARGET_DIR=$2

if [ -z "$SITE_NAME" ] || [ -z "$TARGET_DIR" ]; then
  echo "用法:"
  echo "./create-site.sh tikdek /Users/syx/WebstormProjects/tikdek/tikdek-web"
  exit 1
fi

echo "=============================="
echo "创建项目: $SITE_NAME"
echo "模板仓库: $TEMPLATE_REPO"
echo "目标目录: $TARGET_DIR"
echo "GitHub Owner: $GITHUB_OWNER"
echo "=============================="

# ==============================
# 基础检查
# ==============================
if ! command -v git >/dev/null 2>&1; then
  echo "❌ 未安装 git"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "❌ 未安装 GitHub CLI: gh"
  echo "Mac 安装: brew install gh"
  exit 1
fi

if [ -d "$TARGET_DIR" ]; then
  echo "❌ 目标目录已存在: $TARGET_DIR"
  exit 1
fi

# ==============================
# 创建父目录
# ==============================
mkdir -p "$(dirname "$TARGET_DIR")"

# ==============================
# 从远程模板 clone
# ==============================
git clone "$TEMPLATE_REPO" "$TARGET_DIR"

cd "$TARGET_DIR"

# ==============================
# 设置 remote
# upstream = 模板仓库
# origin   = 新项目仓库
# ==============================
git remote rename origin upstream

# ==============================
# 创建 GitHub 新仓库并 push
# ==============================
gh repo create "$GITHUB_OWNER/$SITE_NAME" \
  --private \
  --source=. \
  --remote=origin \
  --push

echo ""
echo "✅ 创建完成"
echo "本地项目: $TARGET_DIR"
echo "GitHub仓库: git@github.com:$GITHUB_OWNER/$SITE_NAME.git"
echo ""

echo "当前 remote:"
git remote -v

echo ""
echo "后续同步模板更新:"
echo "git checkout main"
echo "git pull origin main"
echo "git fetch upstream"
echo "git merge upstream/main"
echo "git push origin main"