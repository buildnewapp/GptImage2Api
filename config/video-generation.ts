/**
 * Video Generation Model Configuration
 *
 * 视频生成模型的积分消耗配置。
 * 在此修改每个模型的积分消耗量。
 */

// 每个模型生成一次消耗的积分
export const VIDEO_MODEL_CREDITS: Record<string, number> = {
  // ── Bytedance 系列 ──
  "bytedance/v1-lite-text-to-video": 10,
  "bytedance/v1-lite-image-to-video": 10,
  "bytedance/v1-pro-text-to-video": 20,
  "bytedance/v1-pro-image-to-video": 20,
  "bytedance/v1-pro-fast-image-to-video": 15,

  // ── Sora 系列 ──
  "sora-2-text-to-video": 30,
  "sora-2-image-to-video": 30,
  "sora-2-text-to-video-stable": 30,
  "sora-2-image-to-video-stable": 30,
  "sora-2-pro-text-to-video": 50,
  "sora-2-pro-image-to-video": 50,
  "sora-2-pro-storyboard": 60,
};

// 所有有效的模型名列表
export const VALID_MODELS = Object.keys(VIDEO_MODEL_CREDITS);

/**
 * 获取模型的积分消耗量。
 * @returns 积分数，如果模型不存在则返回 null
 */
export function getModelCredits(model: string): number | null {
  return VIDEO_MODEL_CREDITS[model] ?? null;
}
