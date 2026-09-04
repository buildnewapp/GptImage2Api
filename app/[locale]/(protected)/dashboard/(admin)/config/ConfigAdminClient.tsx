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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { PartnerSnippet } from "@/lib/partners/partner-snippets";
import { Pencil, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
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
  const [editingItem, setEditingItem] = useState<{
    index: number | null;
    item: PartnerSnippet;
  } | null>(null);
  const [isSavePending, startSaveTransition] = useTransition();
  const [isCachePending, startCacheTransition] = useTransition();

  function updateItem(index: number, patch: Partial<PartnerSnippet>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function addItem() {
    let nextIndex = items.length + 1;
    while (items.some((item) => item.key === `partner-${nextIndex}`)) {
      nextIndex += 1;
    }
    setEditingItem({ index: null, item: emptyItem(nextIndex) });
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
                  管理友链的排序和展示位置，修改后点击保存生效。
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addItem}
                  disabled={isSavePending}
                >
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
            <CardContent>
              <fieldset
                disabled={isSavePending}
                className="min-w-0 rounded-lg border"
              >
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-16 pl-4">序号</TableHead>
                      <TableHead>key</TableHead>
                      <TableHead className="min-w-52 text-center">预览</TableHead>
                      <TableHead className="w-28">sort</TableHead>
                      <TableHead className="w-20 text-center">启用</TableHead>
                      <TableHead className="w-20 text-center">首页</TableHead>
                      <TableHead className="w-20 text-center">伙伴</TableHead>
                      <TableHead className="w-20 text-center">编辑</TableHead>
                      <TableHead className="w-20 text-center">删除</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="h-32 text-center text-muted-foreground"
                        >
                          暂无友链配置。
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => (
                        <TableRow key={`${item.key}-${index}`}>
                          <TableCell className="pl-4 tabular-nums text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <span
                              className="block max-w-64 truncate font-medium"
                              title={item.key}
                            >
                              {item.key}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div
                              className="max-h-24 min-w-48 max-w-80 overflow-auto rounded-md border p-2 whitespace-normal [&_img]:max-w-full"
                              dangerouslySetInnerHTML={{ __html: item.html }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              aria-label={`${item.key} sort`}
                              type="number"
                              value={item.sort}
                              onChange={(event) =>
                                updateItem(index, {
                                  sort: Number(event.target.value) || 0,
                                })
                              }
                              className="h-8 w-24"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              aria-label={`${item.key} 启用`}
                              checked={item.enabled}
                              onCheckedChange={(enabled) =>
                                updateItem(index, { enabled })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              aria-label={`${item.key} 首页`}
                              checked={item.home}
                              onCheckedChange={(home) =>
                                updateItem(index, { home })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              aria-label={`${item.key} 伙伴`}
                              checked={item.partners}
                              onCheckedChange={(partners) =>
                                updateItem(index, { partners })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`编辑 ${item.key}`}
                              onClick={() =>
                                setEditingItem({ index, item: { ...item } })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              aria-label={`删除 ${item.key}`}
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </fieldset>
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

      <Dialog
        open={editingItem !== null}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.index === null ? "添加友链" : "编辑友链"}
            </DialogTitle>
            <DialogDescription>
              设置 key 和 HTML，确认后点击列表上方的保存生效。
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const item = {
                  ...editingItem.item,
                  key: editingItem.item.key.trim(),
                  html: editingItem.item.html.trim(),
                };
                if (!item.key || !item.html) {
                  toast.error("请填写 key 和 HTML");
                  return;
                }
                if (
                  items.some(
                    (existing, index) =>
                      index !== editingItem.index && existing.key === item.key,
                  )
                ) {
                  toast.error("key 已存在，请使用其他 key");
                  return;
                }
                if (editingItem.index === null) {
                  setItems((current) => [...current, item]);
                } else {
                  updateItem(editingItem.index, item);
                }
                setEditingItem(null);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="partner-key">key</Label>
                <Input
                  id="partner-key"
                  value={editingItem.item.key}
                  onChange={(event) =>
                    setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, key: event.target.value },
                    })
                  }
                  placeholder="product-hunt"
                  required
                  maxLength={80}
                  pattern={"[a-z0-9_\\-]+"}
                  title="仅支持小写字母、数字、下划线和连字符"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-html">HTML</Label>
                <Textarea
                  id="partner-html"
                  value={editingItem.item.html}
                  onChange={(event) =>
                    setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, html: event.target.value },
                    })
                  }
                  placeholder="<a ...>Partner</a>"
                  className="min-h-48 font-mono text-xs"
                  required
                  maxLength={5000}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    取消
                  </Button>
                </DialogClose>
                <Button type="submit">确认</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
