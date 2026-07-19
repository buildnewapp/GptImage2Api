"use client";

import { clearFrontendCacheAction } from "@/actions/cache/admin";
import { updateAdminPartnerSnippetsAction } from "@/actions/partners/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { PartnerSnippet } from "@/lib/partners/partner-snippets";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type ConfigAdminClientProps = {
  initialItems: PartnerSnippet[];
  initialError?: string | null;
};

const emptyItem = (index: number): PartnerSnippet => ({
  key: `partner-${index}`,
  html: "",
  sort: index * 10,
  home: true,
  partners: true,
  enabled: true,
});

function sortItems(items: PartnerSnippet[]) {
  return [...items].sort((a, b) => a.sort - b.sort || a.key.localeCompare(b.key));
}

export default function ConfigAdminClient({
  initialItems,
  initialError,
}: ConfigAdminClientProps) {
  const [items, setItems] = useState<PartnerSnippet[]>(sortItems(initialItems));
  const [isSavePending, startSaveTransition] = useTransition();
  const [isCachePending, startCacheTransition] = useTransition();

  const nextIndex = useMemo(() => items.length + 1, [items.length]);

  function updateItem(index: number, patch: Partial<PartnerSnippet>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function addItem() {
    setItems((current) => [...current, emptyItem(nextIndex)]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function saveItems() {
    startSaveTransition(async () => {
      const result = await updateAdminPartnerSnippetsAction(items);

      if (!result.success) {
        toast.error("保存失败", {
          description: result.error,
        });
        return;
      }

      setItems(sortItems(result.data ?? []));
      toast.success("友链配置已保存");
    });
  }

  function clearFrontendCache() {
    startCacheTransition(async () => {
      const result = await clearFrontendCacheAction();

      if (!result.success) {
        toast.error("缓存清理失败", {
          description: result.error,
        });
        return;
      }

      toast.success("前台缓存已清理");
    });
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">配置管理</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          管理站点运行时配置。保存后会刷新首页和伙伴页缓存。
        </p>
      </div>

      {initialError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {initialError}
        </div>
      ) : null}

      <Tabs defaultValue="partners" className="w-full">
        <TabsList>
          <TabsTrigger value="partners">友链管理</TabsTrigger>
          <TabsTrigger value="cache">缓存管理</TabsTrigger>
        </TabsList>
        <TabsContent value="partners" className="mt-4">
          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <CardTitle>友链管理</CardTitle>
                <CardDescription>
                  配置 partner snippets 的 HTML、排序和展示位置。
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加
                </Button>
                <Button
                  type="button"
                  onClick={saveItems}
                  disabled={isSavePending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSavePending ? "保存中" : "保存"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  暂无友链配置。
                </div>
              ) : (
                items.map((item, index) => (
                  <div
                    key={`${item.key}-${index}`}
                    className="rounded-lg border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="w-full space-y-2 sm:w-56">
                        <Label htmlFor={`partner-key-${index}`}>Key</Label>
                        <Input
                          id={`partner-key-${index}`}
                          value={item.key}
                          onChange={(event) =>
                            updateItem(index, { key: event.target.value })
                          }
                          placeholder="product-hunt"
                        />
                      </div>
                      <div className="w-28 space-y-2">
                        <Label htmlFor={`partner-sort-${index}`}>Sort</Label>
                        <Input
                          id={`partner-sort-${index}`}
                          type="number"
                          value={item.sort}
                          onChange={(event) =>
                            updateItem(index, {
                              sort: Number(event.target.value) || 0,
                            })
                          }
                        />
                      </div>

                      <label className="flex h-10 min-w-24 items-center justify-between gap-3 rounded-md border px-3 text-sm">
                        启用
                        <Switch
                          checked={item.enabled}
                          onCheckedChange={(enabled) =>
                            updateItem(index, { enabled })
                          }
                        />
                      </label>
                      <label className="flex h-10 min-w-24 items-center justify-between gap-3 rounded-md border px-3 text-sm">
                        首页
                        <Switch
                          checked={item.home}
                          onCheckedChange={(home) => updateItem(index, { home })}
                        />
                      </label>
                      <label className="flex h-10 min-w-28 items-center justify-between gap-3 rounded-md border px-3 text-sm">
                        伙伴页
                        <Switch
                          checked={item.partners}
                          onCheckedChange={(partners) =>
                            updateItem(index, { partners })
                          }
                        />
                      </label>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 text-destructive hover:text-destructive"
                        onClick={() => removeItem(index)}
                        aria-label="删除友链"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Label htmlFor={`partner-html-${index}`}>HTML</Label>
                      <Textarea
                        id={`partner-html-${index}`}
                        value={item.html}
                        onChange={(event) =>
                          updateItem(index, { html: event.target.value })
                        }
                        placeholder="<a ...>Partner</a>"
                        className="min-h-28 font-mono text-xs"
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="cache" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>缓存管理</CardTitle>
              <CardDescription>
                清理全部前台页面和公共数据缓存。下次访问时会重新生成页面并读取最新数据。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                onClick={clearFrontendCache}
                disabled={isCachePending}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isCachePending ? "animate-spin" : ""}`}
                />
                {isCachePending ? "清理中" : "清理全部前台缓存"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
