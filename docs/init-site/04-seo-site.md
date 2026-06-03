# seo-geo-blog-writer skill
使用 seo-geo-blog-writer skill 帮我写图文：Write targeting 'best seedance 2.0 api : sdanceai.com'

# auto geo

配置：
# -----------------------------------------------------------------------------
# Blog source
# BLOG_DATA_SOURCE=cms keeps the built-in CMS. BLOG_DATA_SOURCE=geo reads
# published articles from GeoFlow without storing them locally.
# -----------------------------------------------------------------------------
BLOG_DATA_SOURCE=geo  # cms / geo
GEO_API_BASE=https://autogeoflow.com
GEO_API_TOKEN=gf_
GEO_FILE_CDN=https://r2.sdanceai.com

配置r2-image-proxy + 绑定域名 + 配置GEO_FILE_CDN:
```
export default {
  async fetch(request) {
    const url = new URL(request.url)

    const originUrl =
      "https://s3.autogeoflow.com" + url.pathname

    return fetch(originUrl, {
      cf: {
        cacheEverything: true,
        cacheTtl: 31536000,
      },
    })
  },
}
```

