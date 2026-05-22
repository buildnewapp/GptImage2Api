# 日常更新
git fetch upstream
git merge upstream/main

git fetch template
git merge --allow-unrelated-histories --no-commit template/main


open -na "WebStorm" --args "./"
// :w + :q
git commit -m "update from upstream"

# 应用更新：
## Sdance AI
cd /Users/syx/WebstormProjects/sdanceai/sdanceai
git fetch template
git merge --allow-unrelated-histories --no-commit template/main
git commit -m "update from upstream"
git push origin main

## gptimage2-web
cd /Users/syx/WebstormProjects/GptImage2Api/gptimage2-web
git fetch template
git merge --allow-unrelated-histories --no-commit template/main
git commit -m "update from upstream"
git push origin main

## Jsontranslate
cd /Users/syx/WebstormProjects/Jsontranslate/Jsontranslate-new
git fetch upstream
git merge upstream/main
git push origin main

## autogeo
cd /Users/syx/WebstormProjects/autogeo/autogeo-v2
git fetch upstream
git merge upstream/main
git push origin main

## tikdek-web
cd /Users/syx/WebstormProjects/tikdek/tikdek-web
git fetch upstream
git merge upstream/main
git push origin main

## Omniink-web
cd /Users/syx/WebstormProjects/Omni/Omniink-web
git fetch upstream
git merge upstream/main
git push origin main

## FreeOmni-web
cd /Users/syx/WebstormProjects/Omni/FreeOmni-web
git fetch upstream
git merge upstream/main
git push origin main
