# 自动创建项目
./scripts/create-site.sh tikdek-web /Users/syx/WebstormProjects/tikdek/tikdek-web

# 手动创建项目
### create repo
cd new-project-name
gh repo create new-project-name --private --source=. --remote=origin --push

### clone
git clone https://github.com/buildnewapp/nexty-cf-template.git new-project-name
cd new-project-name
git remote rename origin upstream
git remote add origin git@github.com:buildnewapp/new-project-name.git
git push -u origin main

### check
git remote -v
```
origin    git@github.com:buildnewapp/new-project-name.git
upstream  git@github.com:buildnewapp/nexty-cf-template.git
```

### upgrade
以后同步模板更新
```
cd new-project-name
git checkout main
git pull origin main
git fetch upstream
git merge upstream/main
git push origin main
``` 
如果合并冲突,手动修改冲突文件后执行：
```
git add .
git commit
git push origin main
```
如果合并后发现有问题，想撤销
还没 push 的情况：
git merge --abort
已经 push 的情况：
git reset --hard HEAD~1
git push origin main --force
## install
https://nexty.dev/zh/docs/start-project/cf-workers
```
pnpm install
cp .env.example .env.local
cp .env.example .env
```


# 旧版本项目创建
## merge from template
git remote add template https://github.com/buildnewapp/nexty-cf-template.git
git fetch template
git checkout template/main -- .
# 删除你当前项目里有、但模板里已经没有的文件
git diff --name-only --diff-filter=D main..template/main -z | xargs -0 git rm --ignore-unmatch
git commit -m "chore: sync all files from nexty-cf-template"
## merge 流程
git stash push -u -m "before merge template"

git fetch template
git merge --allow-unrelated-histories --no-commit template/main

git commit -m "merge template/main"
git stash pop