"use client";

import {
  createPromptGalleryItemAction,
  deletePromptGalleryItemsAction,
  getPromptGalleryAdminData,
  updatePromptGalleryItemsStatusAction,
  updatePromptGalleryItemAction,
} from "@/actions/prompts/admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PROMPT_GALLERY_STATUS_VALUES,
  stringifyPromptGalleryJson,
  toPromptGalleryDateTimeLocal,
  type PromptGalleryAdminData,
  type PromptGalleryItem,
  type PromptGalleryStatus,
} from "@/lib/prompt-gallery-shared";
import {
  ExternalLink,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function resolvePreviewUrl(src: string) {
  if (!src) {
    return "";
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "";
  return `${cdnUrl}${src}`;
}

type FormState = {
  id: number | null;
  language: string;
  categoriesText: string;
  model: string;
  sourceId: string;
  title: string;
  description: string;
  sourceLink: string;
  sourcePublishedAt: string;
  sourcePlatform: string;
  authorName: string;
  authorLink: string;
  coverUrl: string;
  inputImagesText: string;
  inputVideosText: string;
  inputAudiosText: string;
  resultsText: string;
  prompt: string;
  note: string;
  featured: boolean;
  sort: string;
  ups: string;
  downs: string;
  status: PromptGalleryStatus;
};

function createEmptyForm(): FormState {
  return {
    id: null,
    language: "en",
    categoriesText: "",
    model: "seedance 2.0",
    sourceId: "",
    title: "",
    description: "",
    sourceLink: "",
    sourcePublishedAt: "",
    sourcePlatform: "twitter",
    authorName: "",
    authorLink: "",
    coverUrl: "",
    inputImagesText: "[]",
    inputVideosText: "[]",
    inputAudiosText: "[]",
    resultsText: "[]",
    prompt: "",
    note: "",
    featured: false,
    sort: "0",
    ups: "0",
    downs: "0",
    status: "draft",
  };
}

function buildFormState(item: PromptGalleryItem): FormState {
  return {
    id: item.id,
    language: item.language,
    categoriesText: item.categories.join(", "),
    model: item.model,
    sourceId: item.sourceId?.toString() ?? "",
    title: item.title,
    description: item.description,
    sourceLink: item.sourceLink ?? "",
    sourcePublishedAt: toPromptGalleryDateTimeLocal(item.sourcePublishedAt),
    sourcePlatform: item.sourcePlatform ?? "",
    authorName: item.author?.name ?? "",
    authorLink: item.author?.link ?? "",
    coverUrl: item.coverUrl ?? "",
    inputImagesText: stringifyPromptGalleryJson(item.inputImages),
    inputVideosText: stringifyPromptGalleryJson(item.inputVideos),
    inputAudiosText: stringifyPromptGalleryJson(item.inputAudios),
    resultsText: stringifyPromptGalleryJson(item.results),
    prompt: item.prompt,
    note: item.note ?? "",
    featured: item.featured,
    sort: item.sort.toString(),
    ups: item.ups.toString(),
    downs: item.downs.toString(),
    status: item.status,
  };
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StatusBadge({ status }: { status: PromptGalleryStatus }) {
  const className =
    status === "online"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
      : status === "offline"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
        : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300";

  return (
    <Badge variant="outline" className={className}>
      {status}
    </Badge>
  );
}

function MediaPreview({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-14 w-20 items-center justify-center rounded-md border bg-muted/30 text-muted-foreground">
        <ImageIcon className="h-4 w-4" />
      </div>
    );
  }

  const previewUrl = resolvePreviewUrl(src);
  const isVideo = /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(previewUrl);

  return (
    <a
      href={previewUrl}
      target="_blank"
      rel="noreferrer"
      className="block h-14 w-20 overflow-hidden rounded-md border bg-muted/30 transition-opacity hover:opacity-80"
    >
      {isVideo ? (
        <video
          src={previewUrl}
          aria-label={alt}
          className="h-full w-full object-cover"
          muted
          playsInline
        />
      ) : (
        <img
          src={previewUrl}
          alt={alt}
          className="h-full w-full object-cover"
        />
      )}
    </a>
  );
}

type AdminFilters = {
  id: string;
  language: string;
  category: string;
  author: string;
  title: string;
  prompt: string;
  status: string;
};

const emptyFilters: AdminFilters = {
  id: "",
  language: "",
  category: "",
  author: "",
  title: "",
  prompt: "",
  status: "",
};

export default function PromptGalleryAdminClient({
  initialData,
  locale,
  pageSize,
}: {
  initialData: PromptGalleryAdminData;
  locale: string;
  pageSize: number;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<AdminFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<AdminFilters>(emptyFilters);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize,
  });
  const [adminData, setAdminData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchStatus, setBatchStatus] = useState<PromptGalleryStatus>("online");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(createEmptyForm());
  const [isPending, startTransition] = useTransition();

  const pageCount = Math.max(
    1,
    Math.ceil(adminData.count / pagination.pageSize),
  );
  const pageWindowStart = Math.min(
    Math.max(pagination.pageIndex - 2, 0),
    Math.max(pageCount - 5, 0),
  );
  const pageNumbers = Array.from(
    { length: Math.min(pageCount, 5) },
    (_, index) => pageWindowStart + index,
  );
  const currentPageIds = adminData.items.map((item) => item.id);
  const selectedCount = selectedIds.length;
  const isCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.includes(id));
  const isCurrentPagePartiallySelected =
    selectedIds.length > 0 && !isCurrentPageSelected;

  async function loadAdminData(
    nextPageIndex = pagination.pageIndex,
    nextFilters = appliedFilters,
  ) {
    const hasFilters = Object.values(nextFilters).some((value) => value.trim());
    const shouldUseInitialData =
      nextPageIndex === 0 && pagination.pageSize === pageSize && !hasFilters;

    if (shouldUseInitialData) {
      setAdminData(initialData);
      setSelectedIds([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await getPromptGalleryAdminData({
        pageIndex: nextPageIndex,
        pageSize: pagination.pageSize,
        id: nextFilters.id,
        language: nextFilters.language,
        category: nextFilters.category,
        author: nextFilters.author,
        title: nextFilters.title,
        prompt: nextFilters.prompt,
        status: nextFilters.status,
      });

      if (!result.success || !result.data) {
        toast.error("加载失败", {
          description: result.success ? "未返回数据" : result.error,
        });
        return;
      }

      setAdminData(result.data);
      setSelectedIds([]);
    } catch (error) {
      toast.error("加载失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, pageSize, pagination.pageIndex, pagination.pageSize]);

  function updateFilter(key: keyof AdminFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function submitSearch() {
    setAppliedFilters(filters);
    setPagination((current) => {
      if (current.pageIndex === 0) {
        loadAdminData(0, filters);
      }
      return {
        ...current,
        pageIndex: 0,
      };
    });
  }

  function toggleCurrentPageSelection(checked: boolean) {
    setSelectedIds(checked ? currentPageIds : []);
  }

  function toggleRowSelection(id: number, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? Array.from(new Set([...current, id]))
        : current.filter((selectedId) => selectedId !== id),
    );
  }

  function updateBatchStatus() {
    if (selectedIds.length === 0) {
      return;
    }

    startTransition(async () => {
      const result = await updatePromptGalleryItemsStatusAction({
        ids: selectedIds,
        status: batchStatus,
      });

      if (!result.success) {
        toast.error("批量更新失败", {
          description: result.error,
        });
        return;
      }

      toast.success(`已更新 ${result.data?.count ?? 0} 条记录`);
      await loadAdminData();
      router.refresh();
    });
  }

  function deleteSelectedItems() {
    if (selectedIds.length === 0) {
      return;
    }

    startTransition(async () => {
      const result = await deletePromptGalleryItemsAction({ ids: selectedIds });

      if (!result.success) {
        toast.error("批量删除失败", {
          description: result.error,
        });
        return;
      }

      toast.success(`已删除 ${result.data?.count ?? 0} 条记录`);
      await loadAdminData();
      router.refresh();
    });
  }

  function openCreateDialog() {
    setForm(createEmptyForm());
    setDialogOpen(true);
  }

  function openEditDialog(item: PromptGalleryItem) {
    setForm(buildFormState(item));
    setDialogOpen(true);
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function submitForm() {
    startTransition(async () => {
      const payload = {
        language: form.language.trim() || "en",
        categoriesText: form.categoriesText,
        model: form.model.trim(),
        sourceId: form.sourceId.trim() ? Number(form.sourceId) : null,
        title: form.title.trim(),
        description: form.description.trim(),
        sourceLink: form.sourceLink.trim(),
        sourcePublishedAt: form.sourcePublishedAt.trim(),
        sourcePlatform: form.sourcePlatform.trim(),
        authorName: form.authorName.trim(),
        authorLink: form.authorLink.trim(),
        coverUrl: form.coverUrl.trim(),
        inputImagesText: form.inputImagesText,
        inputVideosText: form.inputVideosText,
        inputAudiosText: form.inputAudiosText,
        resultsText: form.resultsText,
        prompt: form.prompt.trim(),
        note: form.note.trim(),
        featured: form.featured,
        sort: Number(form.sort || 0),
        ups: Number(form.ups || 0),
        downs: Number(form.downs || 0),
        status: form.status,
      };

      const result = form.id
        ? await updatePromptGalleryItemAction({
            id: form.id,
            ...payload,
          })
        : await createPromptGalleryItemAction(payload);

      if (!result.success) {
        toast.error("保存失败", {
          description: result.error,
        });
        return;
      }

      toast.success(form.id ? "Prompt 已更新" : "Prompt 已创建");
      setDialogOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          showCloseButton={true}
          className="!w-[min(80vw,1200px)] !max-w-none !p-0 flex max-h-[90vh] flex-col overflow-hidden"
        >
          <DialogHeader className="sticky top-0 z-10 border-b bg-background px-6 py-4">
            <DialogTitle>{form.id ? "编辑 Prompt" : "新建 Prompt"}</DialogTitle>
          </DialogHeader>

          <div className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">标题</label>
                  <Input
                    value={form.title}
                    onChange={(event) =>
                      updateForm("title", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">模型</label>
                  <Input
                    value={form.model}
                    onChange={(event) =>
                      updateForm("model", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">语言</label>
                  <Input
                    value={form.language}
                    onChange={(event) =>
                      updateForm("language", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    分类（逗号分隔）
                  </label>
                  <Input
                    value={form.categoriesText}
                    onChange={(event) =>
                      updateForm("categoriesText", event.target.value)
                    }
                    placeholder="poster, product, tech"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">来源平台</label>
                  <Input
                    value={form.sourcePlatform}
                    onChange={(event) =>
                      updateForm("sourcePlatform", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">来源 ID</label>
                  <Input
                    value={form.sourceId}
                    onChange={(event) =>
                      updateForm("sourceId", event.target.value)
                    }
                    placeholder="13460"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">作者名称</label>
                  <Input
                    value={form.authorName}
                    onChange={(event) =>
                      updateForm("authorName", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">作者链接</label>
                  <Input
                    value={form.authorLink}
                    onChange={(event) =>
                      updateForm("authorLink", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">描述</label>
                  <Textarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">来源链接</label>
                  <Input
                    value={form.sourceLink}
                    onChange={(event) =>
                      updateForm("sourceLink", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">发布时间</label>
                  <Input
                    type="datetime-local"
                    value={form.sourcePublishedAt}
                    onChange={(event) =>
                      updateForm("sourcePublishedAt", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">封面图</label>
                  <Input
                    value={form.coverUrl}
                    onChange={(event) =>
                      updateForm("coverUrl", event.target.value)
                    }
                  />
                  {form.coverUrl.trim() ? (
                    <div className="overflow-hidden rounded-xl border bg-muted/30">
                      <img
                        src={resolvePreviewUrl(form.coverUrl.trim())}
                        alt="cover preview"
                        className="max-h-64 w-full object-contain"
                      />
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center justify-between rounded-2xl border p-4">
                  <div>
                    <div className="text-sm font-medium">Featured</div>
                    <div className="text-sm text-muted-foreground">
                      开启后会在前台优先排序
                    </div>
                  </div>
                  <Switch
                    checked={form.featured}
                    onCheckedChange={(checked) =>
                      updateForm("featured", checked)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt</label>
                <Textarea
                  value={form.prompt}
                  onChange={(event) => updateForm("prompt", event.target.value)}
                  rows={16}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    输入图片（JSON 数组）
                  </label>
                  <Textarea
                    value={form.inputImagesText}
                    onChange={(event) =>
                      updateForm("inputImagesText", event.target.value)
                    }
                    rows={6}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    输入视频（JSON 数组）
                  </label>
                  <Textarea
                    value={form.inputVideosText}
                    onChange={(event) =>
                      updateForm("inputVideosText", event.target.value)
                    }
                    rows={6}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    输入音频（JSON 数组）
                  </label>
                  <Textarea
                    value={form.inputAudiosText}
                    onChange={(event) =>
                      updateForm("inputAudiosText", event.target.value)
                    }
                    rows={6}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    结果资源（JSON 数组）
                  </label>
                  <Textarea
                    value={form.resultsText}
                    onChange={(event) =>
                      updateForm("resultsText", event.target.value)
                    }
                    rows={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">备注</label>
                <Input
                  value={form.note}
                  onChange={(event) => updateForm("note", event.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">排序</label>
                  <Input
                    value={form.sort}
                    onChange={(event) => updateForm("sort", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">赞</label>
                  <Input
                    value={form.ups}
                    onChange={(event) => updateForm("ups", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">踩</label>
                  <Input
                    value={form.downs}
                    onChange={(event) =>
                      updateForm("downs", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">状态</label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      updateForm("status", value as PromptGalleryStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROMPT_GALLERY_STATUS_VALUES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t bg-background px-6 py-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={submitForm} disabled={isPending}>
              {isPending ? "保存中..." : "保存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Prompt Gallery 管理</h1>
          <p className="text-sm text-muted-foreground">
            后续人工在这里录入和维护 `/prompts` 展示内容。
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link
              href={locale === "en" ? "/prompts" : `/${locale}/prompts`}
              target="_blank"
            >
              查看前台
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            新建 Prompt
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Card className="gap-2 py-3">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总数
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-semibold">
            {adminData.summary.total}
          </CardContent>
        </Card>
        <Card className="gap-2 py-3">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Online
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-semibold">
            {adminData.summary.online}
          </CardContent>
        </Card>
        <Card className="gap-2 py-3">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-semibold">
            {adminData.summary.draft}
          </CardContent>
        </Card>
        <Card className="gap-2 py-3">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Offline
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-semibold">
            {adminData.summary.offline}
          </CardContent>
        </Card>
        <Card className="gap-2 py-3">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Featured
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 text-2xl font-semibold">
            {adminData.summary.featured}
          </CardContent>
        </Card>
      </div>

      <Card className="py-4">
        <CardContent className="space-y-4 px-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                ID
              </label>
              <Input
                value={filters.id}
                onChange={(event) => updateFilter("id", event.target.value)}
                placeholder="输入 ID"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                语言
              </label>
              <Input
                value={filters.language}
                onChange={(event) =>
                  updateFilter("language", event.target.value)
                }
                placeholder="如 en / zh"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                分类
              </label>
              <Input
                value={filters.category}
                onChange={(event) =>
                  updateFilter("category", event.target.value)
                }
                placeholder="输入分类"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                作者
              </label>
              <Input
                value={filters.author}
                onChange={(event) => updateFilter("author", event.target.value)}
                placeholder="输入作者"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                标题
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filters.title}
                  onChange={(event) =>
                    updateFilter("title", event.target.value)
                  }
                  placeholder="输入标题"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                提示词
              </label>
              <Input
                value={filters.prompt}
                onChange={(event) => updateFilter("prompt", event.target.value)}
                placeholder="输入提示词内容"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                状态
              </label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  updateFilter("status", value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {PROMPT_GALLERY_STATUS_VALUES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={submitSearch}
                disabled={isLoading}
                className="w-full"
              >
                <Search className="mr-2 h-4 w-4" />
                搜索
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-muted-foreground">
              已选择 {selectedCount} 条
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={batchStatus}
                onValueChange={(value) =>
                  setBatchStatus(value as PromptGalleryStatus)
                }
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROMPT_GALLERY_STATUS_VALUES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={updateBatchStatus}
                disabled={selectedCount === 0 || isPending || isLoading}
              >
                批量改状态
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={selectedCount === 0 || isPending || isLoading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    批量删除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除选中记录？</AlertDialogTitle>
                    <AlertDialogDescription>
                      将删除当前选中的 {selectedCount} 条 Prompt Gallery
                      记录。此操作不可撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteSelectedItems}>
                      确认删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="relative min-h-[320px] overflow-auto">
            {isLoading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        isCurrentPageSelected
                          ? true
                          : isCurrentPagePartiallySelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(checked) =>
                        toggleCurrentPageSelection(checked === true)
                      }
                      aria-label="选择当前页"
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>语言</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>作者</TableHead>
                  <TableHead>封面图</TableHead>
                  <TableHead>输出</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminData.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="h-24 text-center text-muted-foreground"
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  adminData.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={(checked) =>
                            toggleRowSelection(item.id, checked === true)
                          }
                          aria-label={`选择 ${item.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.id}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[260px] space-y-1">
                          <div className="truncate font-medium">
                            {item.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.featured ? "featured · " : ""}
                            {formatDate(item.updatedAt || item.createdAt)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.language}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {item.categories.length > 0 ? (
                            item.categories.map((category) => (
                              <Badge key={category} variant="secondary">
                                {category}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              -
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.author?.link ? (
                          <a
                            href={item.author.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-[180px] items-center gap-1 truncate text-sm font-medium text-primary hover:underline"
                          >
                            {item.author.name || item.author.link}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {item.author?.name || "-"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <MediaPreview
                          src={item.coverUrl}
                          alt={`${item.title} cover`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MediaPreview
                            src={item.results[0] ?? null}
                            alt={`${item.title} output`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {item.results.length}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              第 {pagination.pageIndex + 1} / {pageCount} 页，共{" "}
              {adminData.count} 条
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((current) => ({
                    ...current,
                    pageIndex: 0,
                  }))
                }
                disabled={pagination.pageIndex === 0 || isLoading}
              >
                首页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((current) => ({
                    ...current,
                    pageIndex: Math.max(0, current.pageIndex - 1),
                  }))
                }
                disabled={pagination.pageIndex === 0 || isLoading}
              >
                上一页
              </Button>
              {pageNumbers.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  variant={
                    pageNumber === pagination.pageIndex ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setPagination((current) => ({
                      ...current,
                      pageIndex: pageNumber,
                    }))
                  }
                  disabled={isLoading}
                  className="min-w-9"
                >
                  {pageNumber + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((current) => ({
                    ...current,
                    pageIndex: Math.min(pageCount - 1, current.pageIndex + 1),
                  }))
                }
                disabled={pagination.pageIndex >= pageCount - 1 || isLoading}
              >
                下一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((current) => ({
                    ...current,
                    pageIndex: pageCount - 1,
                  }))
                }
                disabled={pagination.pageIndex >= pageCount - 1 || isLoading}
              >
                尾页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
